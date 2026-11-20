import { expect, test } from '@playwright/test'
import { TECH1, createTicketFor, logIn, uniqueTitle } from './helpers.ts'

/**
 * The headline feature: save an update with no connection, see it waiting, reconnect, see it sync.
 * context.setOffline(true) cuts the browser off the network, like airplane mode.
 */
test('an update saved offline syncs when the connection comes back', async ({ page, context }) => {
  const ticket = await createTicketFor(TECH1, uniqueTitle('E2E offline'))
  const note = 'Fixed while the site had no signal'

  await logIn(page, TECH1)
  await page.getByText(ticket.title).click()
  await page.getByRole('link', { name: 'Update status' }).click()
  await expect(page.getByText('New status')).toBeVisible()

  await context.setOffline(true)

  await page.locator('label', { hasText: 'Resolved' }).click()
  await page.getByLabel(/Note/).fill(note)
  await page.getByRole('button', { name: 'Resolve ticket' }).click()

  // Saved on the phone, not on the server yet
  await expect(page.getByText(/Saved offline/)).toBeVisible()
  await expect(page.getByText(/1 update waiting to sync/)).toBeVisible()
  await expect(page.getByText('Pending sync').first()).toBeVisible()

  // Still offline, reload: the app opens from the service worker and the update is still waiting
  await page.reload()
  await expect(page.getByText(/1 update waiting to sync/)).toBeVisible()

  await context.setOffline(false)

  // Back online: it syncs by itself, the banner goes away and the server has the update
  await expect(page.getByText(/1 offline update synced/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/waiting to sync/)).toHaveCount(0)

  const res = await page.request.get(`/api/tickets/${ticket.id}`) // shares the page's login cookie
  const saved = await res.json()
  expect(saved.status).toBe('RESOLVED')
  expect(saved.updates.map((u: { note: string }) => u.note)).toContain(note)
})
