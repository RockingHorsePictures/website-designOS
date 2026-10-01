import { test, expect, type Page } from '@playwright/test'
import { writeBundle } from '../../src/lib/content-transfer/bundle'

// 1×1 PNG.
const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)
async function login(page: Page) {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test('administrators import a content bundle into the workspace with links reconnected', async ({
  page,
}, testInfo) => {
  const stamp = `e2e${Date.now()}`
  const zip = writeBundle({
    manifest: {
      format: 'designos-content',
      version: 1,
      designos: '0.0.0',
      exportedAt: new Date().toISOString(),
      source: 'local',
      defaultLocale: 'en',
      locales: ['en'],
      collections: { media: 1, clients: 1, services: 1 },
      globals: [],
      skippedDemo: {},
    },
    records: {
      media: {
        en: [
          {
            id: 901,
            alt: 'Imported image',
            filename: `${stamp}.png`,
            mimeType: 'image/png',
            filesize: png.byteLength,
          },
        ],
      },
      clients: { en: [{ id: 902, name: `Client ${stamp}`, logo: 901 }] },
      services: {
        en: [
          {
            id: 903,
            title: `Service ${stamp}`,
            slug: `service-${stamp}`,
            summary: 'Imported in a browser test.',
            heroMedia: { image: 901 },
            _status: 'published',
          },
        ],
      },
    },
    globals: {},
    files: { 'media/901': { name: `${stamp}.png`, data: png } },
  })
  const file = testInfo.outputPath(`${stamp}.zip`)
  await (await import('node:fs/promises')).writeFile(file, zip)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await login(page)
  await page.getByRole('button', { name: /Import content/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Import content' })
  await dialog.getByLabel('Content bundle (.zip)').setInputFiles(file)
  await expect(dialog.getByRole('rowheader', { name: 'Clients' })).toBeVisible()
  // Never remove the shared demo content in tests.
  await dialog.getByLabel(/Remove demo content/).uncheck()
  await dialog.screenshot({ path: testInfo.outputPath('review.png') })
  await dialog.getByRole('button', { name: 'Import into workspace' }).click()
  await expect(dialog.getByText(/Import complete/)).toBeVisible({ timeout: 30000 })
  await expect(dialog.getByText('Clients: 1 added')).toBeVisible()
  await dialog.screenshot({ path: testInfo.outputPath('done.png') })

  const get = async (path: string) => (await page.request.get(path)).json()
  const client = (await get(`/api/clients?where[name][equals]=Client%20${stamp}&depth=0`)).docs[0]
  const service = (
    await get(`/api/services?where[slug][equals]=service-${stamp}&depth=0&draft=true`)
  ).docs[0]
  const media = (await get(`/api/media/${client.logo}?depth=0`)) as { id: number; filename: string }
  expect(media.id).not.toBe(901)
  expect(media.filename).toContain(stamp)
  expect(service.heroMedia.image).toBe(media.id)
  expect(service._status).toBe('published')

  const headers = { Origin: new URL(page.url()).origin }
  for (const path of [
    `/api/services/${service.id}`,
    `/api/clients/${client.id}`,
    `/api/media/${media.id}`,
  ])
    await page.request.delete(path, { headers })
})
