import { notFound } from 'next/navigation'
import { siteCMS, localeContext, requireLocale } from '@/lib/site'
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
        await localeContext(),
      )
    : { title: 'Coming soon', robots: { index: false, follow: false } }
}
export default async function Home() {
  await requireLocale()
  const doc = await findContent('pages', 'home')
  if (!doc) notFound()
  return (
    <ContentView
      doc={doc}
      collection="pages"
      settings={await (await siteCMS()).findGlobal({ slug: 'site-settings' })}
    />
  )
}
