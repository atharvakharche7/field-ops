import { useAuth } from '@/auth/AuthContext'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useQueue, useSync } from '@/offline/useSync'
import type { Role } from '@/types'
import { cn } from 'cn'
import { ClipboardList, LayoutDashboard, Plus, RadioTower, UserRound, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPERVISOR'] },
  { to: '/tickets', label: 'Tickets', icon: ClipboardList, roles: ['TECHNICIAN', 'SUPERVISOR'] },
  { to: '/tickets/new', label: 'New', icon: Plus, roles: ['SUPERVISOR'] },
  { to: '/profile', label: 'Profile', icon: UserRound, roles: ['TECHNICIAN', 'SUPERVISOR'] },
]

/**
 * Which tab is lit up. Tickets covers /tickets and every ticket page under it,
 * except /tickets/new, which has its own tab.
 */
function isActive(to: string, path: string): boolean {
  if (to === '/tickets') return path === '/tickets' || (path.startsWith('/tickets/') && path !== '/tickets/new')
  return path === to
}

/**
 * The frame around every logged-in page.
 * Phones (the default): a top bar and a bottom tab bar within thumb reach.
 * md screens and up (768 px+): a sidebar on the left instead.
 */
export function AppLayout() {
  const { user } = useAuth()
  const items = NAV.filter(item => user && item.roles.includes(user.role))
  const { pathname } = useLocation()
  // The offline queue's sync runs from here: this layout is on screen whenever someone is logged in.
  useSync(user?.id)
  const { pending } = useQueue(user?.id)

  return (
    <div className="min-h-svh md:flex">
      {/* Sidebar: laptops only */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to, pathname) ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                isActive(item.to, pathname) && 'bg-sidebar-accent text-foreground',
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="mt-auto border-t pt-4 text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">{user.role === 'SUPERVISOR' ? 'Supervisor' : 'Technician'}</p>
          </div>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {/* Stays at the top while scrolling: the phone top bar, and the offline banner on every screen size */}
        <div className="sticky top-0 z-10">
          <header className="flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur md:hidden">
            <Logo />
          </header>
          {user && <OfflineBanner userId={user.id} pending={pending.length} />}
        </div>

        {/* Extra bottom padding on phones so the tab bar never covers content */}
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar: phones only */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map(item => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={isActive(item.to, pathname) ? 'page' : undefined}
            className={cn(
              'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground',
              isActive(item.to, pathname) && 'text-foreground',
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <RadioTower className="size-4" aria-hidden />
      </span>
      FieldOps
    </span>
  )
}
