import { ApiError, isNetworkError } from '@/api/client'
import { addUpdate, getTicket } from '@/api/tickets'
import { useAuth } from '@/auth/AuthContext'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PhotoPicker } from '@/components/PhotoPicker'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import { STATUS_LABEL, localDateTime } from '@/lib/format'
import { getCoords, type Coords } from '@/lib/geo'
import { allowedNextStatuses } from '@/lib/status'
import { cn, newUuid } from '@/lib/utils'
import type { Status, TicketDetail } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, LoaderCircle, MapPin, MapPinOff } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

const NOTE_MAX = 500

/** Technician only (the router guards it): change status, add a note and photos. Location is captured in the background. */
export function UpdateTicketPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
    enabled: Number.isInteger(id),
  })

  // Back to the ticket we came from. If this page was opened directly, go to that ticket.
  const goBack = () => (location.key === 'default' ? navigate(`/tickets/${id}`, { replace: true }) : navigate(-1))

  let body
  if (!Number.isInteger(id)) body = <ErrorState error={new ApiError(404, 'Ticket not found')} />
  else if (isPending) body = <FormSkeleton />
  else if (error) body = <ErrorState error={error} onRetry={() => refetch()} />
  else if (data.assignedTo?.id !== user?.id) body = <ErrorState error={new ApiError(403, 'This ticket is no longer assigned to you.')} />
  else if (allowedNextStatuses(data.status).length === 0)
    body = <EmptyState title="Nothing left to update" description={`This ticket is ${STATUS_LABEL[data.status].toLowerCase()}.`} />
  // key: start a fresh form if the ticket's status changes underneath us (for example after a refetch)
  else body = <UpdateForm key={data.status} ticket={data} onDone={goBack} />

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="h-11 w-fit px-2 text-muted-foreground" onClick={goBack}>
        <ArrowLeft aria-hidden /> Back
      </Button>
      {data && (
        <header className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{data.ticketNo}</span> · currently <StatusChip status={data.status} />
          </p>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">Update ticket</h1>
          <p className="text-muted-foreground">{data.title}</p>
        </header>
      )}
      {body}
    </div>
  )
}

type GeoState = { state: 'locating' } | { state: 'found'; coords: Coords } | { state: 'unavailable' }

function UpdateForm({ ticket, onDone }: { ticket: TicketDetail; onDone: () => void }) {
  const queryClient = useQueryClient()
  const choices = allowedNextStatuses(ticket.status)
  const [toStatus, setToStatus] = useState<Status>(choices[0])
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<Blob[]>([])
  const [noteError, setNoteError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Location starts as soon as the form opens, so it's usually ready by the time Save is tapped.
  const [geo, setGeo] = useState<GeoState>({ state: 'locating' })
  const geoPromise = useRef<Promise<Coords | null>>(null)
  function startLocating() {
    const p = getCoords()
    geoPromise.current = p
    p.then(coords => {
      // Ignore an older answer if Try again started a newer one.
      if (geoPromise.current === p) setGeo(coords ? { state: 'found', coords } : { state: 'unavailable' })
    })
  }
  useEffect(startLocating, [])
  function retryLocation() {
    setGeo({ state: 'locating' })
    startLocating()
  }

  // One id per update. If the reply is lost and the user taps Save again, the same id tells
  // the server "you may already have this one", so it isn't saved twice.
  // Any change to the form makes it a different update, so it gets a new id.
  const clientUpdateId = useRef<string | null>(null)
  useEffect(() => {
    clientUpdateId.current = null
  }, [toStatus, note, photos])

  // A ref changes instantly, unlike state, so two quick taps can't both get through.
  const saving = useRef(false)

  const mutation = useMutation({
    mutationFn: async () => {
      // Wait for the location a little longer if it's still coming, but never block the save on it.
      const coords = await Promise.race([geoPromise.current, wait(3000).then(() => null)])
      clientUpdateId.current ??= newUuid()
      return addUpdate(
        ticket.id,
        {
          clientUpdateId: clientUpdateId.current,
          toStatus,
          note: note.trim(),
          ...(coords ?? {}),
          deviceTime: localDateTime(),
        },
        photos,
      )
    },
    onSuccess: () => {
      // The list, this ticket and the dashboard all show this ticket's status, so refresh them all.
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(toStatus === 'RESOLVED' ? `${ticket.ticketNo} resolved` : 'Update saved')
      onDone()
    },
    onError: err => {
      if (isNetworkError(err) || (err instanceof ApiError && err.status >= 500)) {
        // Day 6 puts these in the offline queue instead. For now the form keeps everything, so Save can be tapped again.
        // We can't know if the server got it (the reply may be what was lost), so don't claim either way.
        // Tapping Save again is safe: the same clientUpdateId means the server won't save it twice.
        setFormError("Couldn't confirm the update was saved. Check your connection and tap Save again; it won't be saved twice.")
      } else if (err instanceof ApiError && err.status === 401) {
        // The login expired: AuthContext already sends the user to the login page.
      } else {
        // 400/403/404: the server said no, and retrying won't change that. Show why,
        // and reload the ticket in case its status changed (for example, someone else resolved it).
        setFormError(errorMessage(err))
        queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      }
    },
    onSettled: () => {
      saving.current = false
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving.current) return
    setFormError(null)
    // Same rule as the server: a ticket can't be resolved without saying what was done.
    if (toStatus === 'RESOLVED' && !note.trim()) {
      setNoteError('Add a note about what you fixed before resolving.')
      document.getElementById('note')?.focus()
      return
    }
    setNoteError(null)
    saving.current = true
    mutation.mutate()
  }

  const busy = mutation.isPending

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="mb-2 text-sm font-medium">New status</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map(s => (
            <label
              key={s}
              className={cn(
                'flex h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                toStatus === s ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
              )}
            >
              <input type="radio" name="toStatus" value={s} checked={toStatus === s} onChange={() => setToStatus(s)} className="sr-only" />
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  toStatus === s && 'border-primary bg-primary text-primary-foreground',
                )}
                aria-hidden
              >
                {toStatus === s && <Check className="size-3" />}
              </span>
              {STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="note">
            Note {toStatus === 'RESOLVED' ? <span className="text-muted-foreground">(required)</span> : <span className="text-muted-foreground">(optional)</span>}
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {note.length}/{NOTE_MAX}
          </span>
        </div>
        <Textarea
          id="note"
          rows={4}
          maxLength={NOTE_MAX}
          disabled={busy}
          placeholder={toStatus === 'RESOLVED' ? 'What was wrong and what did you fix?' : 'What are you doing on site?'}
          value={note}
          onChange={e => {
            setNote(e.target.value)
            if (noteError) setNoteError(null)
          }}
          aria-invalid={!!noteError}
          aria-describedby={noteError ? 'note-error' : undefined}
          className="text-base md:text-sm" // 16 px on phones, so iPhones don't zoom in when typing
        />
        {noteError && (
          <p id="note-error" className="text-sm text-destructive">
            {noteError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Photos <span className="text-muted-foreground">{toStatus === 'RESOLVED' ? '(add an "after" photo)' : '(optional)'}</span>
        </span>
        <PhotoPicker photos={photos} onChange={setPhotos} disabled={busy} />
      </div>

      <LocationLine geo={geo} onRetry={retryLocation} disabled={busy} />

      {formError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" className="h-12 text-base" disabled={busy}>
        {busy && <LoaderCircle className="animate-spin" aria-hidden />}
        {busy ? 'Saving…' : toStatus === 'RESOLVED' ? 'Resolve ticket' : 'Save update'}
      </Button>
    </form>
  )
}

function LocationLine({ geo, onRetry, disabled }: { geo: GeoState; onRetry: () => void; disabled: boolean }) {
  if (geo.state === 'locating') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Getting your location…
      </p>
    )
  }
  if (geo.state === 'found') {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <MapPin className="size-4" aria-hidden /> Location captured
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <MapPinOff className="size-4" aria-hidden /> Location unavailable. You can still save.
      </span>
      <Button type="button" variant="link" className="h-auto p-0" onClick={onRetry} disabled={disabled}>
        Try again
      </Button>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading ticket">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-11 w-40" />
    </div>
  )
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
