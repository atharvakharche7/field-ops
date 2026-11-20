import * as authApi from '@/api/auth'
import { ApiError, setUnauthorizedHandler } from '@/api/client'
import { persister } from '@/lib/queryClient'
import { clearForUser } from '@/offline/queue'
import type { User } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Who is logged in, shared with every page.
 * The token itself is in an httpOnly cookie that JavaScript can't see, so we never store it.
 * We only keep the user's name and role, and a copy in localStorage so the app can still
 * open without internet.
 */

const CACHED_USER_KEY = 'fieldops.user'

interface AuthState {
  user: User | null
  /** True until the first /api/auth/me answer, so pages don't flash the login screen. */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function saveCachedUser(user: User | null) {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHED_USER_KEY)
  } catch {
    // Storage can be blocked (private mode). The app still works, just not offline.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Forget the current user: state, cached copy, all fetched data and its saved copy in IndexedDB.
  // The offline queue is NOT cleared here: after a 401 (login expired) it syncs once they log back in.
  const clearSession = useCallback(() => {
    setUser(null)
    saveCachedUser(null)
    queryClient.clear()
    void persister.removeClient()
  }, [queryClient])

  // Any 401 from any API call means the cookie expired or is gone: back to login.
  useEffect(() => {
    setUnauthorizedHandler(clearSession)
  }, [clearSession])

  // On start, ask the server who the cookie belongs to.
  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then(u => {
        if (cancelled) return
        setUser(u)
        saveCachedUser(u)
      })
      .catch(err => {
        if (cancelled) return
        // Only a 401 means "not logged in". Anything else (no connection, or a 5xx while the
        // server is down or waking up) says nothing about the cookie, so trust the last known
        // user. The app opens, and the pages show their own error with Retry.
        if (err instanceof ApiError && err.status === 401) clearSession()
        else setUser(readCachedUser())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true // React StrictMode runs effects twice in development; ignore the first run's answer
    }
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const u = await authApi.login(email, password)
    // Drop any data still in memory from whoever used this browser before (on a shared phone,
    // the cache saved on the device may have been loaded at start-up), so nobody sees someone else's tickets.
    queryClient.clear()
    setUser(u)
    saveCachedUser(u)
    // Ask the browser not to delete our stored data (queue, cache) when space runs low.
    // Browsers may say no, and older ones don't have it; either way the app still works.
    void navigator.storage?.persist?.().catch(() => {})
    return u
  }, [queryClient])

  // Logging out on purpose also deletes this user's waiting and failed updates, so they can't be
  // sent later under someone else's login. The Profile page warns before this happens.
  const logout = useCallback(async () => {
    if (user) await clearForUser(user.id)
    try {
      await authApi.logout()
    } catch {
      // Offline or server down: still log out on this device.
    }
    clearSession()
  }, [clearSession, user])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Where each role lands after login: technicians on their ticket list, supervisors on the dashboard. */
export function homePath(user: User): string {
  return user.role === 'SUPERVISOR' ? '/dashboard' : '/tickets'
}
