import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('admin workspace remains accessible on mobile, in dark mode and with keyboard navigation', async ({
  page,
}) => {
  await page.goto('/admin/login')
  await expect(page.getByText('Your website workspace', { exact: true })).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A home for your website.' })).toBeVisible()
  const guide = page.getByRole('region', { name: 'Build your website with AI' })
  await expect(guide.getByLabel('What are you starting?')).toBeHidden()
  await guide.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(guide.getByLabel('What are you starting?')).toBeVisible()
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  for (const theme of ['light', 'dark']) {
    await page.locator('html').evaluate((el, value) => el.setAttribute('data-theme', value), theme)
    expect(
      (
        await new AxeBuilder({ page })
          .include('.dos-home')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
  }
  await page.getByRole('link', { name: 'Make it yours' }).click()
  await expect(page.locator('#field-logo').getByText('Main logo', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.goto('/admin/globals/theme')
  const original = await page.locator('#field-accent').inputValue()
  await page.getByLabel('Choose Accent colour').fill('#345678')
  await expect(page.locator('#field-accent')).toHaveValue('#345678')
  // Editing the picker changes the form only; this test leaves the saved palette untouched.
  await page.getByLabel('Choose Accent colour').fill(original)
})
