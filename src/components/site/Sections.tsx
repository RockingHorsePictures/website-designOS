import { siteCMS, siteLocale } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import {
  SectionView,
  type MediaSummary,
  type PostSummary,
  type SectionData,
} from '@/components/sections'
import {
  allSections,
  blockCompositionSchema,
  compositionMedia,
  type AnySection,
  type Composition,
} from '@/editor/registry/schema'
import { publicForm, type PublicForm } from '@/lib/form-definitions'
import type { SiteSetting } from '@/payload-types'

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value
      ? Number((value as { id: number }).id)
      : null
const mediaOf = (value: unknown): MediaSummary | null =>
  value && typeof value === 'object' && 'url' in value ? (value as MediaSummary) : null
export const dateFormatter = (locale: string) => (iso: string) => {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}
export function postSummary(doc: Record<string, unknown>): PostSummary {
  return {
    id: Number(doc.id),
    title: String(doc.title),
    slug: String(doc.slug),
    summary: (doc.summary as string) || null,
    date: ((doc.date || doc.publishedAt || doc.createdAt) as string) || null,
    featured: Boolean(doc.featured),
    categories: ((doc.categories as unknown[]) || []).map(idOf).filter((v): v is number => !!v),
    image: idOf((doc.heroMedia as { image?: unknown } | null)?.image),
  }
}

// Resolves the records a composition references, from the selected site release (or the
// authenticated workspace), in the request language.
export async function sectionData(
  composition: Composition,
  settings: SiteSetting,
): Promise<SectionData> {
  const payload = await siteCMS()
  const user = await previewUser()
  const locale = await siteLocale()
  const read = { overrideAccess: false, user, draft: Boolean(user), limit: 200 } as const
  // Reusable blocks first: their sections count as part of this page.
  const blockIds = allSections(composition.content)
    .filter((s) => s.type === 'GlobalBlock')
    .map((s) => (s.props as { blockId: number | null }).blockId)
    .filter((v): v is number => !!v)
  const blocks: Record<number, AnySection[]> = {}
  if (blockIds.length) {
    const found = await payload.find({
      collection: 'blocks',
      where: { id: { in: blockIds } },
      depth: 0,
      ...read,
    })
    for (const doc of found.docs) {
      const parsed = blockCompositionSchema.safeParse(doc.composition)
      if (parsed.success) blocks[doc.id] = parsed.data.content as AnySection[]
    }
  }
  const everything = [
    ...allSections(composition.content),
    ...allSections(Object.values(blocks).flat()),
  ]
  const types = new Set(everything.map((s) => s.type))
  const formIds = everything
    .filter((s) => s.type === 'Form')
    .map((s) => (s.props as { formId: number | null }).formId)
    .filter((v): v is number => !!v)
  const [projects, services, team, clients, posts, forms] = await Promise.all([
    types.has('SelectedProjects')
      ? payload.find({ collection: 'case-studies', sort: '-publishedAt', depth: 0, ...read })
      : null,
    types.has('Services')
      ? payload.find({ collection: 'services', sort: 'order', depth: 0, ...read })
      : null,
    types.has('Team')
      ? payload.find({ collection: 'team-members', sort: 'order', depth: 1, ...read })
      : null,
    types.has('Logos')
      ? payload.find({ collection: 'clients', sort: 'name', depth: 1, ...read })
      : null,
    types.has('Posts')
      ? payload.find({ collection: 'posts', sort: '-publishedAt', depth: 0, ...read })
      : null,
    formIds.length
      ? payload.find({ collection: 'forms', where: { id: { in: formIds } }, depth: 0, ...read })
      : null,
  ])
  const media: Record<number, MediaSummary> = {}
  const postList = (posts?.docs || []).map((p) => postSummary(p as never))
  const ids = [
    ...compositionMedia({ root: {}, content: everything }),
    ...postList.map((p) => p.image).filter((v): v is number => !!v),
  ]
  if (ids.length) {
    const found = await payload.find({
      collection: 'media',
      where: { id: { in: ids } },
      depth: 0,
      overrideAccess: false,
      user,
      limit: ids.length,
    })
    for (const doc of found.docs) media[doc.id] = doc
  }
  for (const person of team?.docs || []) {
    const m = mediaOf(person.portrait?.image)
    if (m) media[m.id] = m
  }
  for (const client of clients?.docs || []) {
    const m = mediaOf(client.logo)
    if (m) media[m.id] = m
  }
  return {
    media,
    projects: projects?.docs || [],
    services: services?.docs || [],
    team: (team?.docs || []).map((p) => ({ ...p, portrait: idOf(p.portrait?.image) })),
    clients: (clients?.docs || []).map((c) => ({ ...c, logo: idOf(c.logo) })),
    contact: { email: settings.email, phone: settings.phone, address: settings.address },
    posts: postList,
    forms: Object.fromEntries(
      (forms?.docs || []).map((f) => [f.id, publicForm(f as never) as PublicForm]),
    ),
    blocks,
    locale,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
  }
}

export async function Sections({
  composition,
  settings,
  pagePath,
}: {
  composition: Composition
  settings: SiteSetting
  pagePath: string
}) {
  const data = await sectionData(composition, settings)
  const hiddenHeader = composition.root.props?.pageHeader === 'hidden'
  const formatDate = dateFormatter(data.locale || 'en')
  return (
    <>
      {composition.content.map((section, index) => (
        <SectionView
          key={section.props.id}
          section={section}
          ctx={{
            data,
            pagePath,
            formatDate,
            headingLevel: hiddenHeader && index === 0 && section.type === 'Hero' ? 1 : 2,
          }}
        />
      ))}
    </>
  )
}
