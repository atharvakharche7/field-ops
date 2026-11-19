import type { User } from '@/types'
import { api, jsonBody } from './client'

/** 1. Checks the password. The server sets the login cookie; the body only has the user. */
export async function login(email: string, password: string): Promise<User> {
  const res = await api<{ user: User }>('/api/auth/login', { method: 'POST', ...jsonBody({ email, password }) })
  return res.user
}

/** 2. Who is logged in, according to the cookie. 401 if nobody. */
export function me(): Promise<User> {
  return api<User>('/api/auth/me')
}

/** 11. Asks the server to delete the cookie. JavaScript can't delete an httpOnly cookie itself. */
export function logout(): Promise<void> {
  return api<void>('/api/auth/logout', { method: 'POST' })
}
