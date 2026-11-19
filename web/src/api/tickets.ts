import type { CreateTicketRequest, Page, Priority, Status, Ticket, TicketDetail, Update, UpdateRequest } from '@/types'
import { api, jsonBody } from './client'

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

/**
 * 5. A technician's status change with note, location and photos, sent as multipart/form-data.
 * 201 = saved now, 200 = this clientUpdateId was saved before (a retry). Both are success.
 */
export function addUpdate(ticketId: number, data: UpdateRequest, photos: Blob[]): Promise<Update> {
  const form = new FormData()
  // Wrapped in a Blob with a JSON type, so the server reads the "data" part as JSON.
  form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  photos.forEach((photo, i) => form.append('photos', photo, `photo_${i + 1}.jpg`))
  // No Content-Type header here: the browser adds "multipart/form-data; boundary=..." itself.
  return api<Update>(`/api/tickets/${ticketId}/updates`, { method: 'POST', body: form })
}

/** 7. Supervisor creates a ticket. Returns the new ticket with its first history entry. */
export function createTicket(data: CreateTicketRequest): Promise<TicketDetail> {
  return api<TicketDetail>('/api/tickets', { method: 'POST', ...jsonBody(data) })
}

/** 8. Supervisor assigns or reassigns a ticket. The status becomes ASSIGNED. */
export function assignTicket(ticketId: number, technicianId: number): Promise<TicketDetail> {
  return api<TicketDetail>(`/api/tickets/${ticketId}/assign`, { method: 'PATCH', ...jsonBody({ technicianId }) })
}
