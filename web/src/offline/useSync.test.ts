import 'fake-indexeddb/auto'
import { ApiError } from '@/api/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as queue from './queue'
import { makeItem } from './testUtils'
import { flushQueue, type Sender } from './useSync'

beforeEach(() => queue._resetForTests())

// The real sender calls the API. These fakes answer like the server would, without a network.
const ok: Sender = async () => ({})
const offline = () => new TypeError('Failed to fetch') // what fetch() throws with no connection
const reject = (status: number, message: string) => new ApiError(status, message)

async function addAll(...items: ReturnType<typeof makeItem>[]) {
  for (const item of items) await queue.add(item)
}

describe('flushQueue', () => {
  it('sends everything oldest first and empties the queue on 200/201', async () => {
    const [a, b, c] = [makeItem(), makeItem(), makeItem()]
    await addAll(a, b, c)
    const send = vi.fn(ok)
    const result = await flushQueue(2, send)
    expect(send.mock.calls.map(([item]) => item.clientUpdateId)).toEqual([a, b, c].map(i => i.clientUpdateId))
    expect(result).toEqual({ sent: 3, failed: 0 })
    expect(await queue.count()).toBe(0)
  })

  it('stops at a network error and keeps that item and everything after it', async () => {
    const [a, b, c] = [makeItem(), makeItem(), makeItem()]
    await addAll(a, b, c)
    const send = vi.fn<Sender>().mockResolvedValueOnce({}).mockRejectedValueOnce(offline())
    const result = await flushQueue(2, send)
    expect(result).toEqual({ sent: 1, failed: 0, stopped: 'temporary' })
    expect(send).toHaveBeenCalledTimes(2) // c was never tried
    const left = await queue.getAll()
    expect(left.map(i => i.clientUpdateId)).toEqual([b.clientUpdateId, c.clientUpdateId])
    expect(left[0].attempts).toBe(1)
  })

  it('treats 502, 503 and 504 (proxy cannot reach a sleeping backend) like no connection', async () => {
    for (const status of [502, 503, 504]) {
      await queue._resetForTests()
      await addAll(makeItem())
      const result = await flushQueue(2, async () => {
        throw reject(status, 'Bad Gateway')
      })
      expect(result.stopped).toBe('temporary')
      expect(await queue.count()).toBe(1)
      expect(await queue.getFailed()).toEqual([])
    }
  })

  it.each([400, 403, 404])('moves a %i to the failed list and carries on with the next item', async status => {
    const [a, b] = [makeItem(), makeItem()]
    await addAll(a, b)
    const send = vi.fn<Sender>().mockRejectedValueOnce(reject(status, 'This ticket is not assigned to you')).mockResolvedValueOnce({})
    const result = await flushQueue(2, send)
    expect(result).toEqual({ sent: 1, failed: 1 })
    expect(await queue.count()).toBe(0)
    const [failed] = await queue.getFailed()
    expect(failed.clientUpdateId).toBe(a.clientUpdateId)
    expect(failed.reason).toBe('This ticket is not assigned to you')
  })

  it('stops on 401 (login expired) and keeps the whole queue for after login', async () => {
    const [a, b] = [makeItem(), makeItem()]
    await addAll(a, b)
    const result = await flushQueue(2, async () => {
      throw reject(401, 'Unauthorized')
    })
    expect(result).toEqual({ sent: 0, failed: 0, stopped: 'unauthorized' })
    expect(await queue.count()).toBe(2)
    expect(await queue.getFailed()).toEqual([])
  })

  it("only sends the logged-in user's items", async () => {
    await addAll(makeItem({ userId: 2 }), makeItem({ userId: 3 }))
    const send = vi.fn(ok)
    await flushQueue(2, send)
    expect(send).toHaveBeenCalledTimes(1)
    expect((await queue.getAll()).map(i => i.userId)).toEqual([3])
  })

  it('runs only one sync at a time, so nothing is sent twice', async () => {
    await addAll(makeItem(), makeItem())
    const send = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 10))
      return {}
    })
    const [first, second] = await Promise.all([flushQueue(2, send), flushQueue(2, send)])
    expect(send).toHaveBeenCalledTimes(2) // two items, each sent once
    expect(second).toBe(first) // the second call joined the first run
  })

  it('also sends an item queued while the sync is running', async () => {
    const late = makeItem({ note: 'late' })
    await addAll(makeItem())
    const send = vi.fn<Sender>(async item => {
      if (item.note !== 'late' && (await queue.count()) === 1) await queue.add(late)
      return {}
    })
    const result = await flushQueue(2, send)
    expect(result.sent).toBe(2)
    expect(await queue.count()).toBe(0)
  })
})
