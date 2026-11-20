import { formatDateTime } from '@/lib/format'
import { CloudOff } from 'lucide-react'

/** A quiet line above saved data, so nobody mistakes it for live data. */
export function StaleNotice({ updatedAt }: { updatedAt: number }) {
  return (
    <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
      <CloudOff className="size-4 shrink-0" aria-hidden />
      Can't reach the server. Showing what was saved on this device at {formatDateTime(new Date(updatedAt).toISOString())}.
    </p>
  )
}
