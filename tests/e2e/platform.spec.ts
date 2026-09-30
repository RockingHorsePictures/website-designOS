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
const origin = (page: Page) => ({ Origin: new URL(page.url()).origin })

test('dashboard, new page dialog and composer', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page)
  await expect(
    page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible()
  await expect(page.getByText('Recently edited')).toBeVisible()
  expect(
    (
      await new AxeBuilder({ page })
        .include('.dos-dashboard')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  await page.getByRole('button', { name: /New page/ }).click()
  const dialog = page.getByRole('dialog', { name: 'New page' })
  const title = `Dialog page ${Date.now()}`
  await dialog.getByLabel('Page title').fill(title)
  await dialog.getByRole('button', { name: 'Create and open composer' }).click()
  await expect(page).toHaveURL(/\/editor\/\d+/)
  await expect(page.getByTestId('composer-status')).toBeVisible()
  const id = page.url().match(/editor\/(\d+)/)![1]
  await page.request.delete(`/api/pages/${id}`, { headers: origin(page) })
  expect(errors).toEqual([])
})

test('blog, feed, search and structured data', async ({ page, request }) => {
  await login(page)
  await publishWorkspace(page)
  await page.goto('/blog')
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
  await page.getByRole('link', { name: 'Demo post' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Demo post' })).toBeVisible()
  const schema = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(schema).toContain('"BlogPosting"')
  const feed = await request.get('/blog/feed.xml')
  expect(feed.headers()['content-type']).toContain('application/rss+xml')
  expect(await feed.text()).toContain('<title>Demo post</title>')
  await page.goto('/search?q=demo+post')
  await expect(page.getByRole('link', { name: 'Demo post' })).toBeVisible()
})

test('builder forms store answers and never trust foreign origins', async ({ page, request }) => {
  await login(page)
  await publishWorkspace(page)
  const forms = await (
    await page.request.get('/api/forms?where[title][equals]=Demo enquiry form')
  ).json()
  const id = forms.docs[0].id
  const ok = await request.post(`/api/forms/${id}`, {
    headers: { Accept: 'application/json' },
    data: {
      name: 'Builder',
      email: 'builder@example.test',
      budget: 'large',
      message: 'Browser test',
      consent: 'on',
      page: '/layout-library',
    },
  })
  expect(ok.status(), await ok.text()).toBe(200)
  const invalid = await request.post(`/api/forms/${id}`, {
    headers: { Accept: 'application/json' },
    data: { email: 'builder@example.test', budget: 'huge' },
  })
  expect(invalid.status()).toBe(400)
  const foreign = await request.post(`/api/forms/${id}`, {
    headers: { Accept: 'application/json', Origin: 'https://evil.example' },
    data: { name: 'x' },
  })
  expect(foreign.status()).toBe(403)
  const stored = await (
    await page.request.get('/api/form-submissions?where[email][equals]=builder@example.test')
  ).json()
  expect(stored.docs[0].data).toMatchObject({ budget: 'large', consent: true })
  for (const doc of stored.docs)
    await page.request.delete(`/api/form-submissions/${doc.id}`, { headers: origin(page) })
})

test('password-protected pages reveal content only after the password', async ({
  page,
  browser,
}) => {
  await login(page)
  const slug = `private-${Date.now()}`
  const created = await page.request.post('/api/pages', {
    headers: origin(page),
    data: {
      title: 'Private page',
      slug,
      summary: 'Only for people with the password.',
      visibility: 'password',
      pagePassword: 'correct horse battery',
      _status: 'published',
      composition: {
        root: { props: {} },
        content: [
          {
            type: 'Text',
            props: { id: 'secret', heading: 'Secret heading', body: 'Hidden', width: 'narrow' },
          },
        ],
      },
    },
  })
  expect(created.ok(), await created.text()).toBe(true)
  const { doc } = await created.json()
  await publishWorkspace(page)
  try {
    const visitor = await browser.newPage()
    await visitor.goto(`/${slug}`)
    await expect(visitor.getByText('This page is protected.')).toBeVisible()
    expect(await visitor.content()).not.toContain('Secret heading')
    await visitor.getByLabel('Password').fill('wrong')
    await visitor.getByRole('button', { name: 'Continue' }).click()
    await expect(visitor.getByText('This page is protected.')).toBeVisible()
    await visitor.getByLabel('Password').fill('correct horse battery')
    await visitor.getByRole('button', { name: 'Continue' }).click()
    await expect(visitor.getByRole('heading', { name: 'Secret heading' })).toBeVisible()
    await visitor.close()
  } finally {
    await page.request.delete(`/api/pages/${doc.id}`, { headers: origin(page) })
  }
})

test('first-user registration is closed and uploads are private until released', async ({
  request,
}) => {
  const register = await request.post('/api/users/first-register', {
    data: {
      email: 'intruder@example.test',
      password: 'long-enough-password',
      name: 'x',
      role: 'admin',
    },
  })
  expect(register.status()).toBeGreaterThanOrEqual(400)
  expect((await request.get('/setup')).url()).toMatch(/\/admin/)
  const media = await (await request.get('/api/media?limit=100&depth=0')).json()
  for (const doc of media.docs) expect(doc).not.toHaveProperty('context')
  const login = await request.get('/admin/login')
  expect(await login.text()).not.toContain('Sign in with Google')
})
