import { test, expect } from '@playwright/test'
import { publishWorkspace } from './helpers'
test('whole-site release controls isolate edits, retain Preview and require unlocking', async ({
  page,
  request,
}) => {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A home for your website.' })).toBeVisible()
  const originalTheme = await (await page.request.get('/api/globals/theme?depth=0')).json()
  const headers = { Origin: new URL(page.url()).origin }
  try {
    await page.goto('/admin/globals/theme')
    await page.getByText('Approvals & locks', { exact: true }).click()
    await page.getByLabel('Background approval', { exact: true }).selectOption('locked')
    await expect(
      page.getByText('Approval saved. Reload this record before making further edits.'),
    ).toBeVisible()
    const blocked = await page.request.post('/api/globals/theme', {
      headers,
      data: { canvas: '#112233' },
    })
    expect(blocked.status()).toBe(423)
    await page.reload()
    await page.getByText('Approvals & locks', { exact: true }).click()
    await page.getByLabel('Background approval', { exact: true }).selectOption('approved')
    await expect(
      page.getByText('Approval saved. Reload this record before making further edits.'),
    ).toBeVisible()
    await publishWorkspace(page)
    await page.request.post('/api/globals/theme', { headers, data: { canvas: '#112233' } })
    expect(await (await request.get('/')).text()).not.toContain('--color-canvas:#112233')
    await page.goto('/admin')
    const panel = page.getByRole('region', { name: 'Site publishing' })
    await panel.getByRole('button', { name: 'Save to Preview', exact: true }).click()
    await expect(panel.getByRole('status')).toContainText('Preview saved')
    expect(await (await request.get('/preview')).text()).toContain('--color-canvas:#112233')
    expect(await (await request.get('/')).text()).not.toContain('--color-canvas:#112233')
    await panel.getByRole('button', { name: 'Publish to Live', exact: true }).click()
    await panel.getByRole('button', { name: 'Confirm publication', exact: true }).click()
    await expect(panel.getByRole('status')).toContainText('now Live')
    expect(await (await request.get('/')).text()).toContain('--color-canvas:#112233')
    await page.goto('/preview')
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Services', exact: true })
      .click()
    await expect(page).toHaveURL(/\/preview\/services$/)
    await page.goto('/admin')
    await panel.getByRole('button', { name: 'Unpublish site', exact: true }).click()
    await panel.getByRole('button', { name: 'Confirm unpublish', exact: true }).click()
    await expect(panel.getByRole('status')).toContainText('Coming soon')
    expect(await (await request.get('/')).text()).toContain('Coming soon')
    expect(await (await request.get('/preview')).text()).toContain('--color-canvas:#112233')
    expect((await request.get('/api/globals/theme')).status()).toBe(403)
  } finally {
    await page.request.post('/api/globals/theme', {
      headers,
      data: { canvas: originalTheme.canvas },
    })
    await page.goto('/admin')
    await publishWorkspace(page)
  }
})
