import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, del, head, put } from '@vercel/blob'
import type { Config, Plugin } from 'payload'
import { fileInAnyRelease } from '../../lib/release-assets'

// Vercel Blob storage for uploads (public files at <store>.public.blob.vercel-storage.com). It
// authenticates with a BLOB_READ_WRITE_TOKEN or, for stores connected by the Deploy Button, with
// BLOB_STORE_ID and the deployment's OIDC identity.
//
// Files a site release still uses are never deleted: replacing an image keeps its old file for the
// releases that show it (see src/lib/release-assets.ts).
const cacheControlMaxAge = 60 * 60 * 24 * 365

export const blobStoreBaseURL = (storeId: string) =>
  `https://${storeId.replace(/^store_/, '').toLowerCase()}.public.blob.vercel-storage.com`

function adapter(baseURL: string, token?: string): Adapter {
  const auth = token ? { token } : {}
  const key = (filename: string, docPrefix = '', collectionPrefix = '') =>
    getFileKey({ collectionPrefix, docPrefix, filename }).fileKey
  const url = (fileKey: string) => {
    const [dir, name] = [fileKey.split('/').slice(0, -1), fileKey.split('/').at(-1) || '']
    return `${baseURL}/${[...dir, encodeURIComponent(name)].join('/')}`
  }
  return ({ collection, prefix = '' }) => ({
    name: 'vercel-blob',
    generateURL: ({ filename, prefix: docPrefix = '' }) => url(key(filename, docPrefix, prefix)),
    handleUpload: async ({ data, file }) => {
      await put(key(file.filename, data.prefix, prefix), file.buffer, {
        ...auth,
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge,
        contentType: file.mimeType,
      })
      return data
    },
    handleDelete: async ({ doc, filename, req }) => {
      if (
        (collection.slug === 'media' || collection.slug === 'fonts') &&
        (await fileInAnyRelease(req.payload, collection.slug, filename))
      )
        return
      await del(url(key(filename, doc.prefix, prefix)), auth)
    },
    // Payload checks read access (released files only) before calling this.
    staticHandler: async (req, { params: { filename, prefix: docPrefix = '' } }) => {
      const fileURL = url(key(filename, docPrefix, prefix))
      try {
        const meta = await head(fileURL, auth)
        const response = await fetch(`${fileURL}?${meta.uploadedAt.toISOString()}`, {
          headers: { 'Cache-Control': 'no-store' },
        })
        if (!response.ok || !response.body) return new Response(null, { status: 404 })
        return new Response(response.body, {
          headers: {
            'Cache-Control': `public, max-age=${cacheControlMaxAge}`,
            'Content-Type': meta.contentType,
            'Content-Disposition': meta.contentDisposition,
            'Last-Modified': meta.uploadedAt.toUTCString(),
          },
        })
      } catch (error) {
        if (error instanceof BlobNotFoundError) return new Response(null, { status: 404 })
        req.payload.logger.error({ err: error, msg: 'Blob file could not be served' })
        return new Response('Internal Server Error', { status: 500 })
      }
    },
  })
}

export function vercelBlobStorage(
  options: { storeId: string; token?: string },
  collections: string[],
): Plugin {
  const generated = adapter(blobStoreBaseURL(options.storeId), options.token)
  return (config: Config) =>
    cloudStoragePlugin({
      collections: Object.fromEntries(collections.map((slug) => [slug, { adapter: generated }])),
    })({
      ...config,
      collections: (config.collections || []).map((collection) =>
        collections.includes(collection.slug)
          ? {
              ...collection,
              upload: {
                ...(typeof collection.upload === 'object' ? collection.upload : {}),
                disableLocalStorage: true,
              },
            }
          : collection,
      ),
    })
}
