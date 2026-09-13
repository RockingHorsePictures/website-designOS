import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('public navigation and neutral responsive templates', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('foundation')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Case studies' })
    .click()
  await page.getByRole('link', { name: 'Demo project 1', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo project 1')
  const schema = await page.locator('script[type="application/ld+json"]').textContent()
  expect(JSON.parse(schema || '{}')['@graph']).toHaveLength(4)
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Services' })
    .click()
  await page.getByRole('link', { name: 'Demo service 1', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo service 1')
  await page.goto('/team')
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6)
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
})

test('editor saves a draft, previews it, publishes it, and changes its URL', async ({
  page,
  request,
}) => {
  const marker = `test-${Date.now()}`
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/collections/pages/create')
  await page.locator('#field-title').fill(`Editorial ${marker}`)
  await page.locator('#field-slug').fill(marker)
  await page
    .locator('#field-summary')
    .fill(
      'A representative page created through the actual editor for verifying the complete draft and publishing workflow.',
    )
  await page.getByRole('button', { name: 'Save Draft', exact: false }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/pages\/\d+/)
  const id = Number(new URL(page.url()).pathname.split('/').pop())
  expect((await request.get(`/${marker}`)).status()).toBe(404)
  expect((await request.get(`/api/preview?collection=pages&id=${id}`)).status()).toBe(401)
  await page.goto(`/api/preview?collection=pages&id=${id}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Editorial ${marker}`)
  await expect(page.getByText('Authenticated draft preview')).toBeVisible()
  await page.goto(`/admin/collections/pages/${id}`)
  await page.getByRole('button', { name: /^Publish/ }).click()
  await expect.poll(async () => (await request.get(`/${marker}`)).status()).toBe(200)
  await page.locator('#field-slug').fill(`${marker}-renamed`)
  await page.getByRole('button', { name: /^Publish/ }).click()
  await expect
    .poll(async () => (await request.get(`/${marker}`, { maxRedirects: 0 })).status())
    .toBe(308)
  const result = await page.request.delete(`/api/pages/${id}`, {
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(result.ok()).toBe(true)
})

test('anonymous API cannot mutate, read facts, run jobs or enable preview', async ({ request }) => {
  for (const route of [
    '/api/approved-facts',
    '/api/users',
    '/api/payload-jobs/run',
    '/api/preview?collection=pages&id=1',
  ])
    expect([401, 403]).toContain((await request.get(route)).status())
  expect([401, 403]).toContain(
    (await request.post('/api/pages', { data: { title: 'Unauthorized' } })).status(),
  )
  await expect((await request.get('/robots.txt')).text()).resolves.toContain('Disallow: /')
  const sitemap = await request.get('/sitemap.xml')
  expect(await sitemap.text()).not.toContain('<loc>')
  expect((await request.get('/')).headers()['x-robots-tag']).toContain('noindex')
})

test('page composer previews real sections and saves drafts without publishing', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const origin = new URL(page.url()).origin
  const slug = `composer-${Date.now()}`
  const create = await page.request.post('/api/pages', {
    headers: { Origin: origin },
    data: {
      title: 'Composer test',
      slug,
      summary:
        'Composer fixture to verify that real sections preview and save safely without changing the public version.',
      _status: 'published',
      composition: {
        root: { props: {} },
        content: [
          {
            type: 'Intro',
            props: {
              id: 'test-intro',
              heading: 'Original section',
              body: 'Original body',
              style: 'plain',
            },
          },
        ],
      },
    },
  })
  expect(create.ok()).toBe(true)
  const { doc } = await create.json()
  try {
    await page.goto(`/editor/${doc.id}`)
    await expect(page.getByRole('heading', { name: /^Page composer/ })).toBeVisible()
    await page.screenshot({ path: '.local/composer-desktop.png', fullPage: true })
    const preview = page.frameLocator('iframe').first()
    await preview.getByRole('heading', { name: 'Original section' }).click()
    await page
      .getByRole('textbox', { name: 'heading', exact: true })
      .fill('Private revised section')
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(page.getByTestId('composer-status')).toContainText('Draft saved')
    const live = await request.get(`/${slug}`)
    expect(await live.text()).toContain('Original section')
    expect(await live.text()).not.toContain('Private revised section')
    expect(errors).toEqual([])
  } finally {
    await page.request.delete(`/api/pages/${doc.id}`, { headers: { Origin: origin } })
  }
})
