import { siteCMS, siteLocales, siteView } from '@/lib/site'
import type { MetadataRoute } from 'next'
import { absoluteURL, contentCollections, contentPath } from '@/lib/urls'
import { indexable } from '@/lib/search/metadata'
import { localePath } from '@/lib/locales'
export const dynamic = 'force-dynamic'

// Every indexable page of the Live release, once per published language, with hreflang
// alternates so search engines connect the translations.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_ENV !== 'production' || (await siteView()) !== 'live') return []
  const payload = await siteCMS()
  const locales = await siteLocales()
  const entries: { path: string; lastModified?: string }[] = []
  for (const collection of contentCollections) {
    const { docs } = await payload.find({
      collection,
      overrideAccess: false,
      draft: false,
      limit: 10000,
      depth: 0,
    })
    const visible = docs.filter((doc) => indexable(doc, contentPath(collection, doc.slug)))
    for (const doc of visible)
      entries.push({ path: contentPath(collection, doc.slug), lastModified: doc.updatedAt })
    if (collection === 'services' && visible.length) entries.push({ path: '/services' })
    if (collection === 'case-studies' && visible.length) entries.push({ path: '/case-studies' })
    if (collection === 'posts' && visible.length) {
      entries.push({ path: '/blog' })
      const { docs: categories } = await payload.find({
        collection: 'categories',
        overrideAccess: false,
        limit: 500,
        depth: 0,
      })
      for (const c of categories) entries.push({ path: `/blog/category/${c.slug}` })
    }
  }
  return entries.flatMap((entry) =>
    locales.map((locale) => ({
      url: absoluteURL(localePath(entry.path, locale)),
      ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
      ...(locales.length > 1
        ? {
            alternates: {
              languages: Object.fromEntries(
                locales.map((l) => [l, absoluteURL(localePath(entry.path, l))]),
              ),
            },
          }
        : {}),
    })),
  )
}
