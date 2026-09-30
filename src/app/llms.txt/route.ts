import { siteCMS, siteView, siteSnapshot, siteLocale } from '@/lib/site'
import { localePath } from '@/lib/locales'
import { absoluteURL, contentCollections, contentPath } from '@/lib/urls'
import { indexable } from '@/lib/search/metadata'

export const dynamic = 'force-dynamic'
const headings = {
  pages: 'Pages',
  services: 'Services',
  'case-studies': 'Case studies',
  posts: 'Blog',
} as const

// llms.txt (https://llmstxt.org): a plain-language map of the public site for AI answer engines.
// Built from the same release as the website, so it only lists what visitors can see.
export async function GET() {
  const view = await siteView()
  const production = process.env.SITE_ENV === 'production' && view === 'live'
  const snapshot = await siteSnapshot()
  const payload = await siteCMS()
  const profile = await payload.findGlobal({ slug: 'search-profile' })
  if (!snapshot || (production && profile.allowAnswerEngines === false))
    return new Response('Not found', { status: 404 })
  const settings = await payload.findGlobal({ slug: 'site-settings' })
  const lines = [`# ${settings.companyName}`, '']
  if (settings.description) lines.push(`> ${settings.description.replace(/\s+/g, ' ')}`, '')
  for (const collection of contentCollections) {
    const { docs } = await payload.find({
      collection,
      overrideAccess: false,
      draft: false,
      limit: 500,
      depth: 0,
      sort: 'order',
    })
    const entries = docs.filter((doc) =>
      indexable(
        production ? doc : { ...doc, demo: false },
        contentPath(collection, doc.slug),
        true,
      ),
    )
    if (!entries.length) continue
    lines.push(`## ${headings[collection]}`, '')
    for (const doc of entries)
      lines.push(
        `- [${doc.title}](${absoluteURL(localePath(contentPath(collection, doc.slug), await siteLocale()))}): ${(doc.seo?.description || doc.summary || '').replace(/\s+/g, ' ')}`,
      )
    lines.push('')
  }
  const contact = [
    settings.email && `Email: ${settings.email}`,
    settings.phone && `Phone: ${settings.phone}`,
  ]
  if (contact.some(Boolean))
    lines.push('## Contact', '', ...contact.filter(Boolean).map((c) => `- ${c}`), '')
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(production ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
    },
  })
}
