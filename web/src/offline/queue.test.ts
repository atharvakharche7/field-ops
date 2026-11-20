import 'fake-indexeddb/auto' // a stand-in for the browser's IndexedDB, so this runs in Node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as queue from './queue'
import { makeItem } from './testUtils'

beforeEach(() => queue._resetForTests())

describe('queue', () => {
  it('starts empty', async () => {
    expect(await queue.getAll()).toEqual([])
    expect(await queue.count()).toBe(0)
  })

  it('reads items back oldest first, in the order they were added', async () => {
    const a = makeItem({ note: 'first' })
    const b = makeItem({ note: 'second' })
    const c = makeItem({ note: 'third' })
    await queue.add(a)
    await queue.add(b)
    await queue.add(c)
    expect((await queue.getAll()).map(i => i.note)).toEqual(['first', 'second', 'third'])
    expect(await queue.count()).toBe(3)
  })

  it('keeps the photos themselves, not just a reference', async () => {
    const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' })
    await queue.add(makeItem({ photos: [photo] }))
    const [saved] = await queue.getAll()
    expect(saved.photos).toHaveLength(1)
    expect(saved.photos[0].type).toBe('image/jpeg')
    expect(new Uint8Array(await saved.photos[0].arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))
  })

  it('ignores the same clientUpdateId added twice (a double-tapped Save)', async () => {
    const a = makeItem()
    await queue.add(a)
    await queue.add({ ...a })
    expect(await queue.count()).toBe(1)
  })

  it('removes one item and keeps the rest in order', async () => {
    const [a, b, c] = [makeItem(), makeItem(), makeItem()]
    for (const i of [a, b, c]) await queue.add(i)
    await queue.remove(b.clientUpdateId)
    expect((await queue.getAll()).map(i => i.clientUpdateId)).toEqual([a.clientUpdateId, c.clientUpdateId])
  })

  it('counts and lists only the given user', async () => {
    await queue.add(makeItem({ userId: 2 }))
    await queue.add(makeItem({ userId: 3 }))
    await queue.add(makeItem({ userId: 2 }))
    expect(await queue.count(2)).toBe(2)
    expect(await queue.count(3)).toBe(1)
  })

  it('records failed attempts', async () => {
    const a = makeItem()
    await queue.add(a)
    await queue.markAttempt(a.clientUpdateId, 'No connection')
    await queue.markAttempt(a.clientUpdateId, 'No connection')
    const [saved] = await queue.getAll()
    expect(saved.attempts).toBe(2)
    expect(saved.lastError).toBe('No connection')
  })

  it('moves a rejected item to the failed list with the reason', async () => {
    const a = makeItem()
    await queue.add(a)
    await queue.moveToFailed(a.clientUpdateId, 'This ticket is not assigned to you')
    expect(await queue.count()).toBe(0)
    const [failed] = await queue.getFailed()
    expect(failed.clientUpdateId).toBe(a.clientUpdateId)
    expect(failed.reason).toBe('This ticket is not assigned to you')
  })

  it('puts a failed item back in the queue on "Try again"', async () => {
    const a = makeItem({ attempts: 3 })
    await queue.add(a)
    await queue.moveToFailed(a.clientUpdateId, 'Rejected')
    await queue.retryFailed(a.clientUpdateId)
    expect(await queue.getFailed()).toEqual([])
    const [back] = await queue.getAll()
    expect(back.clientUpdateId).toBe(a.clientUpdateId) // same id, so the server still spots a repeat
    expect(back.attempts).toBe(0)
    expect(back).not.toHaveProperty('reason')
  })

  it("clears only the logged-out user's queued and failed items", async () => {
    const mine = makeItem({ userId: 2 })
    const myFailed = makeItem({ userId: 2 })
    const theirs = makeItem({ userId: 3 })
    for (const i of [mine, myFailed, theirs]) await queue.add(i)
    await queue.moveToFailed(myFailed.clientUpdateId, 'Rejected')
    await queue.clearForUser(2)
    expect((await queue.getAll()).map(i => i.userId)).toEqual([3])
    expect(await queue.getFailed()).toEqual([])
  })

  it('tells subscribers when something changes', async () => {
    const listener = vi.fn()
    const unsubscribe = queue.subscribe(listener)
    await queue.add(makeItem())
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    await queue.add(makeItem())
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
