import { test, expect, type Page } from '@playwright/test'
import { spawn, spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
const bridge = (...args: string[]) => {
  const r = spawnSync(process.execPath, ['scripts/ai.mjs', ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr || r.stdout)
  return JSON.parse(r.stdout).live
}

test('an approved AI connection saves drafts only while allowed, and its changes can be undone', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  const stamp = `ai${Date.now()}`
  const base = testInfo.project.use.baseURL || 'http://localhost:3000'
  rmSync('.designos/ai-live.json', { force: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await login(page)
  const origin = { Origin: new URL(page.url()).origin }
  const service = (
    await (
      await page.request.post('/api/services', {
        headers: origin,
        data: {
          title: `Service ${stamp}`,
          slug: `service-${stamp}`,
          summary: 'Before.',
          _status: 'published',
        },
      })
    ).json()
  ).doc as { id: number }

  // The AI tool asks to connect and prints a link; the administrator approves it.
  const cli = spawn(process.execPath, ['scripts/ai.mjs', 'connect', 'live', base])
  let out = ''
  cli.stdout.on('data', (d) => (out += d))
  cli.stderr.on('data', (d) => (out += d))
  const exited = new Promise<number>((resolve) => cli.on('close', (code) => resolve(code ?? 1)))
  await expect.poll(() => /\/connect-ai\?code=/.test(out), { timeout: 20_000 }).toBe(true)
  const url = /(https?:\/\/\S+\/connect-ai\?code=\S+)/.exec(out)![1]
  const code = /Code: (\S+)/.exec(out)![1]
  await page.goto(url)
  await expect(page.getByText(code, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.getByText(/^Connected\./)).toBeVisible()
  expect(await exited).toBe(0)
  expect(out).toContain('AI edits are switched off')

  // Read-only until the owner allows edits.
  const requestFile = testInfo.outputPath('request.json')
  const send = (input: Record<string, unknown>) => {
    writeFileSync(requestFile, JSON.stringify(input))
    return bridge('request', 'live', requestFile)
  }
  const read = () => send({ action: 'read', collection: 'services', id: service.id })
  expect(() =>
    send({
      action: 'update',
      collection: 'services',
      id: service.id,
      data: { title: 'x' },
      expectedUpdatedAt: read().updatedAt,
    }),
  ).toThrow(/switched off/)

  await page.goto('/admin')
  const panel = page.getByRole('region', { name: 'AI editing' })
  await expect(panel.getByText('Read-only', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Allow edits for 1 day' }).click()
  await expect(panel.getByText(/^On until/)).toBeVisible()

  send({
    action: 'update',
    collection: 'services',
    id: service.id,
    data: { title: `AI title ${stamp}` },
    expectedUpdatedAt: read().updatedAt,
  })
  await page.reload()
  const change = panel.getByRole('listitem').filter({ hasText: `AI title ${stamp}` })
  await expect(change).toContainText('Changed Services')
  await change.getByRole('button', { name: 'Undo' }).click()
  await expect(panel.getByText(/^Undone/)).toBeVisible()
  expect(read().title).toBe(`Service ${stamp}`)

  // Off again, then disconnected: the key stops working.
  await panel.getByRole('button', { name: 'Turn off' }).click()
  await expect(panel.getByText('Read-only', { exact: true })).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await panel.getByRole('button', { name: 'Disconnect' }).click()
  await expect(panel.getByText('Not connected', { exact: true })).toBeVisible()
  expect(() => bridge('check')).toThrow(/not valid any more/)

  rmSync('.designos/ai-live.json', { force: true })
  await page.request.delete(`/api/services/${service.id}`, { headers: origin })
})
