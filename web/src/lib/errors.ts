import { ApiError, isNetworkError } from '@/api/client'

/** Turns any error into a sentence a technician understands. */
export function errorMessage(error: unknown): string {
  if (isNetworkError(error)) return "Can't reach the server. Check your connection and try again."
  // 5xx: the proxy (Vite locally, Vercel live) couldn't reach Spring, or Spring itself failed.
  // On Render's free tier this is also what a sleeping backend looks like for up to a minute.
  if (error instanceof ApiError && error.status >= 500) {
    return "The server isn't responding right now. Try again in a moment."
  }
  if (error instanceof ApiError) return error.message
  return 'Something went wrong.'
}
