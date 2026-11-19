import type { Category, Priority, Status } from '@/types'

// Human-readable names for the API's enum values. One place, so every page says the same thing.

export const STATUS_LABEL: Record<Status, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  WIFI_DOWN: 'Wi-Fi down',
  FIBRE_CUT: 'Fibre cut',
  POWER: 'Power',
  EQUIPMENT: 'Equipment',
  OTHER: 'Other',
}

// The API sends times like "2026-10-14T09:20:00" (India time, no zone). The browser reads
// that as local time, which is right for users in India.
const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '—'
}

/** Google Maps directions to a point. Opens the Maps app on phones. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Google Maps pin at a point, for "where was this update made". */
export function pinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** The phone's local time as "2026-10-14T10:05:00", the zone-less format the backend expects. */
export function localDateTime(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  )
}
