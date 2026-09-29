import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { publishWorkspace } from './helpers'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test('every base section renders accessibly with structured data from visible content', async ({
  page,
}) => {
  await login(page)
  await publishWorkspace(page)
  const response = await page.goto('/section-library')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Section library' })).toBeVisible()
  for (const name of [
    'Hero section',
    'Text section',
    'Feature list',
    'Questions and answers',
    'Contact',
  ])
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
  const schema = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(schema).toContain('"FAQPage"')
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  // No-JavaScript contact form posts store an enquiry and return to the page.
  const post = await page.request.post('/api/forms/contact', {
    form: {
      name: 'E2E',
      email: 'e2e@example.test',
      message: 'Browser test',
      page: '/section-library',
    },
    maxRedirects: 0,
  })
  expect(post.status()).toBe(303)
  expect(post.headers().location).toContain('/section-library')
  const enquiries = await (
    await page.request.get('/api/form-submissions?where[email][equals]=e2e@example.test')
  ).json()
  expect(enquiries.totalDocs).toBeGreaterThan(0)
  for (const doc of enquiries.docs)
    await page.request.delete(`/api/form-submissions/${doc.id}`, {
      headers: { Origin: new URL(page.url()).origin },
    })
})

test('composer offers the full library and Site health reports on the workspace', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page)
  await page.getByRole('button', { name: 'Check the whole site' }).click()
  await expect(page.getByText(/\d+\/100/)).toBeVisible()
  const library = await (
    await page.request.get('/api/pages?where[slug][equals]=section-library&draft=true')
  ).json()
  await page.goto(`/editor/${library.docs[0].id}`)
  await expect(page.getByRole('heading', { name: /^Page composer/ })).toBeVisible()
  for (const label of ['Hero', 'Questions and answers', 'Testimonials', 'Contact'])
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  const preview = page.frameLocator('iframe').first()
  await expect(preview.getByRole('heading', { name: 'Hero section' })).toBeVisible()
  await expect(preview.getByText('The form is disabled in the composer.')).toBeVisible()
  expect(errors).toEqual([])
})
