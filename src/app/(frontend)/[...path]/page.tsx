import { siteCMS, siteView } from '@/lib/site'
import { notFound, permanentRedirect } from 'next/navigation'
import { findContent, previewUser } from '@/lib/cms'
import { ContentView } from '@/components/site/ContentView'
import { metadataFor } from '@/lib/search/metadata'
import type { ContentCollection } from '@/lib/urls'
const resolve = (path: string[]): [ContentCollection, string] | null =>
  path.length === 1
    ? ['pages', path[0]]
    : path.length === 2 && ['services', 'case-studies'].includes(path[0])
      ? [path[0] as ContentCollection, path[1]]
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
      )
    : { title: 'Page not found', robots: { index: false } }
}
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
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
      permanentRedirect(`${prefix}${docs[0].to}`)
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
