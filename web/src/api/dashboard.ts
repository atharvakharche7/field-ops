import type { DashboardSummary, Site, User } from '@/types'
import { api } from './client'

/** 9. Counts for the supervisor dashboard. */
export function getSummary(): Promise<DashboardSummary> {
  return api<DashboardSummary>('/api/dashboard/summary')
}

/** 10. Technicians for the "Assign to" pickers. */
export function getTechnicians(): Promise<User[]> {
  return api<User[]>('/api/users?role=TECHNICIAN')
}

/** 10. Sites for the Create Ticket form. */
export function getSites(): Promise<Site[]> {
  return api<Site[]>('/api/sites')
}
