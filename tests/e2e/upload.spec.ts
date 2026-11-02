import { expect, test } from './fixtures'

const PDF = 'public/samples/sample-offer-letter.pdf'
const DOCX = 'public/samples/sample-offer-letter-2.docx'

async function chooseUpload(page: import('@playwright/test').Page) {
  await page.goto('/evaluate/about-you')
  await page.getByRole('radio', { name: /Upload offer letter/ }).click()
}

test('upload is locked until the privacy notice is accepted', async ({ page }) => {
  await chooseUpload(page)
  await expect(page.getByText('Before you upload')).toBeVisible()
  await expect(page.locator('#offer-file')).toBeDisabled()
  await page.locator('#upload-consent').check()
  await expect(page.locator('#offer-file')).toBeEnabled()
})

test('a PDF letter fills the form, field by field', async ({ page }) => {
  await chooseUpload(page)
  await page.locator('#upload-consent').check()
  await page.setInputFiles('#offer-file', PDF)
  const status = page.locator('#autofill-status')
  await expect(status).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#jobTitle')).toHaveValue('Senior Product Designer')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(status).toContainText('0 of 2 confirmed')

  await page.getByRole('button', { name: 'Job title looks right' }).click()
  await expect(page.getByText('Confirmed from your letter')).toBeVisible()
  await page.getByRole('button', { name: 'Clear Location' }).click()
  await expect(page.locator('#location')).toHaveValue('')

  await page.selectOption('#location', 'sea')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(/\/evaluate\/offer$/)
  await expect(page.locator('#base')).toHaveValue('195,000')
  await expect(page.locator('#company')).toHaveValue('Northwind Labs')
})

test('a Word letter fills the offer and personal details are not stored', async ({ page }) => {
  await chooseUpload(page)
  await page.locator('#upload-consent').check()
  await page.setInputFiles('#offer-file', DOCX)
  await expect(page.locator('#autofill-status')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#jobTitle')).toHaveValue('Staff Software Engineer')
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))
  expect(stored).not.toMatch(/Sam Rivera/)
})

test('a scanned PDF explains that no text was found', async ({ page }) => {
  await chooseUpload(page)
  await page.locator('#upload-consent').check()
  await page.setInputFiles('#offer-file', 'tests/fixtures/files/scanned.pdf')
  await expect(page.getByText(/scanned|image|couldn’t find any text/i).first()).toBeVisible({ timeout: 15_000 })
})

test('upload markers do not follow you into a new visit', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await chooseUpload(page)
  await page.locator('#upload-consent').check()
  await page.setInputFiles('#offer-file', PDF)
  await expect(page.locator('#autofill-status')).toBeVisible({ timeout: 15_000 })
  // A new tab shares localStorage but not sessionStorage
  const again = await context.newPage()
  await again.goto('/evaluate/about-you')
  await expect(again.locator('#jobTitle')).toHaveValue('Senior Product Designer')
  await expect(again.locator('#autofill-status')).toHaveCount(0)
  await context.close()
})
