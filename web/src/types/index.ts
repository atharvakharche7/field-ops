// Shapes of the JSON the Spring Boot API sends back. They mirror the Java DTOs in backend/.../dto/response.

export type Role = 'TECHNICIAN' | 'SUPERVISOR'
export type Status = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Category = 'WIFI_DOWN' | 'FIBRE_CUT' | 'POWER' | 'EQUIPMENT' | 'OTHER'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** One card in the ticket list (GET /api/tickets). */
export interface Ticket {
  id: number
  ticketNo: string
  title: string
  priority: Priority
  status: Status
  category: Category
  siteName: string
  city: string
  assignedToName: string | null
  updatedAt: string // ISO date-time, for example "2026-10-14T09:20:00"
}

export interface Site {
  id: number
  code: string
  name: string
  city: string
  latitude: number
  longitude: number
}

export interface Person {
  id: number
  name: string
}

export interface Attachment {
  id: number
  url: string // "/api/attachments/12"; the browser sends the login cookie with it automatically
  contentType: string
}

export interface Update {
  id: number
  clientUpdateId: string
  fromStatus: Status
  toStatus: Status
  note: string | null
  latitude: number | null
  longitude: number | null
  updatedByName: string
  deviceTime: string
  createdAt: string
  attachments: Attachment[]
}

/** Full ticket with its history (GET /api/tickets/{id}). */
export interface TicketDetail {
  id: number
  ticketNo: string
  title: string
  description: string | null
  priority: Priority
  status: Status
  category: Category
  site: Site
  assignedTo: Person | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  updates: Update[]
}

/** The "data" part of POST /api/tickets/{id}/updates. Photos travel as separate file parts. */
export interface UpdateRequest {
  clientUpdateId: string // new UUID per Save; the same id on a retry means "same update"
  toStatus: Status
  note: string
  latitude?: number
  longitude?: number
  deviceTime: string // phone's local time without a zone, e.g. "2026-10-14T10:05:00"
}

/** Body of POST /api/tickets. Without assignedToId the ticket starts OPEN. */
export interface CreateTicketRequest {
  title: string
  description?: string
  category: Category
  priority: Priority
  siteId: number
  assignedToId?: number
}

/** GET /api/dashboard/summary. Every status and priority is always present, 0 if none. */
export interface DashboardSummary {
  byStatus: Record<Status, number>
  byPriority: Record<Priority, number>
  resolvedToday: number
  openCritical: number
  technicians: { id: number; name: string; activeTickets: number }[]
}
