import { createBrowserRouter, Navigate } from 'react-router'
import { HomeRedirect, RequireAuth, RequireRole } from './auth/guards'
import { AppLayout } from './layouts/AppLayout'
import { CreateTicketPage } from './pages/CreateTicketPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { TicketsPage } from './pages/TicketsPage'
import { UpdateTicketPage } from './pages/UpdateTicketPage'

/**
 * Every page and who may see it.
 * The role guards only hide pages. The backend checks every request again and answers 403,
 * because anyone can type a URL or call the API directly.
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
            children: [{ path: 'tickets/:id/update', element: <UpdateTicketPage /> }],
          },
          {
            element: <RequireRole role="SUPERVISOR" />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              // "new" is a fixed word, so the router picks this over tickets/:id
              { path: 'tickets/new', element: <CreateTicketPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> }, // unknown URL → home
])
