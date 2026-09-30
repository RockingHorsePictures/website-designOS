import type { Metadata } from 'next'
import { siteCMS, requireLocale } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { SiteLink as Link } from '@/components/site/SiteLink'
import { contentCollections } from '@/lib/urls'
import { searchDocuments } from '@/lib/site-search'

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }
type Props = { searchParams: Promise<{ q?: string }> }

// Searches the published site (or the workspace in draft preview).
export default async function Search({ searchParams }: Props) {
  await requireLocale()
  const q = String((await searchParams).q || '').slice(0, 120)
  const payload = await siteCMS()
  const user = await previewUser()
  const docs = q
    ? (
        await Promise.all(
          contentCollections.map(async (collection) =>
            (
              await payload.find({
                collection,
                overrideAccess: false,
                user,
                draft: Boolean(user),
                limit: 2000,
                depth: 0,
              })
            ).docs.map((doc) => ({ collection, doc: doc as unknown as Record<string, unknown> })),
          ),
        )
      ).flat()
    : []
  const hits = searchDocuments(q, docs)
  return (
    <section className="search-page">
      <h1>Search</h1>
      <form role="search" method="get" className="site-search">
        <label htmlFor="search-q">Search this site</label>
        <input id="search-q" name="q" type="search" defaultValue={q} maxLength={120} />
        <button type="submit">Search</button>
      </form>
      {q && (
        <p role="status">
          {hits.length
            ? `${hits.length} result${hits.length === 1 ? '' : 's'} for “${q}”`
            : `No results for “${q}”.`}
        </p>
      )}
      <ol className="search-results">
        {hits.map((hit) => (
          <li key={hit.path}>
            <p className="meta">{hit.kind}</p>
            <h2>
              <Link href={hit.path}>{hit.title}</Link>
            </h2>
            <p>{hit.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
