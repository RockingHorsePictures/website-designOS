import { test, expect } from '@playwright/test'

test('theme fonts preview, persist and render on the website and composer', async ({ page }) => {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const origin = new URL(page.url()).origin
  const original = await (await page.request.get('/api/globals/theme')).json()
  const keys = ['bodyFont', 'headingFont', 'bodyWeight', 'headingWeight', 'emphasisWeight']
  try {
    await page.goto('/admin/globals/theme')
    for (const [field, option] of [
      ['bodyFont', 'Inter'],
      ['headingFont', 'Lora'],
      ['bodyWeight', 'Medium — 500'],
      ['headingWeight', 'Semibold — 600'],
    ]) {
      await page.locator(`#field-${field}`).click()
      await page.getByRole('option', { name: option, exact: true }).click()
    }
    const sample = page.getByRole('region', { name: 'Typography sample' })
    await expect(sample).toHaveCSS('font-family', /Inter Variable/)
    await expect(sample.getByRole('heading')).toHaveCSS('font-family', /Lora Variable/)
    await expect(sample.getByRole('heading')).toHaveCSS('font-weight', '600')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect
      .poll(async () => (await (await page.request.get('/api/globals/theme')).json()).headingFont)
      .toBe('lora')
    await page.goto('/')
    await expect(page.locator('body')).toHaveCSS('font-family', /Inter Variable/)
    await expect(page.locator('body')).toHaveCSS('font-weight', '500')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /Lora Variable/)
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(
        () =>
          document.fonts.check('500 16px "Inter Variable"') &&
          document.fonts.check('600 24px "Lora Variable"'),
      ),
    ).toBe(true)
    const home = await (await page.request.get('/api/pages?where[slug][equals]=home')).json()
    await page.goto(`/editor/${home.docs[0].id}`)
    const preview = page.frameLocator('iframe').first()
    await expect(preview.getByRole('heading').first()).toHaveCSS('font-family', /Lora Variable/)
    await expect(preview.getByRole('heading').first()).toHaveCSS('font-weight', '600')
  } finally {
    const restored = await page.request.post('/api/globals/theme', {
      headers: { Origin: origin },
      data: Object.fromEntries(keys.map((k) => [k, original[k]])),
    })
    expect(restored.ok()).toBe(true)
  }
})
