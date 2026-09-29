import { siteCMS, siteView, siteSnapshot } from '@/lib/site'
import type { MetadataRoute } from 'next'
import { absoluteURL } from '@/lib/urls'
import { answerEngineAgents, privatePaths, trainingAgents } from '@/lib/search/crawlers'
export const dynamic = 'force-dynamic'
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (
    process.env.SITE_ENV !== 'production' ||
    (await siteView()) !== 'live' ||
    !(await siteSnapshot())
  )
    return { rules: { userAgent: '*', disallow: '/' } }
  const profile = await (await siteCMS()).findGlobal({ slug: 'search-profile' })
  const rule = (allowed: unknown) =>
    allowed ? { allow: '/', disallow: privatePaths } : { disallow: '/' }
  // Each crawler follows its most specific group, so the three policies stay independent.
  return {
    rules: [
      { userAgent: '*', ...rule(profile.allowSearchCrawlers) },
      { userAgent: answerEngineAgents, ...rule(profile.allowAnswerEngines ?? true) },
      { userAgent: trainingAgents, ...rule(profile.allowTrainingCrawlers) },
    ],
    sitemap: absoluteURL('/sitemap.xml'),
  }
}
