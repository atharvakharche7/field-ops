import type { Role } from '@/types'
import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { homePath, useAuth } from './AuthContext'

/** Pages inside this route need a logged-in user; everyone else goes to /login. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!user) {
    // Remember where they were going, so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/**
 * Pages inside this route are for one role only. This only hides pages;
 * the real protection is the backend's 403, because anyone can type a URL.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  if (user && user.role !== role) return <Navigate to={homePath(user)} replace />
  return <Outlet />
}

/** "/" sends each role to its own home page. */
export function HomeRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to={homePath(user)} replace /> : null
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  )
}
