import { expect, test } from './fixtures'

test('quick check gives a verdict from four fields and carries them into results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /1-minute quick check/ }).click()
  await expect(page.getByRole('heading', { name: 'Is my base salary fair?' })).toBeVisible()
  const check = page.getByRole('button', { name: 'Check my offer' })
  await expect(check).toBeDisabled()

  await page.fill('#q-title', 'Senior Software Engineer')
  await page.selectOption('#q-level', 'senior')
  await page.selectOption('#q-location', 'sea')
  await page.fill('#q-base', '120,000')
  await check.click()
  await expect(page.getByRole('heading', { name: 'Below the typical range' })).toBeVisible()

  // Changing a value hides the stale verdict until checked again
  await page.fill('#q-base', '400,000')
  await expect(page.getByRole('heading', { name: /typical range/ })).toHaveCount(0)
  await check.click()
  await expect(page.getByRole('heading', { name: 'Above the typical range' })).toBeVisible()

  await page.getByRole('button', { name: 'See results with just this' }).click()
  await page.waitForURL(/\/results$/)
  await expect(page.getByRole('heading', { name: 'Senior Software Engineer' })).toBeVisible()
  await expect(page.getByText('$400,000').first()).toBeVisible()
})
