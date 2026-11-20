import type { Status } from '@/types'
import { get, set, update } from 'idb-keyval'

/**
 * The offline queue: updates saved while there was no connection, waiting to be sent.
 *
 * Stored in IndexedDB (the browser's built-in database) through idb-keyval, a tiny wrapper
 * that makes it work like a key → value map. IndexedDB survives closing the tab and
 * restarting the phone, and it can store the photos themselves (Blobs), not just links
 * to them, so nothing disappears before it syncs.
 *
 * Two lists:
 *   fieldops.queue  - waiting to be sent, oldest first
 *   fieldops.failed - the server said no (for example, the ticket was reassigned).
 *                     Kept so the user can see what didn't go through.
 */

export interface QueuedUpdate {
  clientUpdateId: string // made when Save was tapped; the server uses it to ignore repeats
  userId: number // whose update this is, so one person's updates are never sent with another's login
  ticketId: number
  ticketNo: string // for showing the item on the Profile page without the network
  ticketTitle: string
  fromStatus: Status
  toStatus: Status
  note: string
  latitude?: number
  longitude?: number
  deviceTime: string // when the work was done, on the phone's clock
  photos: Blob[] // resized JPEGs
  queuedAt: number // Date.now() when it was queued
  attempts: number // how many sync attempts have failed so far
  lastError?: string
}

export interface FailedUpdate extends QueuedUpdate {
  reason: string // the server's message, e.g. "This ticket is not assigned to you"
  failedAt: number
}

const QUEUE_KEY = 'fieldops.queue'
const FAILED_KEY = 'fieldops.failed'

// --- Change notifications -------------------------------------------------------------
// IndexedDB doesn't tell the page when it changes, so every write here calls notify().
// The banner, Profile page and ticket pages subscribe and re-read the lists.
const listeners = new Set<() => void>()

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach(listener => listener())
}

// --- The queue -------------------------------------------------------------------------

/** Adds an update to the end of the queue. The same clientUpdateId is never added twice. */
export async function add(item: QueuedUpdate): Promise<void> {
  // update() reads, changes and writes in one transaction, so two quick saves can't overwrite each other.
  await update<QueuedUpdate[]>(QUEUE_KEY, (list = []) =>
    list.some(q => q.clientUpdateId === item.clientUpdateId) ? list : [...list, item],
  )
  notify()
}

/** Everything waiting, oldest first. Pass a user id to get only that person's updates. */
export async function getAll(userId?: number): Promise<QueuedUpdate[]> {
  const list = (await get<QueuedUpdate[]>(QUEUE_KEY)) ?? []
  return userId === undefined ? list : list.filter(q => q.userId === userId)
}

export async function count(userId?: number): Promise<number> {
  return (await getAll(userId)).length
}

export async function remove(clientUpdateId: string): Promise<void> {
  await update<QueuedUpdate[]>(QUEUE_KEY, (list = []) => list.filter(q => q.clientUpdateId !== clientUpdateId))
  notify()
}

/** Records a failed attempt that will be retried later (no connection, server asleep). */
export async function markAttempt(clientUpdateId: string, error: string): Promise<void> {
  await update<QueuedUpdate[]>(QUEUE_KEY, (list = []) =>
    list.map(q => (q.clientUpdateId === clientUpdateId ? { ...q, attempts: q.attempts + 1, lastError: error } : q)),
  )
  notify()
}

// --- The failed list -------------------------------------------------------------------

export async function getFailed(userId?: number): Promise<FailedUpdate[]> {
  const list = (await get<FailedUpdate[]>(FAILED_KEY)) ?? []
  return userId === undefined ? list : list.filter(f => f.userId === userId)
}

/** The server rejected this update: take it out of the queue and keep it in the failed list. */
export async function moveToFailed(clientUpdateId: string, reason: string): Promise<void> {
  const item = (await getAll()).find(q => q.clientUpdateId === clientUpdateId)
  if (!item) return
  await update<FailedUpdate[]>(FAILED_KEY, (list = []) => [...list, { ...item, reason, failedAt: Date.now() }])
  await remove(clientUpdateId) // calls notify()
}

/** The user dismissed a failed update. */
export async function dismissFailed(clientUpdateId: string): Promise<void> {
  await update<FailedUpdate[]>(FAILED_KEY, (list = []) => list.filter(f => f.clientUpdateId !== clientUpdateId))
  notify()
}

/** "Try again" on a failed update: back into the queue, with its original id and time. */
export async function retryFailed(clientUpdateId: string): Promise<void> {
  const failed = (await getFailed()).find(f => f.clientUpdateId === clientUpdateId)
  if (!failed) return
  const { reason: _reason, failedAt: _failedAt, ...item } = failed
  await update<FailedUpdate[]>(FAILED_KEY, (list = []) => list.filter(f => f.clientUpdateId !== clientUpdateId))
  await add({ ...item, attempts: 0, lastError: undefined }) // calls notify()
}

/** On logout: delete this user's queued and failed updates, so they're never sent under someone else's login. */
export async function clearForUser(userId: number): Promise<void> {
  await update<QueuedUpdate[]>(QUEUE_KEY, (list = []) => list.filter(q => q.userId !== userId))
  await update<FailedUpdate[]>(FAILED_KEY, (list = []) => list.filter(f => f.userId !== userId))
  notify()
}

/** Only for tests. */
export async function _resetForTests(): Promise<void> {
  await set(QUEUE_KEY, [])
  await set(FAILED_KEY, [])
}
