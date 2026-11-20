import { ApiError, isTemporaryError } from '@/api/client'
import { addUpdate } from '@/api/tickets'
import { errorMessage } from '@/lib/errors'
import { queryClient } from '@/lib/queryClient'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import * as queue from './queue'
import type { FailedUpdate, QueuedUpdate } from './queue'

/**
 * Sends the offline queue to the server.
 *
 * Rules, for each item, oldest first (so two updates to the same ticket arrive in order):
 *   200 / 201              → sent: remove it from the queue
 *   no connection, 502-504 → stop; keep this one and everything after it for next time
 *   401 (login expired)    → stop; keep everything (the app shows the login page, and
 *                            the queue syncs after logging back in)
 *   anything else (400, 403, 404, 500...) → the server said no, and repeating won't help:
 *                            move it to the failed list, show it on Profile, carry on
 */

export interface SyncResult {
  sent: number
  failed: number
  stopped?: 'temporary' | 'unauthorized'
}

export type Sender = (item: QueuedUpdate) => Promise<unknown>

/** The real sender: the same endpoint and the same clientUpdateId as the first try. */
export const sendQueued: Sender = item =>
  addUpdate(
    item.ticketId,
    {
      clientUpdateId: item.clientUpdateId,
      toStatus: item.toStatus,
      note: item.note,
      latitude: item.latitude,
      longitude: item.longitude,
      deviceTime: item.deviceTime,
    },
    item.photos,
  )

// Only one sync at a time. If one is running, callers get that same run instead of starting
// a second one that would send the same items again.
let running: Promise<SyncResult> | null = null
const syncingListeners = new Set<() => void>()
const notifySyncing = () => syncingListeners.forEach(l => l())

/** Sends one user's queued updates. `send` can be swapped for a fake in tests. */
export function flushQueue(userId: number, send: Sender = sendQueued): Promise<SyncResult> {
  if (running) return running
  running = (async (): Promise<SyncResult> => {
    let sent = 0
    let failed = 0
    // Always take the first item still in the queue. That way an update queued while the
    // sync is running is picked up too, and nothing is ever sent twice in one run.
    for (;;) {
      const [item] = await queue.getAll(userId)
      if (!item) return { sent, failed }
      try {
        await send(item)
        await queue.remove(item.clientUpdateId)
        sent++
      } catch (err) {
        if (isTemporaryError(err)) {
          await queue.markAttempt(item.clientUpdateId, errorMessage(err))
          return { sent, failed, stopped: 'temporary' }
        }
        if (err instanceof ApiError && err.status === 401) {
          return { sent, failed, stopped: 'unauthorized' }
        }
        await queue.moveToFailed(item.clientUpdateId, err instanceof Error ? err.message : 'Rejected by the server')
        failed++
      }
    }
  })().finally(() => {
    running = null
    notifySyncing()
  })
  notifySyncing()
  return running
}

/** Sync, then refresh what's on screen and tell the user what happened. */
export async function syncAndRefresh(userId: number, { quiet = false } = {}): Promise<SyncResult> {
  const result = await flushQueue(userId)
  if (result.sent || result.failed) {
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['ticket'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  if (result.sent) toast.success(`${result.sent} offline update${result.sent === 1 ? '' : 's'} synced`)
  if (result.failed) {
    toast.error(`${result.failed} update${result.failed === 1 ? " wasn't" : "s weren't"} accepted by the server`, {
      description: 'See Profile for the reason.',
    })
  }
  if (!quiet && !result.sent && !result.failed && result.stopped === 'temporary') {
    toast.warning("Still can't reach the server. Your updates are safe and will sync later.")
  }
  return result
}

/**
 * Runs the sync at the right moments. Mounted once, in AppLayout:
 * - when the app opens with a logged-in user
 * - when the browser says the connection is back ("online" event)
 * - when the tab becomes visible again (switching back to FieldOps)
 * - every 30 s while something is waiting: a sleeping backend (502/503) fires no "online" event
 */
export function useSync(userId: number | undefined) {
  useEffect(() => {
    if (userId === undefined) return
    const run = () => void syncAndRefresh(userId, { quiet: true })
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    const timer = setInterval(async () => {
      if (document.visibilityState === 'visible' && navigator.onLine && (await queue.count(userId)) > 0) run()
    }, 30_000)

    run()
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])
}

/** True while a sync is sending updates. */
export function useIsSyncing(): boolean {
  return useSyncExternalStore(
    listener => {
      syncingListeners.add(listener)
      return () => syncingListeners.delete(listener)
    },
    () => running !== null,
  )
}

/** The browser's own idea of whether it's online. A hint only: Wi-Fi with no internet still says "online". */
export function useOnline(): boolean {
  return useSyncExternalStore(
    listener => {
      window.addEventListener('online', listener)
      window.addEventListener('offline', listener)
      return () => {
        window.removeEventListener('online', listener)
        window.removeEventListener('offline', listener)
      }
    },
    () => navigator.onLine,
  )
}

/** This user's waiting and failed updates, kept up to date as the queue changes. */
export function useQueue(userId: number | undefined): { pending: QueuedUpdate[]; failed: FailedUpdate[] } {
  const [state, setState] = useState<{ pending: QueuedUpdate[]; failed: FailedUpdate[] }>({ pending: [], failed: [] })
  useEffect(() => {
    if (userId === undefined) return
    let cancelled = false
    const load = () =>
      Promise.all([queue.getAll(userId), queue.getFailed(userId)]).then(([pending, failed]) => {
        if (!cancelled) setState({ pending, failed })
      })
    load()
    const unsubscribe = queue.subscribe(load)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [userId])
  return state
}
