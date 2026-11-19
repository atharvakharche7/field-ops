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
