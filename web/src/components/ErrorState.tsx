import { Button } from '@/components/ui/button'
import { ApiError, isNetworkError } from '@/api/client'
import { errorMessage } from '@/lib/errors'
import { RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'

/** Shown when loading failed. Retry is offered only when trying again could help. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = isNetworkError(error)
  // 403 and 404 won't change on retry; network problems and server errors might.
  const canRetry = onRetry && !(error instanceof ApiError && (error.status === 403 || error.status === 404))
  const Icon = offline ? WifiOff : TriangleAlert

  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-sm">{errorMessage(error)}</p>
      {canRetry && (
        <Button variant="outline" className="h-11 px-4" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      )}
    </div>
  )
}
