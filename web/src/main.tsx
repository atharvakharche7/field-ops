import { AuthProvider } from '@/auth/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { persistOptions, queryClient } from '@/lib/queryClient'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { router } from './router'

// Order matters: AuthProvider uses the query client (to clear it on logout),
// and the pages inside the router use both.
// PersistQueryClientProvider is QueryClientProvider plus "save the cache to IndexedDB and load it on start".
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
