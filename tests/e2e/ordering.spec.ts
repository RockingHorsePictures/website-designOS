import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
const teamOrder = async (page: Page) =>
  (
    (await (await page.request.get('/api/team-members?sort=_order&limit=100&depth=0')).json()) as {
      docs: { id: number; name: string }[]
    }
  ).docs

test('lists can be reordered by dragging or by typing a Position, and sites choose the order', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await login(page)
  const before = await teamOrder(page)
  expect(before.length).toBeGreaterThan(2)
  const last = before.at(-1)!

  // The list opens in the custom order, with a drag handle on every row.
  await page.goto('/admin/collections/team-members')
  const handles = page.locator('.sort-row')
  await expect(handles).toHaveCount(before.length)
  const from = (await handles.last().boundingBox())!
  const to = (await handles.first().boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, from.y - 10, { steps: 5 })
  await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 20 })
  await page.mouse.up()
  await expect.poll(async () => (await teamOrder(page))[0].id).toBe(last.id)

  // The edit screen shows the record's place, and typing one moves it.
  await page.goto(`/admin/collections/team-members/${last.id}`)
  const position = page.getByLabel('Position')
  await expect(position).toHaveValue('1')
  await position.fill(String(before.length))
  await page
    .getByRole('button', { name: /^(Save|Save to workspace)$/ })
    .first()
    .click()
  await expect.poll(async () => (await teamOrder(page)).at(-1)!.id).toBe(last.id)
  expect((await teamOrder(page)).map((p) => p.id)).toEqual(before.map((p) => p.id))

  // Site Settings choose how each collection is listed on the site.
  await page.goto('/admin/globals/site-settings')
  const section = page.locator('.collapsible', { hasText: 'Listing order' }).last()
  const posts = section.getByText('Blog posts', { exact: true })
  // The toggle can be clicked before the form is interactive, so retry until it opens.
  await expect(async () => {
    if (!(await posts.isVisible())) await section.locator('.collapsible__toggle').first().click()
    await expect(posts).toBeVisible({ timeout: 1000 })
  }).toPass()
  const res = await page.request.get('/api/globals/site-settings?depth=0')
  expect(
    ((await res.json()) as { listingOrder: Record<string, string> }).listingOrder,
  ).toMatchObject({ services: 'custom', posts: 'newest', clients: 'az' })
})
