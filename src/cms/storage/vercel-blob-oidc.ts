import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, del, head, put } from '@vercel/blob'
import type { Config, Plugin } from 'payload'

// Vercel Blob stores connected by the Deploy Button (or the current dashboard) provide
// BLOB_STORE_ID and authenticate with the deployment's OIDC token instead of a
// BLOB_READ_WRITE_TOKEN. Payload's adapter only accepts tokens, so this is the same storage
// behaviour (public files at <store>.public.blob.vercel-storage.com) using OIDC credentials.
const cacheControlMaxAge = 60 * 60 * 24 * 365

export const blobStoreBaseURL = (storeId: string) =>
  `https://${storeId.replace(/^store_/, '').toLowerCase()}.public.blob.vercel-storage.com`

function adapter(baseURL: string): Adapter {
  const key = (filename: string, docPrefix = '', collectionPrefix = '') =>
    getFileKey({ collectionPrefix, docPrefix, filename }).fileKey
  const url = (fileKey: string) => {
    const [dir, name] = [fileKey.split('/').slice(0, -1), fileKey.split('/').at(-1) || '']
    return `${baseURL}/${[...dir, encodeURIComponent(name)].join('/')}`
  }
  return ({ prefix = '' }) => ({
    name: 'vercel-blob-oidc',
    generateURL: ({ filename, prefix: docPrefix = '' }) => url(key(filename, docPrefix, prefix)),
    handleUpload: async ({ data, file }) => {
      await put(key(file.filename, data.prefix, prefix), file.buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge,
        contentType: file.mimeType,
      })
      return data
    },
    handleDelete: async ({ doc, filename }) => {
      await del(url(key(filename, doc.prefix, prefix)))
    },
    // Payload checks read access (released files only) before calling this.
    staticHandler: async (req, { params: { filename, prefix: docPrefix = '' } }) => {
      const fileURL = url(key(filename, docPrefix, prefix))
      try {
        const meta = await head(fileURL)
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

export function vercelBlobOIDCStorage(storeId: string, collections: string[]): Plugin {
  const generated = adapter(blobStoreBaseURL(storeId))
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
