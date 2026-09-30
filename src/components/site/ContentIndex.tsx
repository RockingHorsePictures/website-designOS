import type { Metadata } from 'next'
import { siteCMS, siteView, requireLocale } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { listingOrder, querySort, sortDocs } from '@/lib/ordering'
import { SiteLink as Link } from '@/components/site/SiteLink'
import { absoluteURL, contentPath } from '@/lib/urls'
import {
  breadcrumbSchema,
  collectionIndex,
  organizationSchema,
  serializeSchema,
} from '@/lib/search/metadata'

type IndexCollection = 'case-studies' | 'services'
async function records(collection: IndexCollection) {
  const user = await previewUser()
  const payload = await siteCMS()
  const order = listingOrder(collection, await payload.findGlobal({ slug: 'site-settings' }))
  const { docs } = await payload.find({
    collection,
    overrideAccess: false,
    user,
    draft: Boolean(user),
    limit: 100,
    sort: querySort(collection, order),
  })
  return sortDocs(docs, collection, order)
}
export async function indexMetadata(collection: IndexCollection): Promise<Metadata> {
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const { name, path } = collectionIndex[collection]!
  const live = (await siteView()) === 'live' && process.env.SITE_ENV === 'production'
  const docs = await records(collection)
  return {
    title: `${name} | ${settings.companyName}`,
    description: docs
      .slice(0, 6)
      .map((d) => d.title)
      .join(', '),
    alternates: { canonical: absoluteURL(path) },
    robots: { index: live && docs.length > 0, follow: live },
  }
}
export async function ContentIndex({
  collection,
  title,
}: {
  collection: IndexCollection
  title: string
}) {
  await requireLocale()
  const docs = await records(collection)
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const { path } = collectionIndex[collection]!
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(settings),
      breadcrumbSchema([
        { name: settings.companyName, path: '/' },
        { name: title, path },
      ]),
      {
        '@type': 'CollectionPage',
        '@id': `${absoluteURL(path)}#page`,
        url: absoluteURL(path),
        name: title,
        inLanguage: settings.language || 'en',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: docs.map((doc, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteURL(contentPath(collection, doc.slug)),
            name: doc.title,
          })),
        },
      },
    ],
  }
  return (
    <section>
      <h1>{title}</h1>
      <ul>
        {docs.map((doc) => (
          <li key={doc.id}>
            <Link href={`/${collection}/${doc.slug}`}>{doc.title}</Link>
            <p>{doc.summary}</p>
          </li>
        ))}
      </ul>
      {!docs.length && <p>No published content yet.</p>}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
      />
    </section>
  )
}
