import type { Access, FieldAccess } from 'payload'

// AI accounts are read-only when marked so, or when the owner's "allow AI edits until" time has
// passed (live-site connections: see src/lib/ai-live).
export const readOnlyAI = (
  user:
    | { role?: string; aiReadOnly?: boolean | null; aiWriteUntil?: string | null }
    | null
    | undefined,
) =>
  user?.role === 'ai' &&
  (user.aiReadOnly === true ||
    (Boolean(user.aiWriteUntil) && new Date(user.aiWriteUntil!).getTime() <= Date.now()))

export const isAI = (user: { role?: string } | null | undefined) => user?.role === 'ai'
// Human sign-off fields (verification, approvals, factual review) are never writable by AI accounts.
export const humanField: FieldAccess = ({ req }) => Boolean(req.user) && !isAI(req.user)

// Uploads are public only once released: anonymous visitors can read files that belong to the
// current Live or Preview release, never the whole library or unreleased uploads.
export const releasedAsset =
  (collection: 'media' | 'fonts'): Access =>
  async ({ req }) => {
    if (req.user) return true
    const { publicAssetIDs } = await import('../../lib/release-assets')
    const ids = await publicAssetIDs(req.payload, collection)
    return ids.length ? { id: { in: ids } } : false
  }
export const staffField: FieldAccess = ({ req }) => Boolean(req.user)

export const authenticated: Access = ({ req }) => Boolean(req.user)
export const administrator: Access = ({ req }) => req.user?.role === 'admin'
export const adminField: FieldAccess = ({ req }) => req.user?.role === 'admin'
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
