import type { Status } from '@/types'

/**
 * Which statuses a technician may move a ticket to next.
 * A copy of the backend's Status.canMoveTo, so the Update page only offers valid choices:
 *   ASSIGNED    → IN_PROGRESS or RESOLVED (RESOLVED straight away is fine for quick fixes)
 *   IN_PROGRESS → RESOLVED
 *   OPEN, RESOLVED → nothing (OPEN isn't assigned to anyone yet; RESOLVED is finished)
 * The server still checks every update, because an offline update can arrive late.
 */
export function allowedNextStatuses(current: Status): Status[] {
  switch (current) {
    case 'ASSIGNED':
      return ['IN_PROGRESS', 'RESOLVED']
    case 'IN_PROGRESS':
      return ['RESOLVED']
    case 'OPEN':
    case 'RESOLVED':
      return []
  }
}

/**
 * The status a ticket will have once its waiting offline updates sync: the last one's
 * toStatus, or the server's status if nothing is waiting. Pages show this, so a technician
 * who saved "In progress" offline can go on to "Resolved" before anything has synced.
 */
export function effectiveStatus(serverStatus: Status, pendingForTicket: { toStatus: Status }[]): Status {
  return pendingForTicket.length ? pendingForTicket[pendingForTicket.length - 1].toStatus : serverStatus
}
