import { redirect, notFound } from 'next/navigation'
import { cms, currentUser } from '@/lib/cms'
import { PageComposer } from '@/editor/PageComposer'
import { compositionSchema, emptyComposition } from '@/editor/registry/schema'
export const metadata = { title: 'Page composer', robots: { index: false, follow: false } }
export default async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) redirect('/admin/login')
  const payload = await cms()
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id)) notFound()
  const page = await payload
    .findByID({ collection: 'pages', id, draft: true, user, overrideAccess: false })
    .catch(() => null)
  if (!page) notFound()
  const { docs } = await payload.find({
    collection: 'case-studies',
    limit: 200,
    draft: false,
    overrideAccess: false,
    sort: '-publishedAt',
    select: { title: true, slug: true, summary: true, featured: true },
  })
  const parsed = compositionSchema.safeParse(page.composition)
  return (
    <PageComposer
      id={id}
      title={page.title}
      initial={parsed.success ? parsed.data : emptyComposition}
      updatedAt={page.updatedAt}
      projects={docs}
    />
  )
}
