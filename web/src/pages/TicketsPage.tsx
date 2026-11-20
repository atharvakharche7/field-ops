import { getTickets } from '@/api/tickets'
import { useAuth } from '@/auth/AuthContext'
import { EmptyState } from '@/components/EmptyState'
import { PriorityBadge } from '@/components/PriorityBadge'
import { StaleNotice } from '@/components/StaleNotice'
import { canShowSaved } from '@/lib/errors'
import { ErrorState } from '@/components/ErrorState'
import { TicketCard } from '@/components/TicketCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/format'
import { effectiveStatus } from '@/lib/status'
import { useQueue } from '@/offline/useSync'
import type { Priority, Status } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { RefreshCw, X } from 'lucide-react'
import { useSearchParams } from 'react-router'

const ALL = 'ALL'
const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

/**
 * Technicians see their own tickets; supervisors see everyone's. The page asks for the
 * same endpoint either way, and the server decides what each user may see.
 */
export function TicketsPage() {
  const { user } = useAuth()
  const isSupervisor = user?.role === 'SUPERVISOR'

  // Only supervisors have unassigned (OPEN) tickets to look at.
  const statuses: Status[] = isSupervisor
    ? ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
    : ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED']

  // The filters live in the URL (?status=IN_PROGRESS&priority=CRITICAL), so Back from a ticket keeps them
  // and the dashboard cards can link straight to a filtered list.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status') as Status | null
  const status = statusParam && statuses.includes(statusParam) ? statusParam : undefined
  const priorityParam = searchParams.get('priority') as Priority | null
  const priority = priorityParam && PRIORITIES.includes(priorityParam) ? priorityParam : undefined

  // Change one filter and keep the other.
  function setFilter(key: 'status' | 'priority', value: string | undefined) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const { data, error, isPending, isPaused, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['tickets', { status, priority }],
    queryFn: () => getTickets({ status, priority }),
  })
  // Updates saved offline and not sent yet, so their cards can say "Pending sync".
  const { pending } = useQueue(user?.id)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isSupervisor ? 'All tickets' : 'My tickets'}</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.totalElements} ticket${data.totalElements === 1 ? '' : 's'}` : ' '}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-4"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh tickets"
        >
          <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <Tabs
        value={status ?? ALL}
        onValueChange={value => setFilter('status', value === ALL ? undefined : value)}
      >
        {/* Scrolls sideways on narrow phones instead of squashing the labels */}
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none] group-data-horizontal/tabs:h-11">
          <TabsTrigger value={ALL} className="flex-none px-3">
            All
          </TabsTrigger>
          {statuses.map(s => (
            <TabsTrigger key={s} value={s} className="flex-none px-3">
              {STATUS_LABEL[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {priority && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing only</span>
          <PriorityBadge priority={priority} />
          <Button variant="ghost" className="h-9 px-2 text-muted-foreground" onClick={() => setFilter('priority', undefined)}>
            <X aria-hidden /> Clear
          </Button>
        </div>
      )}

      {/* Saved data first: offline, the list from the last visit is still useful */}
      {data && canShowSaved(data, error) && (error || isPaused) && <StaleNotice updatedAt={dataUpdatedAt} />}
      {data && canShowSaved(data, error) ? null : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPaused ? (
        // Offline, and this filter was never loaded on this device.
        <ErrorState error={new TypeError('offline')} onRetry={() => refetch()} />
      ) : (
        isPending && <TicketListSkeleton />
      )}
      {!data || !canShowSaved(data, error) ? null : data.content.length === 0 ? (
        <EmptyState
          title={
            status || priority
              ? `No ${[priority && PRIORITY_LABEL[priority], status && STATUS_LABEL[status]].filter(Boolean).join(' ').toLowerCase()} tickets`
              : 'No tickets yet'
          }
          description={
            status || priority ? 'Try another filter.' : isSupervisor ? 'Created tickets will show up here.' : 'Tickets assigned to you will show up here.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.content.map(ticket => (
            <li key={ticket.id}>
              <TicketCard
                ticket={ticket}
                showAssignee={isSupervisor}
                pendingStatus={pendingStatusFor(ticket.id, ticket.status)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  function pendingStatusFor(ticketId: number, serverStatus: Status): Status | undefined {
    const waiting = pending.filter(p => p.ticketId === ticketId)
    return waiting.length ? effectiveStatus(serverStatus, waiting) : undefined
  }
}

function TicketListSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-label="Loading tickets">
      {[0, 1, 2].map(i => (
        <li key={i} className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
