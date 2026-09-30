import { siteCMS, siteSnapshot, siteLocale, siteView } from '@/lib/site'
import { absoluteURL } from '@/lib/urls'
import { localePath } from '@/lib/locales'
import { indexable } from '@/lib/search/metadata'
import { blogPosts } from '@/components/site/Blog'

export const dynamic = 'force-dynamic'
const xml = (value: unknown) =>
  String(value ?? '').replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  )

// RSS 2.0 feed of the latest 30 published posts in the request language.
export async function GET() {
  if (!(await siteSnapshot())) return new Response('Not found', { status: 404 })
  const locale = await siteLocale()
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const production = process.env.SITE_ENV === 'production' && (await siteView()) === 'live'
  const posts = (await blogPosts())
    .filter((p) => !production || indexable(p, `/blog/${p.slug}`, true))
    .slice(0, 30)
  const link = absoluteURL(localePath('/blog', locale))
  const items = posts
    .map((p) => {
      const url = absoluteURL(localePath(`/blog/${p.slug}`, locale))
      const date = new Date(p.date || p.publishedAt || p.createdAt).toUTCString()
      return `<item><title>${xml(p.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><pubDate>${date}</pubDate><description>${xml(p.seo?.description || p.summary)}</description></item>`
    })
    .join('')
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(settings.companyName)}</title><link>${xml(link)}</link><description>${xml(settings.description || settings.companyName)}</description><language>${xml(locale)}</language><atom:link href="${xml(absoluteURL(localePath('/blog/feed.xml', locale)))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      ...(production ? {} : { 'X-Robots-Tag': 'noindex' }),
    },
  })
}
