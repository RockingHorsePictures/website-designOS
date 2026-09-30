import { redirect, notFound } from 'next/navigation'
import { cms, currentUser } from '@/lib/cms'
import { PageComposer } from '@/editor/PageComposer'
import {
  blockCompositionSchema,
  compositionSchema,
  emptyComposition,
  type AnySection,
} from '@/editor/registry/schema'
import type { EditorData } from '@/editor/registry/config'
import { postSummary } from '@/components/site/Sections'
import { publicForm } from '@/lib/form-definitions'
import { defaultLocale, enabledLocales, isLocale } from '@/lib/locales'

export const metadata = { title: 'Page composer', robots: { index: false, follow: false } }
// The visual composer for a page or a reusable block, in one language at a time.
export default async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ collection?: string; locale?: string }>
}) {
  const user = await currentUser()
  if (!user) redirect('/admin/login')
  const payload = await cms()
  const id = Number((await params).id)
  const query = await searchParams
  const collection = query.collection === 'blocks' ? 'blocks' : 'pages'
  if (!Number.isSafeInteger(id)) notFound()
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    user,
    overrideAccess: false,
    depth: 0,
  })
  const languages = enabledLocales(settings as { languages?: unknown })
  const locale =
    isLocale(query.locale) && languages.includes(query.locale) ? query.locale : defaultLocale
  const localized = { locale, fallbackLocale: defaultLocale } as const
  const doc = (await payload
    .findByID({
      collection,
      id,
      draft: collection === 'pages',
      user,
      overrideAccess: false,
      ...localized,
    } as never)
    .catch(() => null)) as { title: string; composition?: unknown; updatedAt: string } | null
  if (!doc) notFound()
  const read = { user, overrideAccess: false, depth: 0, pagination: false, ...localized } as const
  const [projects, services, team, clients, media, facts, posts, categories, forms, blocks] =
    await Promise.all([
      payload.find({
        collection: 'case-studies',
        draft: true,
        sort: '-publishedAt',
        select: { title: true, slug: true, summary: true, featured: true },
        ...read,
      }),
      payload.find({
        collection: 'services',
        draft: true,
        sort: 'order',
        select: { title: true, slug: true, summary: true },
        ...read,
      }),
      payload.find({
        collection: 'team-members',
        sort: 'order',
        where: { active: { equals: true } },
        select: { name: true, role: true, bio: true, portrait: true },
        ...read,
      }),
      payload.find({
        collection: 'clients',
        sort: 'name',
        select: { name: true, website: true, logo: true },
        ...read,
      }),
      payload.find({
        collection: 'media',
        sort: '-createdAt',
        limit: 1000,
        select: {
          url: true,
          alt: true,
          caption: true,
          decorative: true,
          width: true,
          height: true,
        },
        ...read,
        pagination: true,
      }),
      payload.find({
        collection: 'approved-facts',
        where: { verification: { equals: 'verified' } },
        select: { statement: true },
        ...read,
      }),
      payload.find({ collection: 'posts', draft: true, sort: '-publishedAt', ...read }),
      payload.find({ collection: 'categories', sort: 'order', ...read }),
      payload.find({ collection: 'forms', sort: 'title', ...read }),
      payload.find({ collection: 'blocks', sort: 'title', ...read }),
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
    posts: posts.docs.map((p) => postSummary(p as never)),
    categories: categories.docs.map((c) => ({ id: c.id, title: c.title })),
    forms: forms.docs.map((f) => ({ ...publicForm(f as never), title: f.title })),
    blocks: blocks.docs
      .filter((b) => b.id !== id || collection !== 'blocks')
      .map((b) => {
        const parsed = blockCompositionSchema.safeParse(b.composition)
        return {
          id: b.id,
          title: b.title,
          content: (parsed.success ? parsed.data.content : []) as AnySection[],
        }
      }),
    locale,
  }
  const parsed = (collection === 'blocks' ? blockCompositionSchema : compositionSchema).safeParse(
    doc.composition,
  )
  return (
    <PageComposer
      id={id}
      collection={collection}
      locale={locale}
      languages={languages}
      title={doc.title}
      initial={parsed.success ? parsed.data : emptyComposition}
      updatedAt={doc.updatedAt}
      data={data}
      theme={await payload.findGlobal({ slug: 'theme' })}
    />
  )
}
