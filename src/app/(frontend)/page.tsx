import { siteCMS } from '@/lib/site'
import { findContent, previewUser } from '@/lib/cms'
import { ContentView } from '@/components/site/ContentView'
import { metadataFor } from '@/lib/search/metadata'
export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const doc = await findContent('pages', 'home')
  return doc
    ? metadataFor(
        doc,
        'pages',
        await (await siteCMS()).findGlobal({ slug: 'site-settings' }),
        Boolean(await previewUser()),
      )
    : { title: 'Coming soon', robots: { index: false, follow: false } }
}
export default async function Home() {
  const doc = await findContent('pages', 'home')
  if (!doc) return null
  return (
    <ContentView
      doc={doc}
      collection="pages"
      settings={await (await siteCMS()).findGlobal({ slug: 'site-settings' })}
    />
  )
}
