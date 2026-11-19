import { useAuth } from '@/auth/AuthContext'
import type { Role } from '@/types'
import { cn } from 'cn'
import { ClipboardList, RadioTower, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

// Day 5 adds Dashboard and New (supervisor only).
const NAV: NavItem[] = [
  { to: '/tickets', label: 'Tickets', icon: ClipboardList, roles: ['TECHNICIAN', 'SUPERVISOR'] },
  { to: '/profile', label: 'Profile', icon: UserRound, roles: ['TECHNICIAN', 'SUPERVISOR'] },
]

/**
 * The frame around every logged-in page.
 * Phones (the default): a top bar and a bottom tab bar within thumb reach.
 * md screens and up (768 px+): a sidebar on the left instead.
 */
export function AppLayout() {
  const { user } = useAuth()
  const items = NAV.filter(item => user && item.roles.includes(user.role))

  return (
    <div className="min-h-svh md:flex">
      {/* Sidebar: laptops only */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                  isActive && 'bg-sidebar-accent text-foreground',
                )
              }
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </NavLink>
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
        {/* Top bar: phones only */}
        <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Logo />
        </header>

        {/* Extra bottom padding on phones so the tab bar never covers content */}
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar: phones only */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground',
                isActive && 'text-foreground',
              )
            }
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </NavLink>
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
