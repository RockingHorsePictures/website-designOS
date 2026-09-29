import { siteCMS, siteView } from '@/lib/site'
import type { MetadataRoute } from 'next'
import { absoluteURL, contentCollections, contentPath } from '@/lib/urls'
import { indexable } from '@/lib/search/metadata'
export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_ENV !== 'production' || (await siteView()) !== 'live') return []
  const payload = await siteCMS()
  const groups = await Promise.all(
    contentCollections.map(async (collection) => {
      const docs = []
      let page = 1
      while (true) {
        const result = await payload.find({
          collection,
          overrideAccess: false,
          draft: false,
          limit: 100,
          page,
          depth: 0,
        })
        docs.push(...result.docs)
        if (!result.hasNextPage) break
        page++
      }
      return docs
        .filter((doc) => indexable(doc, contentPath(collection, doc.slug)))
        .map((doc) => ({
          url: absoluteURL(contentPath(collection, doc.slug)),
          lastModified: doc.updatedAt,
        }))
    }),
  )
  const entries = groups.flat()
  // Index pages are listed when they have published records to show.
  for (const [index, collection] of [
    ['/services', 'services'],
    ['/case-studies', 'case-studies'],
  ] as const)
    if (entries.some((e) => e.url.startsWith(absoluteURL(`/${collection}/`))))
      entries.push({ url: absoluteURL(index) } as (typeof entries)[number])
  return entries
}
