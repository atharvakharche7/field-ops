import { expect, request, type Page } from '@playwright/test'

/** Shared steps for the end-to-end tests. */

export const PASSWORD = 'Password@123'
export const TECH1 = 'tech1@fieldops.dev' // Ravi Kumar
export const TECH2 = 'tech2@fieldops.dev' // Priya Sharma
const SUPERVISOR = 'supervisor@fieldops.dev'
const API = 'http://localhost:8080'

interface CreatedTicket {
  id: number
  ticketNo: string
  title: string
}

/**
 * Creates a fresh ticket through the API, logged in as the supervisor, and assigns it to a technician.
 * Every test makes its own ticket, so the tests never depend on seed data left over from earlier runs.
 */
export async function createTicketFor(technicianEmail: string, title: string): Promise<CreatedTicket> {
  // A separate "API browser": it keeps the supervisor's login cookie away from the test's real browser.
  const api = await request.newContext({ baseURL: API })
  try {
    const login = await api.post('/api/auth/login', { data: { email: SUPERVISOR, password: PASSWORD } })
    expect(login.ok(), 'supervisor login').toBeTruthy()

    const technicians: { id: number; email: string }[] = await (await api.get('/api/users?role=TECHNICIAN')).json()
    const technician = technicians.find(t => t.email === technicianEmail)
    if (!technician) throw new Error(`No technician ${technicianEmail}`)
    const sites: { id: number }[] = await (await api.get('/api/sites')).json()

    const created = await api.post('/api/tickets', {
      data: {
        title,
        description: 'Created by a Playwright test.',
        category: 'WIFI_DOWN',
        priority: 'MEDIUM',
        siteId: sites[0].id,
        assignedToId: technician.id,
      },
    })
    expect(created.status(), 'create ticket').toBe(201)
    return await created.json()
  } finally {
    await api.dispose()
  }
}

/** Logs in through the login page, like a person would. */
export async function logIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL(/\/tickets$/)
}

/** A title no other run has used, so a test finds exactly its own ticket. */
export function uniqueTitle(label: string): string {
  return `${label} ${Date.now().toString(36)}`
}
