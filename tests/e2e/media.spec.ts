import { test, expect, type Page } from '@playwright/test'
import sharp from 'sharp'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}
const png = (background: string) =>
  sharp({ create: { width: 16, height: 16, channels: 3, background } })
    .png()
    .toBuffer()

test('an image can be replaced in place and the library organised into folders', async ({
  page,
}) => {
  await login(page)
  const stamp = Date.now()
  const created = (await (
    await page.request.post('/api/media', {
      multipart: {
        file: { name: `replace-${stamp}.png`, mimeType: 'image/png', buffer: await png('#336699') },
        _payload: JSON.stringify({ alt: `Replace test ${stamp}` }),
      },
    })
  ).json()) as { doc: { id: number; filename: string } }
  const folder = (await (
    await page.request.post('/api/payload-folders', {
      data: { name: `Folder ${stamp}`, folderType: ['media'] },
    })
  ).json()) as { doc: { id: number } }
  try {
    // Replace image keeps the record (and every place that uses it) and swaps the file.
    await page.goto(`/admin/collections/media/${created.doc.id}`)
    await expect(page.getByText('Replace image', { exact: true })).toBeVisible()
    await page
      .locator('.dos-media-replace input[type=file]')
      .setInputFiles({
        name: `new-${stamp}.png`,
        mimeType: 'image/png',
        buffer: await png('#993366'),
      })
    await expect
      .poll(
        async () =>
          (
            (await (await page.request.get(`/api/media/${created.doc.id}?depth=0`)).json()) as {
              filename: string
            }
          ).filename,
      )
      .toBe(`new-${stamp}.png`)

    // Folders: move the image into one and find it by browsing.
    await page.request.patch(`/api/media/${created.doc.id}`, { data: { folder: folder.doc.id } })
    await page.goto('/admin/browse-by-folder')
    await page.getByText(`Folder ${stamp}`, { exact: true }).first().dblclick()
    await expect(page.getByText(`new-${stamp}.png`).first()).toBeVisible()
  } finally {
    await page.request.delete(`/api/media/${created.doc.id}`)
    await page.request.delete(`/api/payload-folders/${folder.doc.id}`)
  }
})
