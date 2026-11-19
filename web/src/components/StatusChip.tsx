import { STATUS_LABEL } from '@/lib/format'
import type { Status } from '@/types'
import { cn } from 'cn'

// Status uses an outlined chip with a dot, so it never looks like a priority badge.
const DOT: Record<Status, string> = {
  OPEN: 'bg-zinc-400',
  ASSIGNED: 'bg-violet-500',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500',
}

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium text-foreground',
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', DOT[status])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}
