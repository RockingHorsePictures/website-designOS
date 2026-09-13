import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
} from 'payload'
import { auditContent } from '../../lib/quality'
import { contentPath, type ContentCollection } from '../../lib/urls'
import { notifyIndexNow } from '../../lib/search/indexnow'

export const beforePublish: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  collection,
}) => {
  const merged = { ...originalDoc, ...data }
  if (
    collection.slug === 'pages' &&
    ['admin', 'api', 'editor', 'services', 'case-studies', 'team', 'robots', 'sitemap'].includes(
      merged.slug,
    )
  )
    throw new APIError('This URL is reserved by the application.', 400)
  if (merged._status === 'published' && req.query?.draft !== true && req.query?.draft !== 'true') {
    const blockers = auditContent(merged).filter((f) => f.level === 'blocker')
    if (blockers.length) throw new APIError(blockers.map((b) => b.message).join(' '), 400)
    if (!merged.publishedAt) data.publishedAt = new Date().toISOString()
  }
  return data
}
export const afterContentChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  collection,
  req,
}) => {
  // Draft saves must never affect public redirects or discovery notifications.
  if (req.query?.draft === true || req.query?.draft === 'true') return doc
  if (doc._status !== 'published') {
    if (previousDoc?._status === 'published')
      await notifyIndexNow(
        [contentPath(collection.slug as ContentCollection, previousDoc.slug)],
        req.payload.logger,
      )
    return doc
  }
  const slug = collection.slug as ContentCollection
  const current = contentPath(slug, doc.slug)
  if (previousDoc?.slug && previousDoc.slug !== doc.slug && previousDoc._status === 'published') {
    const from = contentPath(slug, previousDoc.slug)
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
  }
  await notifyIndexNow([current], req.payload.logger)
  return doc
}
export const afterContentDelete: CollectionAfterDeleteHook = async ({ doc, collection, req }) => {
  if (doc._status === 'published')
    await notifyIndexNow(
      [contentPath(collection.slug as ContentCollection, doc.slug)],
      req.payload.logger,
    )
  return doc
}
