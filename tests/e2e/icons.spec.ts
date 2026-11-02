import { expect, openSample, test } from './fixtures'

// Guards against icons collapsing to zero size after bundling (a past production-only bug).
test('no visible icon renders at zero size', async ({ page }) => {
  await openSample(page)
  const routes = ['/', '/quick', '/evaluate/about-you', '/evaluate/offer', '/evaluate/priorities', '/results', '/results/market', '/results/negotiation', '/results/scripts', '/results/coach', '/results/coach?mode=rehearse', '/settings']
  const found: string[] = []
  for (const r of routes) {
    await page.goto(r)
    await page.waitForLoadState('networkidle')
    if (r === '/results/coach') await page.fill('#coach-input', 'hello')
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('svg')]
        .filter((s) => {
          const st = getComputedStyle(s)
          const box = s.getBoundingClientRect()
          const parent = s.parentElement!.getBoundingClientRect()
          const visible = st.display !== 'none' && st.visibility !== 'hidden' && !s.closest('.sr-only')
          return visible && parent.width > 0 && parent.height > 0 && (box.width < 1 || box.height < 1)
        })
        .map((s) => `${s.getAttribute('class')} in ${s.parentElement!.tagName}`),
    )
    found.push(...bad.map((b) => `${r}: ${b}`))
  }
  expect(found).toEqual([])
})
