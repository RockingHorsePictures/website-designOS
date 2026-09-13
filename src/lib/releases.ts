import {
  APIError,
  createLocalReq,
  type Payload,
  type PayloadRequest,
  type CollectionSlug,
} from 'payload'
import { advisoryLock } from './transaction'
import { auditContent } from './quality'

export const releaseCollections = [
  'pages',
  'case-studies',
  'services',
  'team-members',
  'clients',
  'media',
  'fonts',
  'redirects',
] as const
export const releaseGlobals = ['theme', 'site-settings', 'navigation', 'search-profile'] as const
export type ReleaseCollection = (typeof releaseCollections)[number]
export type ReleaseGlobal = (typeof releaseGlobals)[number]
export type Snapshot = {
  version: 1
  collections: Record<ReleaseCollection, Record<string, unknown>[]>
  globals: Record<ReleaseGlobal, Record<string, unknown>>
}
const idOf = (value: unknown) =>
  typeof value === 'object' && value ? (value as { id: number }).id : value
export const releaseID = (value: unknown): number | null =>
  typeof idOf(value) === 'number' ? (idOf(value) as number) : null

// The same transaction lock is used by release operations and protected asset operations.
export async function releaseLock(req: PayloadRequest) {
  await advisoryLock(req, 742193801)
}
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['evidence', 'protection', 'aiAssisted', 'claimsReviewed'].includes(key))
      .map(([key, item]) => [key, clean(item)]),
  )
}
export async function captureSite(payload: Payload, req: PayloadRequest): Promise<Snapshot> {
  const snapshot: Snapshot = {
    version: 1,
    collections: {} as Snapshot['collections'],
    globals: {} as Snapshot['globals'],
  }
  for (const collection of releaseCollections) {
    const result = await payload.find({
      collection,
      pagination: false,
      depth: 0,
      draft: ['pages', 'case-studies', 'services'].includes(collection),
      req,
    })
    if (result.docs.length > 10000)
      throw new APIError('This site needs a larger release workflow before publishing.', 400)
    const docs = result.docs.filter(
      (doc) =>
        (!('active' in doc) || doc.active !== false) &&
        (!('includeInSite' in doc) || doc.includeInSite !== false),
    )
    if (['pages', 'case-studies', 'services'].includes(collection))
      for (const doc of docs) {
        const errors = auditContent(doc as Parameters<typeof auditContent>[0]).filter(
          (f) => f.level === 'blocker',
        )
        if (errors.length)
          throw new APIError(`${collection}: ${errors.map((e) => e.message).join(' ')}`, 400)
      }
    snapshot.collections[collection] = docs.map(
      (doc) =>
        clean({ ...doc, ...('_status' in doc ? { _status: 'published' } : {}) }) as Record<
          string,
          unknown
        >,
    )
  }
  if (!snapshot.collections.pages.some((doc) => doc.slug === 'home'))
    throw new APIError('Create a home page before saving a site Preview.', 400)
  for (const slug of releaseGlobals) {
    const value = await payload.findGlobal({ slug, depth: 0, req })
    snapshot.globals[slug] =
      slug === 'search-profile' && 'allowSearchCrawlers' in value
        ? {
            allowSearchCrawlers: value.allowSearchCrawlers,
            allowTrainingCrawlers: value.allowTrainingCrawlers,
          }
        : (clean(value) as Record<string, unknown>)
  }
  if (Buffer.byteLength(JSON.stringify(snapshot)) > 8 * 1024 * 1024)
    throw new APIError(
      'The release exceeds the 8 MB content limit. Split or reduce content before publishing.',
      400,
    )
  return snapshot
}
export async function changePublication(
  payload: Payload,
  user: NonNullable<PayloadRequest['user']>,
  action: string,
  expected: number | null,
) {
  if (!['admin', 'editor'].includes(user.role))
    throw new APIError('Only a person with an editor account can publish.', 403)
  const req = await createLocalReq({ user }, payload)
  req.transactionID =
    (await payload.db.beginTransaction({ isolationLevel: 'repeatable read' })) || undefined
  if (!req.transactionID) throw new Error('Publishing requires database transactions.')
  try {
    await releaseLock(req)
    const state = await payload.findGlobal({ slug: 'publication', depth: 0, req })
    if (action === 'preview') {
      if (releaseID(state.previewRelease) !== expected)
        throw new APIError('Preview changed in another session. Refresh before saving.', 409)
      const snapshot = await captureSite(payload, req)
      const release = await payload.create({
        collection: 'site-releases',
        data: {
          label: `Site preview — ${new Date().toISOString()}`,
          formatVersion: 1,
          snapshot,
          createdBy: user.email,
        },
        req,
      })
      await payload.updateGlobal({ slug: 'publication', data: { previewRelease: release.id }, req })
    } else if (action === 'publish') {
      if (!expected || releaseID(state.previewRelease) !== expected)
        throw new APIError('Preview changed. Review the current Preview before publishing.', 409)
      await payload.updateGlobal({
        slug: 'publication',
        data: {
          liveRelease: expected,
          liveChangedAt: new Date().toISOString(),
          changedBy: user.email,
        },
        req,
      })
    } else if (action === 'unpublish') {
      if (releaseID(state.liveRelease) !== expected)
        throw new APIError('Live changed in another session. Refresh first.', 409)
      await payload.updateGlobal({
        slug: 'publication',
        data: { liveRelease: null, liveChangedAt: new Date().toISOString(), changedBy: user.email },
        req,
      })
    } else throw new APIError('Unknown publication action.', 400)
    await payload.db.commitTransaction(await req.transactionID)
  } catch (error) {
    await payload.db.rollbackTransaction(await req.transactionID)
    throw error
  }
}
export async function protectReleasedAsset(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: unknown,
) {
  await releaseLock(req)
  for (const slug of ['theme', 'site-settings'] as const) {
    const settings = await req.payload.findGlobal({ slug, depth: 0, req })
    const policies = settings.protection as Record<string, { state: string }> | undefined
    const keys =
      collection === 'fonts'
        ? ['bodyFontFiles', 'headingFontFiles']
        : ['logo', 'inverseLogo', 'siteIcon', 'defaultShareImage']
    for (const key of keys) {
      const value = (settings as unknown as Record<string, unknown>)[key]
      if (
        policies?.[key]?.state === 'locked' &&
        (Array.isArray(value) ? value : [value]).includes(Number(id))
      )
        throw new APIError(
          'This asset is selected by a locked brand field. Ask its owner to unlock that field before replacing it.',
          423,
        )
    }
  }
  const found = await req.payload.find({
    collection: 'site-releases',
    pagination: false,
    depth: 0,
    req,
  })
  if (
    found.docs.some((release) => {
      const snapshot = release.snapshot as Snapshot
      return snapshot.collections?.[collection as ReleaseCollection]?.some(
        (doc) => doc.id === Number(id),
      )
    })
  )
    throw new APIError(
      'This file is retained by a site release. Upload a new file instead; existing releases keep their original assets.',
      409,
    )
}
