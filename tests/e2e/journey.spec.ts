import { expect, noHorizontalScroll, openSample, resultsTab, test } from './fixtures'

test('landing → sample results show the published numbers', async ({ page }) => {
  await openSample(page)
  await expect(page.getByRole('heading', { name: 'Senior Product Designer' })).toBeVisible()
  await expect(page.getByText('$215K').first()).toBeVisible()
  for (const tab of ['Market', 'Strategy', 'Scripts', 'Coach']) {
    await resultsTab(page, tab).click()
    await expect(page.locator('main')).not.toBeEmpty()
  }
  await expect(resultsTab(page, 'Practice')).toHaveCount(0)
})

test('“See How It Works” scrolls on the landing page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'See How It Works' }).click()
  await expect(page.getByRole('heading', { name: /From “is this good\?”/ })).toBeInViewport()
})

test('manual entry from an empty start reaches results', async ({ page }) => {
  await page.goto('/evaluate/about-you')
  await expect(page.getByRole('radio', { name: /Enter details/ })).toHaveAttribute('aria-checked', 'true')
  // Optional current pay starts folded away
  await expect(page.locator('#cbase')).toHaveCount(0)
  await page.getByRole('button', { name: /Current compensation/ }).click()
  await expect(page.locator('#cbase')).toBeVisible()

  await page.fill('#jobTitle', 'Senior Software Engineer')
  await page.selectOption('#level', 'senior')
  await page.selectOption('#location', 'sea')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(/\/evaluate\/offer$/)
  await page.fill('#company', 'Acme Cloud')
  await page.fill('#base', '185,000')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(/\/evaluate\/priorities$/)
  await page.getByRole('button', { name: 'See my evaluation' }).click()
  await page.waitForURL(/\/results$/)
  await expect(page.getByText('Acme Cloud').first()).toBeVisible()
})

test('old /practice links open the coach in rehearse mode', async ({ page }) => {
  await openSample(page)
  await page.goto('/practice')
  await expect(page).toHaveURL(/\/results\/coach\?mode=rehearse$/)
  await expect(page.getByRole('tab', { name: 'Rehearse the call' })).toHaveAttribute('aria-selected', 'true')
})

test('results fit a phone screen @phone', async ({ page }) => {
  await openSample(page)
  for (const path of ['/results', '/results/market', '/results/negotiation', '/results/coach', '/quick']) {
    await page.goto(path)
    expect(await noHorizontalScroll(page), path).toBe(true)
  }
})
