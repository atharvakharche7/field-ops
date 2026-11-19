import { CATEGORY_LABEL, formatDateTime } from '@/lib/format'
import type { Ticket } from '@/types'
import { ChevronRight, MapPin, User } from 'lucide-react'
import { Link } from 'react-router'
import { PriorityBadge } from './PriorityBadge'
import { StatusChip } from './StatusChip'

/** One ticket in a list. The whole card is a link, so it's an easy tap target on a phone. */
export function TicketCard({ ticket, showAssignee }: { ticket: Ticket; showAssignee: boolean }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNo}</span>
          <PriorityBadge priority={ticket.priority} />
          <span className="truncate text-xs text-muted-foreground">{CATEGORY_LABEL[ticket.category]}</span>
        </div>
        <p className="leading-snug font-medium">{ticket.title}</p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {ticket.siteName}, {ticket.city}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusChip status={ticket.status} />
          {showAssignee && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3.5" aria-hidden />
              {ticket.assignedToName ?? 'Unassigned'}
            </span>
          )}
          <span className="text-xs text-muted-foreground">Updated {formatDateTime(ticket.updatedAt)}</span>
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
