import { ApiError } from '@/api/client'
import { AuthProvider } from '@/auth/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data counts as fresh for 30 s, so going Back doesn't refetch every time
      // Retry network and server errors once; a 4xx (403, 404...) won't change on retry.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
      // refetchOnWindowFocus is on by default: switching back to the tab refreshes the list.
    },
  },
})

// Order matters: AuthProvider uses the query client (to clear it on logout),
// and the pages inside the router use both.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
