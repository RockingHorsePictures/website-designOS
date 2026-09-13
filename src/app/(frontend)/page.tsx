import { cms, findContent, previewUser } from '@/lib/cms'
import { ContentView } from '@/components/site/ContentView'
import { metadataFor } from '@/lib/search/metadata'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const doc = await findContent('pages', 'home')
  return doc
    ? metadataFor(
        doc,
        'pages',
        await (await cms()).findGlobal({ slug: 'site-settings' }),
        Boolean(await previewUser()),
      )
    : { title: 'Foundation demonstration' }
}
export default async function Home() {
  const doc = await findContent('pages', 'home')
  if (!doc) notFound()
  return (
    <ContentView
      doc={doc}
      collection="pages"
      settings={await (await cms()).findGlobal({ slug: 'site-settings' })}
    />
  )
}
