import type { MetadataRoute } from 'next'
import { cms } from '@/lib/cms'
import { absoluteURL } from '@/lib/urls'
export const dynamic = 'force-dynamic'
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (process.env.SITE_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } }
  const profile = await (await cms()).findGlobal({ slug: 'search-profile' })
  const privatePaths = ['/admin', '/api', '/editor']
  return {
    rules: [
      {
        userAgent: '*',
        ...(profile.allowSearchCrawlers
          ? { allow: '/', disallow: privatePaths }
          : { disallow: '/' }),
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended'],
        ...(profile.allowTrainingCrawlers
          ? { allow: '/', disallow: privatePaths }
          : { disallow: '/' }),
      },
    ],
    sitemap: absoluteURL('/sitemap.xml'),
  }
}
