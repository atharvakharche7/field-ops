import { Button } from '@/components/ui/button'
import { syncAndRefresh, useIsSyncing, useOnline } from '@/offline/useSync'
import { CloudUpload, LoaderCircle, WifiOff } from 'lucide-react'

/**
 * A strip at the top of every page: "You're offline · 2 updates waiting to sync".
 * Hidden when online with nothing waiting, so it only appears when it has something to say.
 */
export function OfflineBanner({ userId, pending }: { userId: number; pending: number }) {
  const online = useOnline()
  const syncing = useIsSyncing()
  if (online && pending === 0) return null

  const waiting = pending > 0 ? `${pending} update${pending === 1 ? '' : 's'} waiting to sync` : null
  return (
    <div
      role="status"
      className={
        online
          ? 'flex min-h-11 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-sm text-amber-900'
          : 'flex min-h-11 items-center justify-between gap-3 border-b bg-zinc-900 px-4 py-1.5 text-sm text-white'
      }
    >
      <span className="flex items-center gap-2">
        {online ? <CloudUpload className="size-4 shrink-0" aria-hidden /> : <WifiOff className="size-4 shrink-0" aria-hidden />}
        {online ? waiting : ["You're offline", waiting].filter(Boolean).join(' · ')}
      </span>
      {online && pending > 0 && (
        <Button size="sm" variant="outline" className="h-8 shrink-0 bg-white" disabled={syncing} onClick={() => void syncAndRefresh(userId)}>
          {syncing && <LoaderCircle className="animate-spin" aria-hidden />}
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      )}
    </div>
  )
}
