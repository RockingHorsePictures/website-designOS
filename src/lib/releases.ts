import {
  APIError,
  createLocalReq,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { codePreview, codePreviewMessage } from './code-preview'
import { advisoryLock } from './transaction'
import { auditContent } from './quality'
import { indexable } from './search/metadata'
import { collectAssets } from './release-assets'
import { notifyIndexNow } from './search/indexnow'
import { contentCollections, contentPath } from './urls'
import { defaultLocale, enabledLocales } from './locales'

export const releaseCollections = [
  'pages',
  'posts',
  'categories',
  'blocks',
  'forms',
  'case-studies',
  'services',
  'team-members',
  'clients',
  'media',
  'fonts',
  'redirects',
] as const
export const releaseGlobals = ['theme', 'site-settings', 'navigation', 'search-profile'] as const
const draftCollections = ['pages', 'posts', 'case-studies', 'services']
export type ReleaseCollection = (typeof releaseCollections)[number]
export type ReleaseGlobal = (typeof releaseGlobals)[number]
export type SnapshotBody = {
  collections: Record<ReleaseCollection, Record<string, unknown>[]>
  globals: Record<ReleaseGlobal, Record<string, unknown>>
}
// Format 1 stays readable by older app versions: the main language is the top-level body, and
// each additional language is a complete body under `translations` (fallbacks already applied).
export type Snapshot = SnapshotBody & {
  version: 1
  locale?: string
  translations?: Partial<Record<string, SnapshotBody>>
}
const idOf = (value: unknown) =>
  typeof value === 'object' && value ? (value as { id: number }).id : value
export const releaseID = (value: unknown): number | null =>
  typeof idOf(value) === 'number' ? (idOf(value) as number) : null

// The same transaction lock is used by release operations and protected asset operations.
export async function releaseLock(req: PayloadRequest) {
  await advisoryLock(req, 742193801)
}
// Internal evidence, approval records and delivery settings never enter a public release.
const privateKeys = new Set([
  'evidence',
  'protection',
  'aiAssisted',
  'claimsReviewed',
  'context',
  'altSource',
  'notify',
  'webhookURL',
  'webhookSecret',
  'storeSubmissions',
])
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !privateKeys.has(key))
      .map(([key, item]) => [key, clean(item)]),
  )
}
async function captureBody(
  payload: Payload,
  req: PayloadRequest,
  locale: string,
  audit: boolean,
): Promise<SnapshotBody> {
  const body = { collections: {}, globals: {} } as SnapshotBody
  for (const collection of releaseCollections) {
    const result = await payload.find({
      collection,
      pagination: false,
      depth: 0,
      draft: draftCollections.includes(collection),
      locale: locale as never,
      fallbackLocale: defaultLocale as never,
      req,
    })
    if (result.docs.length > 10000)
      throw new APIError('This site needs a larger release workflow before publishing.', 400)
    const docs = (result.docs as unknown as Record<string, unknown>[]).filter(
      (doc) => doc.active !== false && doc.includeInSite !== false && doc.isTemplate !== true,
    )
    if (audit && draftCollections.includes(collection))
      for (const doc of docs) {
        const errors = auditContent(doc as Parameters<typeof auditContent>[0]).filter(
          (f) => f.level === 'blocker',
        )
        if (errors.length)
          throw new APIError(`${collection}: ${errors.map((e) => e.message).join(' ')}`, 400)
      }
    body.collections[collection] = docs.map(
      (doc) =>
        clean({ ...doc, ...('_status' in doc ? { _status: 'published' } : {}) }) as Record<
          string,
          unknown
        >,
    )
  }
  for (const slug of releaseGlobals) {
    const value = await payload.findGlobal({
      slug,
      depth: 0,
      locale: locale as never,
      fallbackLocale: defaultLocale as never,
      req,
    })
    body.globals[slug] =
      slug === 'search-profile' && 'allowSearchCrawlers' in value
        ? {
            allowSearchCrawlers: value.allowSearchCrawlers,
            allowAnswerEngines: value.allowAnswerEngines,
            allowTrainingCrawlers: value.allowTrainingCrawlers,
          }
        : (clean(value) as Record<string, unknown>)
  }
  return body
}
export async function captureSite(payload: Payload, req: PayloadRequest): Promise<Snapshot> {
  // Page passwords are kept as hashes inside releases so protected pages can be checked.
  req.context.designosCapture = true
  const main = await captureBody(payload, req, defaultLocale, true)
  const snapshot: Snapshot = { version: 1, locale: defaultLocale, ...main }
  const languages = enabledLocales(main.globals['site-settings']).filter((l) => l !== defaultLocale)
  if (languages.length) {
    snapshot.translations = {}
    for (const locale of languages)
      snapshot.translations[locale] = await captureBody(payload, req, locale, false)
  }
  if (!main.collections.pages.some((doc) => doc.slug === 'home'))
    throw new APIError('Create a home page before saving a site Preview.', 400)
  // Keep only the uploads that released content uses (and that visitors may therefore fetch).
  const bodies = [main, ...Object.values(snapshot.translations || {})] as SnapshotBody[]
  const found = { media: new Set<number>(), fonts: new Set<number>() }
  for (const body of bodies) {
    for (const collection of releaseCollections)
      if (collection !== 'media' && collection !== 'fonts')
        for (const doc of body.collections[collection])
          collectAssets(doc, payload.collections[collection].config.fields, found)
    for (const slug of releaseGlobals)
      collectAssets(
        body.globals[slug],
        payload.config.globals.find((g) => g.slug === slug)!.fields,
        found,
      )
  }
  for (const body of bodies)
    for (const collection of ['media', 'fonts'] as const)
      body.collections[collection] = body.collections[collection].filter((doc) =>
        found[collection].has(Number(doc.id)),
      )
  if (Buffer.byteLength(JSON.stringify(snapshot)) > 8 * 1024 * 1024)
    throw new APIError(
      'The release exceeds the 8 MB content limit. Split or reduce content before publishing.',
      400,
    )
  return snapshot
}
// Indexable public paths in a snapshot, with a change marker for each.
export function releasePaths(snapshot: Snapshot | null | undefined): Map<string, string> {
  const out = new Map<string, string>()
  for (const collection of contentCollections)
    for (const doc of snapshot?.collections?.[collection] || []) {
      const path = contentPath(collection, String(doc.slug))
      if (indexable(doc as Parameters<typeof indexable>[0], path, true))
        out.set(path, String(doc.updatedAt ?? ''))
    }
  return out
}
// Paths search engines should re-crawl when Live moves from one release to another.
export function changedPaths(before: Snapshot | null, after: Snapshot | null): string[] {
  const old = releasePaths(before)
  const next = releasePaths(after)
  const changed = [...next].filter(([path, marker]) => old.get(path) !== marker).map(([p]) => p)
  const removed = [...old.keys()].filter((path) => !next.has(path))
  return [...changed, ...removed]
}
async function releaseSnapshot(payload: Payload, req: PayloadRequest, value: unknown) {
  const id = releaseID(value)
  if (!id) return null
  const release = await payload.findByID({ collection: 'site-releases', id, depth: 0, req })
  return release.snapshot as Snapshot
}
// The Live or Preview release outside a page request (for example in API routes).
export async function currentSnapshot(payload: Payload, channel: 'live' | 'preview') {
  const state = await payload.findGlobal({ slug: 'publication', depth: 0 })
  const id = releaseID(channel === 'preview' ? state.previewRelease : state.liveRelease)
  if (!id) return null
  const release = await payload.findByID({ collection: 'site-releases', id, depth: 0 })
  return release.snapshot as Snapshot
}
export async function changePublication(
  payload: Payload,
  user: NonNullable<PayloadRequest['user']>,
  action: string,
  expected: number | null,
) {
  if (codePreview()) throw new APIError(codePreviewMessage(), 403)
  if (!['admin', 'editor'].includes(user.role))
    throw new APIError('Only a person with an editor account can publish.', 403)
  const req = await createLocalReq({ user }, payload)
  req.transactionID =
    (await payload.db.beginTransaction({ isolationLevel: 'repeatable read' })) || undefined
  if (!req.transactionID) throw new Error('Publishing requires database transactions.')
  let notify: string[] = []
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
      notify = changedPaths(
        await releaseSnapshot(payload, req, state.liveRelease),
        await releaseSnapshot(payload, req, expected),
      )
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
      notify = changedPaths(await releaseSnapshot(payload, req, state.liveRelease), null)
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
  // Best-effort and after commit: discovery pings never block or undo a publication.
  if (notify.length) await notifyIndexNow(notify.slice(0, 10000), payload.logger)
}
// An image or font chosen in a locked brand field (logo, icon, share image, font files) can't be
// changed or deleted until its owner unlocks that field.
export async function protectBrandAsset(
  req: PayloadRequest,
  collection: 'media' | 'fonts',
  id: unknown,
) {
  // Waits for a release being saved, so it never records a file that is being deleted.
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
          'This asset is selected by a locked brand field. Ask its owner to unlock that field before changing it.',
          423,
        )
    }
  }
}
