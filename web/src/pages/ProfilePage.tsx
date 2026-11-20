import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { STATUS_LABEL, formatDateTime } from '@/lib/format'
import { dismissFailed, retryFailed, type FailedUpdate, type QueuedUpdate } from '@/offline/queue'
import { syncAndRefresh, useIsSyncing, useOnline, useQueue } from '@/offline/useSync'
import { ArrowRight, CircleCheck, CircleX, CloudUpload, ImageIcon, LoaderCircle, LogOut, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { pending, failed } = useQueue(user?.id)
  const syncing = useIsSyncing()
  const online = useOnline()

  if (!user) return null
  const unsynced = pending.length + failed.length

  async function doLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  // Logging out deletes this user's offline updates (so they can't be sent under someone
  // else's login on a shared phone). If there are any, ask first.
  function handleLogout() {
    if (unsynced > 0) setConfirmOpen(true)
    else void doLogout()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-1">
              {user.role === 'SUPERVISOR' ? 'Supervisor' : 'Technician'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Supervisors don't post updates, so they only see this if something is somehow there */}
      {(user.role === 'TECHNICIAN' || unsynced > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Offline updates</CardTitle>
            <Button
              variant="outline"
              className="h-11"
              disabled={pending.length === 0 || syncing}
              onClick={() => void syncAndRefresh(user.id)}
            >
              {syncing ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {unsynced === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleCheck className="size-4 text-emerald-600" aria-hidden /> Everything is synced.
              </p>
            ) : (
              <>
                {pending.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <CloudUpload className="size-4 text-amber-600" aria-hidden />
                      Waiting to sync ({pending.length})
                    </h3>
                    {!online && <p className="text-sm text-muted-foreground">You're offline. These will send by themselves when you're back online.</p>}
                    <ul className="flex flex-col divide-y rounded-lg border">
                      {pending.map(p => (
                        <QueueRow key={p.clientUpdateId} item={p} />
                      ))}
                    </ul>
                  </section>
                )}
                {failed.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <CircleX className="size-4 text-destructive" aria-hidden />
                      Not accepted by the server ({failed.length})
                    </h3>
                    <ul className="flex flex-col divide-y rounded-lg border">
                      {failed.map(f => (
                        <FailedRow key={f.clientUpdateId} item={f} />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="h-11" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
        Log out
      </Button>

      <Dialog open={confirmOpen} onOpenChange={open => !loggingOut && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete unsynced updates?</DialogTitle>
            <DialogDescription>
              You have {unsynced} update{unsynced === 1 ? '' : 's'} that {unsynced === 1 ? "hasn't" : "haven't"} reached the server. Logging out
              will delete {unsynced === 1 ? 'it' : 'them'} from this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setConfirmOpen(false)} disabled={loggingOut}>
              Stay logged in
            </Button>
            <Button variant="destructive" className="h-11" onClick={() => void doLogout()} disabled={loggingOut}>
              {loggingOut && <LoaderCircle className="animate-spin" aria-hidden />}
              Log out and delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** The parts every queued item shows: which ticket, which change, when. */
function ItemSummary({ item }: { item: QueuedUpdate }) {
  return (
    <>
      <Link to={`/tickets/${item.ticketId}`} className="text-sm font-medium hover:underline">
        <span className="font-mono text-muted-foreground">{item.ticketNo}</span> {item.ticketTitle}
      </Link>
      <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {STATUS_LABEL[item.fromStatus]} <ArrowRight className="size-3" aria-label="to" /> {STATUS_LABEL[item.toStatus]}
        {' · saved '}
        {formatDateTime(item.deviceTime)}
        {item.photos.length > 0 && (
          <span className="inline-flex items-center gap-0.5">
            {' · '}
            <ImageIcon className="size-3" aria-hidden /> {item.photos.length}
          </span>
        )}
      </p>
    </>
  )
}

function QueueRow({ item }: { item: QueuedUpdate }) {
  return (
    <li className="flex flex-col gap-1 p-3">
      <ItemSummary item={item} />
      {item.attempts > 0 && item.lastError && (
        <p className="text-xs text-muted-foreground">
          Tried {item.attempts} time{item.attempts === 1 ? '' : 's'}: {item.lastError}
        </p>
      )}
    </li>
  )
}

function FailedRow({ item }: { item: FailedUpdate }) {
  const [busy, setBusy] = useState(false)
  const act = (fn: (id: string) => Promise<void>) => async () => {
    setBusy(true)
    await fn(item.clientUpdateId)
  }
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex flex-col gap-1">
        <ItemSummary item={item} />
        <p className="text-sm text-destructive">{item.reason}</p>
      </div>
      <div className="flex gap-2">
        {/* Try again: for when the reason was temporary, e.g. the supervisor assigned it back */}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={busy}
          onClick={act(async id => {
            await retryFailed(id) // back into the queue...
            void syncAndRefresh(item.userId) // ...and send it now
          })}
        >
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" disabled={busy} onClick={act(dismissFailed)}>
          <Trash2 aria-hidden /> Discard
        </Button>
      </div>
    </li>
  )
}
