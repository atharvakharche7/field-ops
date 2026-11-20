import { ApiError } from '@/api/client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient, onlineManager, type Query } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'

const DAY = 24 * 60 * 60 * 1000

// TanStack Query assumes "online" when the page loads and only learns otherwise from an
// "offline" event. After reloading with no signal that event never comes, so start from the
// browser's own answer. Then queries wait quietly instead of failing.
if (typeof navigator !== 'undefined' && 'onLine' in navigator) onlineManager.setOnline(navigator.onLine)

/** The one cache for all server data (tickets, dashboard...). Used by every page through TanStack Query. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data counts as fresh for 30 s, so going Back doesn't refetch every time
      // Keep unused data for a day (default is 5 minutes), so it's still there to be saved
      // to IndexedDB and shown the next time the app opens without a connection.
      gcTime: DAY,
      // Retry network and server errors once; a 4xx (403, 404...) won't change on retry.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
      // refetchOnWindowFocus is on by default: switching back to the tab refreshes the list.
    },
    mutations: {
      // By default TanStack Query pauses a save while the browser says it's offline, so the Save
      // button would spin forever. "always" sends it anyway; it fails fast, and the Update page
      // then puts it in the offline queue.
      networkMode: 'always',
    },
  },
})

/**
 * Saves the query cache to IndexedDB and loads it back when the app starts, so a technician
 * who opens FieldOps with no signal still sees their tickets from the last visit.
 */
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: key => get<string>(key),
    setItem: (key, value: string) => set(key, value),
    removeItem: key => del(key),
  },
  key: 'fieldops.cache',
  throttleTime: 250, // batch quick changes into one write, but save soon enough that closing the app right away keeps them
})

/**
 * Which queries to save. By default only ones whose last fetch succeeded, so a ticket whose
 * refresh failed offline would be dropped from the saved copy, exactly when it's needed most.
 * So: save anything that has data, except after a 403/404 (no longer yours, or deleted).
 */
function shouldSave(query: Query): boolean {
  const { data, error } = query.state
  return data !== undefined && !(error instanceof ApiError && error.status >= 400 && error.status < 500)
}

export const persistOptions = {
  persister,
  maxAge: DAY, // a saved cache older than a day is thrown away instead of shown
  buster: 'v1', // change this when the shape of the API data changes, to drop old saved caches
  dehydrateOptions: { shouldDehydrateQuery: shouldSave },
}
