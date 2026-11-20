import { createBrowserRouter, Navigate } from 'react-router'
import { HomeRedirect, RequireAuth, RequireRole } from './auth/guards'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { TicketsPage } from './pages/TicketsPage'

/**
 * Every page and who may see it.
 * The role guards only hide pages. The backend checks every request again and answers 403,
 * because anyone can type a URL or call the API directly.
 *
 * Pages used by only one role are loaded on demand (lazy), as separate files: a technician's
 * phone never downloads the supervisor pages. The service worker still caches all of them, so
 * they open offline too.
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />, // everything below needs a logged-in user
    children: [
      {
        element: <AppLayout />, // sidebar / bottom tabs around these pages
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'tickets', element: <TicketsPage /> },
          { path: 'tickets/:id', element: <TicketDetailPage /> },
          { path: 'profile', element: <ProfilePage /> },
          {
            element: <RequireRole role="TECHNICIAN" />,
            children: [
              {
                path: 'tickets/:id/update',
                lazy: () => import('./pages/UpdateTicketPage').then(m => ({ Component: m.UpdateTicketPage })),
              },
            ],
          },
          {
            element: <RequireRole role="SUPERVISOR" />,
            children: [
              { path: 'dashboard', lazy: () => import('./pages/DashboardPage').then(m => ({ Component: m.DashboardPage })) },
              // "new" is a fixed word, so the router picks this over tickets/:id
              {
                path: 'tickets/new',
                lazy: () => import('./pages/CreateTicketPage').then(m => ({ Component: m.CreateTicketPage })),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> }, // unknown URL → home
])
