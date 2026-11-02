import type { Page } from '@playwright/test'
import { expect, openSample, resultsTab, test } from './fixtures'

const timeline = (page: Page) => page.locator('aside').getByText(/^Round \d$/)
const waitReply = (page: Page) => expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0, { timeout: 15_000 })

async function ask(page: Page, text: string) {
  await page.fill('#coach-input', text)
  await page.keyboard.press('Enter')
  await waitReply(page)
}

test('offline coach evaluates replies, keeps a timeline and survives reload', async ({ page }) => {
  await openSample(page)
  await resultsTab(page, 'Coach').click()
  await expect(page.getByText('Offline coach')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()

  await ask(page, 'They offered $205K base and a $10K signing bonus')
  await expect(page.getByText('Their offer · round 1')).toBeVisible()
  await expect(page.getByText('Draft reply', { exact: true })).toBeVisible()
  await expect(timeline(page)).toHaveCount(1)

  await ask(page, 'What if base goes to 215K?')
  await expect(page.getByText('What-if: base $215K').first()).toBeVisible()
  await expect(timeline(page)).toHaveCount(1)

  await page.reload()
  await expect(page.getByText('Their offer · round 1')).toBeVisible()
  await expect(page.getByText(/Earlier conversation about this offer restored/)).toBeVisible()
})

test('each offer has its own conversation', async ({ page }) => {
  await openSample(page)
  await page.goto('/results/coach')
  await ask(page, 'They offered $205K base')
  await expect(page.getByText('Their offer · round 1')).toBeVisible()
  // Starting the sample again is a new offer
  await openSample(page)
  await page.goto('/results/coach')
  await expect(page.getByText(/How can I help with your Northwind Labs offer/)).toBeVisible()
})

test('rehearse mode runs a practice round with feedback', async ({ page }) => {
  await openSample(page)
  await page.goto('/results/coach')
  await page.getByRole('tab', { name: 'Rehearse the call' }).click()
  await expect(page).toHaveURL(/mode=rehearse/)
  await page.getByRole('button', { name: /Start/ }).first().click()
  await page.fill('#practice-input', 'Thank you, I’m excited about the role. Based on my experience, I was hoping for a base closer to $215,000. Is there flexibility?')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Response score/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('tab', { name: 'Plan replies' }).click()
  await expect(page.locator('#coach-input')).toBeVisible()
})
