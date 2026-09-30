import { siteCMS, siteView, siteLocale, localeContext, requireLocale } from '@/lib/site'
import { notFound, permanentRedirect } from 'next/navigation'
import { findContent, previewUser } from '@/lib/cms'
import { ContentView } from '@/components/site/ContentView'
import { metadataFor } from '@/lib/search/metadata'
import { localePath } from '@/lib/locales'
import type { ContentCollection } from '@/lib/urls'

const nested: Record<string, ContentCollection> = {
  services: 'services',
  'case-studies': 'case-studies',
  blog: 'posts',
}
const resolve = (path: string[]): [ContentCollection, string] | null =>
  path.length === 1
    ? ['pages', path[0]]
    : path.length === 2 && nested[path[0]]
      ? [nested[path[0]], path[1]]
      : null
export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }) {
  const route = resolve((await params).path)
  const doc = route && (await findContent(...route))
  return doc
    ? metadataFor(
        doc,
        route![0],
        await (await siteCMS()).findGlobal({ slug: 'site-settings' }),
        Boolean(await previewUser()),
        await localeContext(),
      )
    : { title: 'Page not found', robots: { index: false } }
}
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  await requireLocale()
  const { path } = await params
  const route = resolve(path)
  const doc = route && (await findContent(...route))
  const payload = await siteCMS()
  if (!doc) {
    const { docs } = await payload.find({
      collection: 'redirects',
      where: { from: { equals: `/${path.join('/')}` } },
      limit: 1,
    })
    if (docs[0]) {
      const view = await siteView()
      const prefix =
        view === 'preview' ? '/preview' : view === 'workspace' ? '/workspace-preview' : ''
      permanentRedirect(`${prefix}${localePath(docs[0].to, await siteLocale())}`)
    }
    notFound()
  }
  return (
    <ContentView
      doc={doc}
      collection={route![0]}
      settings={await payload.findGlobal({ slug: 'site-settings' })}
    />
  )
}
