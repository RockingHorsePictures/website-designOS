import { siteCMS } from '@/lib/site'
import { SiteLink as Link } from '@/components/site/SiteLink'

// Editable in Site Settings → Page not found. Offers search and the main navigation.
export default async function NotFound() {
  const payload = await siteCMS()
  const [settings, navigation] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }).catch(() => null),
    payload.findGlobal({ slug: 'navigation' }).catch(() => null),
  ])
  const copy = (settings as { notFound?: { heading?: string; message?: string } } | null)?.notFound
  return (
    <section className="not-found">
      <h1>{copy?.heading || 'Page not found'}</h1>
      <p>{copy?.message || 'The page you were looking for has moved or no longer exists.'}</p>
      <form role="search" method="get" action="/search" className="site-search">
        <label htmlFor="not-found-q">Search this site</label>
        <input id="not-found-q" name="q" type="search" maxLength={120} />
        <button type="submit">Search</button>
      </form>
      <nav aria-label="Suggested pages">
        <Link href="/">Home</Link>
        {(
          navigation as { primary?: { id?: string; label: string; url: string }[] } | null
        )?.primary?.map((l) => (
          <Link key={l.id || l.url} href={l.url}>
            {l.label}
          </Link>
        ))}
      </nav>
    </section>
  )
}
