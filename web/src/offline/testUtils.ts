import type { QueuedUpdate } from './queue'

let n = 0

/** A queued update with sensible defaults; pass only what a test cares about. */
export function makeItem(overrides: Partial<QueuedUpdate> = {}): QueuedUpdate {
  n++
  return {
    clientUpdateId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    userId: 2,
    ticketId: 7,
    ticketNo: 'FO-1007',
    ticketTitle: 'Access point reboot loop',
    fromStatus: 'ASSIGNED',
    toStatus: 'IN_PROGRESS',
    note: `note ${n}`,
    deviceTime: '2026-11-20T10:00:00',
    photos: [],
    queuedAt: n,
    attempts: 0,
    ...overrides,
  }
}
