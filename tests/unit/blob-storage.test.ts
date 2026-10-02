import { describe, it, expect, vi, beforeEach } from 'vitest'

const del = vi.fn()
vi.mock('@vercel/blob', () => ({
  del: (...args: unknown[]) => del(...args),
  put: vi.fn(),
  head: vi.fn(),
  BlobNotFoundError: class extends Error {},
}))
const released = new Set(['kept.png', 'kept-400x300.png'])
vi.mock('../../src/lib/release-assets', () => ({
  fileInAnyRelease: async (_payload: unknown, _collection: string, filename: string) =>
    released.has(filename),
}))

describe('Vercel Blob storage', () => {
  beforeEach(() => del.mockReset())

  it('never deletes a file a site release uses, and deletes everything else', async () => {
    const { vercelBlobStorage, blobStoreBaseURL } =
      await import('../../src/cms/storage/vercel-blob-oidc')
    expect(blobStoreBaseURL('store_AbC123')).toBe('https://abc123.public.blob.vercel-storage.com')
    const config = await vercelBlobStorage({ storeId: 'store_abc', token: 'secret' }, ['media'])({
      collections: [{ slug: 'media', upload: true, fields: [] }],
    } as never)
    const media = config.collections!.find((c) => c.slug === 'media')!
    const afterDelete = media.hooks!.afterDelete!
    const req = { payload: {}, context: {} }
    const doc = {
      filename: 'kept.png',
      sizes: { card: { filename: 'kept-400x300.png' }, thumb: { filename: 'gone-100x100.png' } },
    }
    for (const hook of afterDelete) await hook({ doc, req, collection: media } as never)
    expect(del).toHaveBeenCalledTimes(1)
    expect(del.mock.calls[0][0]).toBe('https://abc.public.blob.vercel-storage.com/gone-100x100.png')
    expect(del.mock.calls[0][1]).toEqual({ token: 'secret' })
  })
})
