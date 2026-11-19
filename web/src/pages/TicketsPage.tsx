import { getTickets } from '@/api/tickets'
import { useAuth } from '@/auth/AuthContext'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { TicketCard } from '@/components/TicketCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STATUS_LABEL } from '@/lib/format'
import type { Status } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router'

const ALL = 'ALL'

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

  // The filter lives in the URL (?status=IN_PROGRESS), so Back from a ticket keeps it.
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get('status') as Status | null
  const status = param && statuses.includes(param) ? param : undefined

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['tickets', { status }],
    queryFn: () => getTickets({ status }),
  })

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
        onValueChange={value => setSearchParams(value === ALL ? {} : { status: value }, { replace: true })}
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

      {isPending ? (
        <TicketListSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState
          title={status ? `No ${STATUS_LABEL[status].toLowerCase()} tickets` : 'No tickets yet'}
          description={
            status ? 'Try another filter.' : isSupervisor ? 'Created tickets will show up here.' : 'Tickets assigned to you will show up here.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.content.map(ticket => (
            <li key={ticket.id}>
              <TicketCard ticket={ticket} showAssignee={isSupervisor} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
