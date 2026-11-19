import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { AssignDialog } from '@/components/AssignDialog'
import { getTicket } from '@/api/tickets'
import { ErrorState } from '@/components/ErrorState'
import { PriorityBadge } from '@/components/PriorityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORY_LABEL, STATUS_LABEL, directionsUrl, formatDateTime, pinUrl } from '@/lib/format'
import { allowedNextStatuses } from '@/lib/status'
import type { TicketDetail, Update } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, MapPin, Navigation, SquarePen } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

export function TicketDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const navigate = useNavigate()
  const location = useLocation()

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
    enabled: Number.isInteger(id), // don't call the API for /tickets/abc
  })

  // Back to the list we came from (keeps its filter). If this page was opened directly, go to /tickets.
  const goBack = () => (location.key === 'default' ? navigate('/tickets') : navigate(-1))

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="h-11 w-fit px-2 text-muted-foreground" onClick={goBack}>
        <ArrowLeft aria-hidden /> Back
      </Button>

      {!Number.isInteger(id) ? (
        <ErrorState error={new ApiError(404, 'Ticket not found')} />
      ) : isPending ? (
        <DetailSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <TicketDetailView ticket={data} />
      )}
    </div>
  )
}

function TicketDetailView({ ticket }: { ticket: TicketDetail }) {
  const { user } = useAuth()
  // Newest first: the latest work is what a technician or supervisor looks for. Same time → later id first.
  const updates = [...ticket.updates].sort((a, b) => b.deviceTime.localeCompare(a.deviceTime) || b.id - a.id)
  // Technicians can update their own unfinished tickets; supervisors can (re)assign anything not resolved.
  const canUpdate = user?.role === 'TECHNICIAN' && ticket.assignedTo?.id === user.id && allowedNextStatuses(ticket.status).length > 0
  const canAssign = user?.role === 'SUPERVISOR' && ticket.status !== 'RESOLVED'

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNo}</span>
          <PriorityBadge priority={ticket.priority} />
          <StatusChip status={ticket.status} />
        </div>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">{ticket.title}</h1>
        <p className="text-sm text-muted-foreground">{CATEGORY_LABEL[ticket.category]}</p>
      </header>

      {ticket.description && <p className="leading-relaxed">{ticket.description}</p>}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{ticket.site.name}</p>
              <p className="text-sm text-muted-foreground">
                {ticket.site.code} · {ticket.site.city}
              </p>
            </div>
          </div>
          {/* A plain link: on phones it opens the Google Maps app with directions */}
          <div className="grid gap-2 sm:grid-cols-2">
            {canUpdate && (
              <Button asChild className="h-11">
                <Link to={`/tickets/${ticket.id}/update`}>
                  <SquarePen aria-hidden /> Update status
                </Link>
              </Button>
            )}
            <Button asChild variant={canUpdate ? 'outline' : 'default'} className="h-11">
              <a href={directionsUrl(ticket.site.latitude, ticket.site.longitude)} target="_blank" rel="noopener noreferrer">
                <Navigation aria-hidden /> Navigate
              </a>
            </Button>
            {canAssign && <AssignDialog ticket={ticket} />}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
            <Detail label="Assigned to" value={ticket.assignedTo?.name ?? 'Unassigned'} />
            <Detail label="Created" value={formatDateTime(ticket.createdAt)} />
            <Detail label="Last updated" value={formatDateTime(ticket.updatedAt)} />
            <Detail label="Resolved" value={formatDateTime(ticket.resolvedAt)} />
          </dl>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">History</h2>
        <ol className="relative flex flex-col gap-6 border-l pl-6">
          {updates.map(u => (
            <TimelineItem key={u.id} update={u} />
          ))}
          <li className="relative">
            <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-zinc-300 ring-4 ring-background" aria-hidden />
            <p className="text-sm font-medium">Ticket created</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(ticket.createdAt)}</p>
          </li>
        </ol>
      </section>
    </>
  )
}

function TimelineItem({ update }: { update: Update }) {
  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-primary ring-4 ring-background" aria-hidden />
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        {update.fromStatus === update.toStatus ? (
          // Only a reassignment keeps the status the same (Assigned → Assigned); the note says who to whom.
          'Reassigned'
        ) : (
          <>
            {STATUS_LABEL[update.fromStatus]} <ArrowRight className="size-3.5" aria-label="to" /> {STATUS_LABEL[update.toStatus]}
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {update.updatedByName} · {formatDateTime(update.deviceTime)}
        {update.latitude != null && update.longitude != null && (
          <>
            {' · '}
            <a
              href={pinUrl(update.latitude, update.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Location
            </a>
          </>
        )}
      </p>
      {update.note && <p className="mt-2 text-sm leading-relaxed">{update.note}</p>}
      {update.attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {update.attachments.map(a => (
            // Same-origin URL, so the browser sends the login cookie and the server checks access.
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border">
              <img src={a.url} alt="Photo from this update" loading="lazy" className="aspect-square w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </li>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading ticket">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
