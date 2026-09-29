import type { Payload, TypedUser } from 'payload'
import { auditSite, type SiteAuditInput } from './site-audit'
import { contentCollections } from './urls'

// Reads the editable workspace as `user` (normal access rules apply) and audits it.
export async function loadSiteAudit(payload: Payload, user: TypedUser) {
  const options = { user, overrideAccess: false, depth: 0, pagination: false } as const
  const documents = Object.fromEntries(
    await Promise.all(
      contentCollections.map(async (collection) => [
        collection,
        (await payload.find({ collection, draft: true, ...options })).docs,
      ]),
    ),
  ) as SiteAuditInput['documents']
  const [navigation, settings, searchProfile, media, redirects] = await Promise.all([
    payload.findGlobal({ slug: 'navigation', user, overrideAccess: false, depth: 0 }),
    payload.findGlobal({ slug: 'site-settings', user, overrideAccess: false, depth: 0 }),
    payload.findGlobal({ slug: 'search-profile', user, overrideAccess: false, depth: 0 }),
    payload.find({
      collection: 'media',
      select: { alt: true, decorative: true, filename: true },
      ...options,
    }),
    payload.find({ collection: 'redirects', select: { from: true, to: true }, ...options }),
  ])
  return auditSite({
    documents,
    navigation,
    settings: settings as unknown as Record<string, unknown>,
    searchProfile: searchProfile as unknown as Record<string, unknown>,
    media: media.docs,
    redirects: redirects.docs,
  })
}
