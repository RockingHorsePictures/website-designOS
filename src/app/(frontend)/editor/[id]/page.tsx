import { redirect, notFound } from 'next/navigation'
import { cms, currentUser } from '@/lib/cms'
import { PageComposer } from '@/editor/PageComposer'
import { compositionSchema, emptyComposition } from '@/editor/registry/schema'
import type { EditorData } from '@/editor/registry/config'
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
  const query = { user, overrideAccess: false, depth: 0, pagination: false } as const
  const [projects, services, team, clients, media, facts, settings] = await Promise.all([
    payload.find({
      collection: 'case-studies',
      draft: true,
      sort: '-publishedAt',
      select: { title: true, slug: true, summary: true, featured: true },
      ...query,
    }),
    payload.find({
      collection: 'services',
      draft: true,
      sort: 'order',
      select: { title: true, slug: true, summary: true },
      ...query,
    }),
    payload.find({
      collection: 'team-members',
      sort: 'order',
      where: { active: { equals: true } },
      select: { name: true, role: true, bio: true, portrait: true },
      ...query,
    }),
    payload.find({
      collection: 'clients',
      sort: 'name',
      select: { name: true, website: true, logo: true },
      ...query,
    }),
    payload.find({
      collection: 'media',
      sort: '-createdAt',
      limit: 1000,
      select: { url: true, alt: true, caption: true, decorative: true, width: true, height: true },
      ...query,
      pagination: true,
    }),
    payload.find({
      collection: 'approved-facts',
      where: { verification: { equals: 'verified' } },
      select: { statement: true },
      ...query,
    }),
    payload.findGlobal({ slug: 'site-settings', user, overrideAccess: false, depth: 0 }),
  ])
  const data: EditorData = {
    projects: projects.docs,
    services: services.docs,
    team: team.docs.map((p) => ({
      ...p,
      portrait: typeof p.portrait?.image === 'number' ? p.portrait.image : null,
    })),
    clients: clients.docs.map((c) => ({ ...c, logo: typeof c.logo === 'number' ? c.logo : null })),
    media: media.docs,
    facts: facts.docs,
    contact: { email: settings.email, phone: settings.phone, address: settings.address },
  }
  const parsed = compositionSchema.safeParse(page.composition)
  return (
    <PageComposer
      id={id}
      title={page.title}
      initial={parsed.success ? parsed.data : emptyComposition}
      updatedAt={page.updatedAt}
      data={data}
      theme={await payload.findGlobal({ slug: 'theme' })}
    />
  )
}
