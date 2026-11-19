/**
 * One small wrapper around fetch() that every API call goes through.
 * - Same origin (/api/...), so the browser sends the httpOnly login cookie by itself.
 * - Turns error responses into an ApiError with the server's message.
 * - A 401 means the login expired: it tells AuthContext, which shows the login page.
 * - If there's no connection at all, fetch throws a TypeError instead. That's how the
 *   rest of the app tells "no internet" apart from "the server said no".
 */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** True when the request never reached the server (offline, server down, DNS failure). */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError
}

// AuthContext registers what to do on a 401. Kept as a plain variable so this file has no React in it.
let onUnauthorized: () => void = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, init)

  // A wrong password on the login page is also a 401, but that one isn't "logged out".
  if (res.status === 401 && path !== '/api/auth/login') {
    onUnauthorized()
  }
  if (!res.ok) {
    // Every Spring error has the ApiError shape: { status, error, message, path, timestamp }.
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.message ?? res.statusText)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

/** Shortcut for JSON bodies. */
export function jsonBody(data: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
}
