import { expect, test } from '@playwright/test'
import { TECH1, TECH2, createTicketFor, logIn, uniqueTitle } from './helpers.ts'

test('a technician sees only their own tickets', async ({ page }) => {
  const mine = await createTicketFor(TECH1, uniqueTitle('E2E mine'))
  const theirs = await createTicketFor(TECH2, uniqueTitle('E2E theirs'))

  await logIn(page, TECH1)

  await expect(page.getByText(mine.title)).toBeVisible()
  await expect(page.getByText(theirs.title)).toHaveCount(0)

  // Typing another technician's ticket address straight into the browser doesn't show it either:
  // the server answers 403, and the page shows an error instead of the ticket.
  await page.goto(`/tickets/${theirs.id}`)
  await expect(page.getByText('This ticket is not assigned to you')).toBeVisible()
  await expect(page.getByText(theirs.title)).toHaveCount(0)
})

test('a technician moves a ticket to In Progress and the note shows in the history', async ({ page }) => {
  const ticket = await createTicketFor(TECH1, uniqueTitle('E2E progress'))
  const note = 'Checked the access point, replacing the PoE injector'

  await logIn(page, TECH1)
  await page.getByText(ticket.title).click()
  await page.getByRole('link', { name: 'Update status' }).click()

  await page.locator('label', { hasText: 'In progress' }).click()
  await page.getByLabel(/Note/).fill(note)
  await page.getByRole('button', { name: 'Save update' }).click()

  // Back on the ticket: the new entry is at the top of the history, from the server (not "Pending sync").
  await expect(page).toHaveURL(new RegExp(`/tickets/${ticket.id}$`))
  const history = page.locator('section', { has: page.getByRole('heading', { name: 'History' }) })
  const newest = history.locator('li').first()
  await expect(newest).toContainText('In progress')
  await expect(newest).toContainText(note)
  await expect(newest).toContainText('Ravi Kumar')
  await expect(newest.getByText('Pending sync')).toHaveCount(0)
})
