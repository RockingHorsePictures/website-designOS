import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
} from 'payload'
import { auditContent } from '../../lib/quality'
import { contentPath, reservedSlugs, type ContentCollection } from '../../lib/urls'

export const beforePublish: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  collection,
}) => {
  const merged = { ...originalDoc, ...data }
  if (collection.slug === 'pages' && reservedSlugs.includes(merged.slug))
    throw new APIError('This URL is reserved by the application.', 400)
  if (merged._status === 'published' && req.query?.draft !== true && req.query?.draft !== 'true') {
    const blockers = auditContent(merged).filter((f) => f.level === 'blocker')
    if (blockers.length) throw new APIError(blockers.map((b) => b.message).join(' '), 400)
    if (!merged.publishedAt) data.publishedAt = new Date().toISOString()
  }
  return data
}
// Search engines are notified when a release goes Live (see lib/releases.ts), not on workspace
// saves. Slug changes record a workspace redirect that ships with the next release.
export const afterContentChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  collection,
  req,
}) => {
  if (doc._status !== 'published' || previousDoc?._status !== 'published') return doc
  if (!previousDoc?.slug || previousDoc.slug === doc.slug) return doc
  const slug = collection.slug as ContentCollection
  const current = contentPath(slug, doc.slug)
  const from = contentPath(slug, previousDoc.slug)
  // The new path is real content again, so a stale redirect away from it must go (rename a, b, a).
  await req.payload.delete({ collection: 'redirects', where: { from: { equals: current } }, req })
  // Collapse chains: anything that pointed at the old path now points straight at the new one.
  await req.payload.update({
    collection: 'redirects',
    where: { to: { equals: from } },
    data: { to: current },
    req,
  })
  const existing = await req.payload.find({
    collection: 'redirects',
    where: { from: { equals: from } },
    limit: 1,
    req,
  })
  if (existing.docs[0])
    await req.payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      data: { to: current },
      req,
    })
  else
    await req.payload.create({
      collection: 'redirects',
      data: { from, to: current, reason: 'Published URL changed' },
      req,
    })
  return doc
}
export const afterContentDelete: CollectionAfterDeleteHook = async ({ doc }) => doc
