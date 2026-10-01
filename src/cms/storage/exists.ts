import { existsSync } from 'node:fs'
import path from 'node:path'
import { BlobNotFoundError, head } from '@vercel/blob'
import type { Payload } from 'payload'
import { blobStoreBaseURL } from './vercel-blob-oidc'

// Whether an upload's file is really in storage (Vercel Blob with a token or OIDC, or the local
// folder). Used by content imports to confirm each file arrived and to repair missing ones.
export async function storedFileExists(
  payload: Payload,
  collection: string,
  filename: string,
  prefix = '',
): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const storeID = token ? token.split('_')[3] : process.env.BLOB_STORE_ID
  if (storeID) {
    const key = [prefix, filename].filter(Boolean).join('/')
    const url = `${blobStoreBaseURL(storeID)}/${key.split('/').map(encodeURIComponent).join('/')}`
    try {
      await head(url, token ? { token } : undefined)
      return true
    } catch (error) {
      if (error instanceof BlobNotFoundError) return false
      throw error
    }
  }
  const upload = payload.collections[collection as 'media']?.config.upload
  const dir = typeof upload === 'object' && upload.staticDir ? upload.staticDir : collection
  // A relative path resolves against the working directory at run time. Never build it from
  // process.cwd() here: Vercel's file tracing would then copy the whole project into the function.
  return existsSync(path.join(dir, prefix, filename))
}
