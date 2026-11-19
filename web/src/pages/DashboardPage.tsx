import { getSummary } from '@/api/dashboard'
import { ErrorState } from '@/components/ErrorState'
import { PriorityBadge } from '@/components/PriorityBadge'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardSummary, Priority } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleDot, Plus, RefreshCw, Siren, Wrench } from 'lucide-react'
import { Link } from 'react-router'

const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

/** Supervisor home page: how much work is open, and who is carrying it. */
export function DashboardPage() {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getSummary,
    refetchInterval: 60_000, // keep the numbers fresh while the page is open (paused when the tab is hidden)
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ticket counts across all sites</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 px-4" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh dashboard">
            <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {/* Phones have "New" in the bottom bar already */}
          <Button asChild className="hidden h-11 px-4 md:inline-flex">
            <Link to="/tickets/new">
              <Plus aria-hidden /> New ticket
            </Link>
          </Button>
        </div>
      </div>

      {isPending ? <DashboardSkeleton /> : error ? <ErrorState error={error} onRetry={() => refetch()} /> : <DashboardView summary={data} />}
    </div>
  )
}

function DashboardView({ summary }: { summary: DashboardSummary }) {
  const { byStatus, byPriority } = summary
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0)
  const busiest = Math.max(1, ...summary.technicians.map(t => t.activeTickets))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open" value={byStatus.OPEN} hint="Waiting for a technician" to="/tickets?status=OPEN" icon={CircleDot} />
        <StatCard
          label="In progress"
          value={byStatus.IN_PROGRESS}
          hint={`${byStatus.ASSIGNED} more assigned, not started`}
          to="/tickets?status=IN_PROGRESS"
          icon={Wrench}
        />
        <StatCard label="Resolved today" value={summary.resolvedToday} hint={`${byStatus.RESOLVED} resolved in total`} to="/tickets?status=RESOLVED" icon={CircleCheck} />
        <StatCard
          label="Critical open"
          value={summary.openCritical}
          // The card opens every critical ticket (the list can't filter "not resolved"), so the hint gives that total.
          hint={`Not resolved yet · ${byPriority.CRITICAL} critical in total`}
          to="/tickets?priority=CRITICAL"
          icon={Siren}
          alert={summary.openCritical > 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Technician workload</CardTitle>
            <p className="text-sm text-muted-foreground">Assigned and in-progress tickets per person</p>
          </CardHeader>
          <CardContent>
            {summary.technicians.length === 0 ? (
              <p className="text-sm text-muted-foreground">No technicians yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {summary.technicians.map(t => (
                  <li key={t.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-muted-foreground tabular-nums">{t.activeTickets} active</span>
                    </div>
                    {/* A simple bar: the busiest technician fills the width, everyone else is relative to them */}
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(t.activeTickets / busiest) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By priority</CardTitle>
            <p className="text-sm text-muted-foreground">All {total} tickets, including resolved</p>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {PRIORITIES.map(p => (
                <li key={p}>
                  <Link
                    to={`/tickets?priority=${p}`}
                    className="flex h-11 items-center justify-between rounded-md px-1 text-sm hover:bg-muted/50"
                  >
                    <PriorityBadge priority={p} />
                    <span className="font-medium tabular-nums">{byPriority[p]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}
