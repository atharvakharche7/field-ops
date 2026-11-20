import { cn } from '@/lib/utils'
import { CloudUpload } from 'lucide-react'

/** Marks something saved on this device that hasn't reached the server yet. */
export function PendingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 text-xs font-medium text-amber-800',
        className,
      )}
    >
      <CloudUpload className="size-3.5" aria-hidden />
      Pending sync
    </span>
  )
}
