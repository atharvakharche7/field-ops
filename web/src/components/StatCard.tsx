import { cn } from '@/lib/utils'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

/** One number on the dashboard. The whole card links to the list behind the number. */
export function StatCard({
  label,
  value,
  hint,
  to,
  icon: Icon,
  alert,
}: {
  label: string
  value: number
  hint: string
  to: string
  icon: LucideIcon
  alert?: boolean // red when this number needs attention (for example, critical tickets still open)
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        alert && 'border-red-200 bg-red-50 hover:bg-red-100/70',
      )}
    >
      <span className={cn('flex items-center justify-between text-sm text-muted-foreground', alert && 'text-red-700')}>
        <span className="flex items-center gap-2">
          <Icon className="size-4" aria-hidden />
          {label}
        </span>
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
      <span className={cn('text-3xl font-semibold tabular-nums', alert && 'text-red-700')}>{value}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Link>
  )
}
