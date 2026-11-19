import { createBrowserRouter, Navigate } from 'react-router'
import { HomeRedirect, RequireAuth } from './auth/guards'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { TicketsPage } from './pages/TicketsPage'

/**
 * Every page and who may see it.
 * Day 5 adds /dashboard and /tickets/new (supervisor, inside <RequireRole role="SUPERVISOR" />)
 * and /tickets/:id/update (technician).
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> }, // unknown URL → home
])

