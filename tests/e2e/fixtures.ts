import { test as base, expect, type Page } from '@playwright/test'

/** Fails any test that logs a page error or console error (fonts excluded: offline CI). */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::/.test(m.text())) errors.push(m.text())
      })
      await use(errors)
      expect(errors, 'browser errors').toEqual([])
    },
    { auto: true },
  ],
})
export { expect }

export async function openSample(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /explore a sample offer/ }).first().click()
  await page.waitForURL(/\/results$/)
}

export const resultsTab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Results sections' }).getByRole('link', { name, exact: true })

export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
}
