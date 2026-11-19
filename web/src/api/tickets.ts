import type { Page, Priority, Status, Ticket, TicketDetail } from '@/types'
import { api } from './client'

export interface TicketFilters {
  status?: Status
  priority?: Priority
}

/** 3. Technicians get only their own tickets, supervisors get all. The server decides, not the page. */
export function getTickets(filters: TicketFilters = {}): Promise<Page<Ticket>> {
  const params = new URLSearchParams({ page: '0', size: '50' })
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  return api<Page<Ticket>>(`/api/tickets?${params}`)
}

/** 4. One ticket with its site and full update history. 403 if it isn't yours, 404 if it doesn't exist. */
export function getTicket(id: number): Promise<TicketDetail> {
  return api<TicketDetail>(`/api/tickets/${id}`)
}
