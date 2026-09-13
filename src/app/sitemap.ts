import type { MetadataRoute } from 'next'
import { cms } from '@/lib/cms'
import { absoluteURL, contentCollections, contentPath } from '@/lib/urls'
import { indexable } from '@/lib/search/metadata'
export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_ENV !== 'production') return []
  const payload = await cms()
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
  return groups.flat()
}
