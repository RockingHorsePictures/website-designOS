import { expect, type Page } from '@playwright/test'
export async function publishWorkspace(page: Page) {
  const headers = { Origin: new URL(page.url()).origin }
  let state = await (await page.request.get('/api/publication')).json()
  const preview = await page.request.post('/api/publication', {
    headers,
    data: { action: 'preview', expected: state.preview },
  })
  expect(preview.ok(), await preview.text()).toBe(true)
  state = await (await page.request.get('/api/publication')).json()
  const live = await page.request.post('/api/publication', {
    headers,
    data: { action: 'publish', expected: state.preview },
  })
  expect(live.ok(), await live.text()).toBe(true)
}
export async function openWorkspacePreview(page: Page) {
  const home = await (await page.request.get('/api/pages?where[slug][equals]=home')).json()
  await page.goto(`/api/preview?collection=pages&id=${home.docs[0].id}`)
}
