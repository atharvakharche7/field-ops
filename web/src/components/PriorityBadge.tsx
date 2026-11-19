import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABEL } from '@/lib/format'
import type { Priority } from '@/types'
import { cn } from 'cn'

// The same colours everywhere: Critical red, High orange, Medium blue, Low grey.
const COLORS: Record<Priority, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-blue-600 text-white',
  LOW: 'bg-zinc-200 text-zinc-700',
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return <Badge className={cn(COLORS[priority], className)}>{PRIORITY_LABEL[priority]}</Badge>
}
