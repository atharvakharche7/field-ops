import * as authApi from '@/api/auth'
import { ApiError, setUnauthorizedHandler } from '@/api/client'
import type { User } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Who is logged in, shared with every page.
 * The token itself is in an httpOnly cookie that JavaScript can't see, so we never store it.
 * We only keep the user's name and role, and a copy in localStorage so the app can still
 * open without internet (the offline part is finished on Day 6).
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

  // Forget everything about the current user: state, cached copy and all fetched data.
  const clearSession = useCallback(() => {
    setUser(null)
    saveCachedUser(null)
    queryClient.clear()
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
    setUser(u)
    saveCachedUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Offline or server down: still log out on this device.
    }
    clearSession()
  }, [clearSession])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Where each role lands after login. Supervisors move to /dashboard on Day 5. */
export function homePath(_user: User): string {
  return '/tickets'
}
