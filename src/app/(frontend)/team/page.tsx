import type { Metadata } from 'next'
import { siteCMS, siteView, requireLocale } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { ContentImage } from '@/components/site/ContentView'
import { absoluteURL } from '@/lib/urls'
import { breadcrumbSchema, organizationSchema, serializeSchema } from '@/lib/search/metadata'

async function people() {
  return (
    await (
      await siteCMS()
    ).find({
      collection: 'team-members',
      overrideAccess: false,
      user: await previewUser(),
      limit: 200,
      sort: 'order',
    })
  ).docs
}
export async function generateMetadata(): Promise<Metadata> {
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const live = (await siteView()) === 'live' && process.env.SITE_ENV === 'production'
  const team = await people()
  return {
    title: `Team | ${settings.companyName}`,
    description: `The people at ${settings.companyName}: ${team
      .slice(0, 5)
      .map((p) => `${p.name}, ${p.role}`)
      .join('; ')}.`,
    alternates: { canonical: absoluteURL('/team') },
    robots: { index: live && team.length > 0, follow: live },
  }
}
export default async function Team() {
  await requireLocale()
  const docs = await people()
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const org = organizationSchema(settings)
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      breadcrumbSchema([
        { name: settings.companyName, path: '/' },
        { name: 'Team', path: '/team' },
      ]),
      {
        '@type': 'AboutPage',
        '@id': `${absoluteURL('/team')}#page`,
        url: absoluteURL('/team'),
        name: 'Team',
        inLanguage: settings.language || 'en',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: docs.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Person',
              name: p.name,
              jobTitle: p.role,
              worksFor: { '@id': org['@id'] },
            },
          })),
        },
      },
    ],
  }
  return (
    <section>
      <h1>Team</h1>
      <ul>
        {docs.map((p) => (
          <li key={p.id}>
            <h2>{p.name}</h2>
            <p>{p.role}</p>
            <ContentImage asset={p.portrait} />
            <p>{p.bio}</p>
          </li>
        ))}
      </ul>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
      />
    </section>
  )
}
