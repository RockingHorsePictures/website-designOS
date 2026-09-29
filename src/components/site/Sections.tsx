import { siteCMS } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { SectionView, type SectionData, type MediaSummary } from '@/components/sections'
import { compositionMedia, type Composition } from '@/editor/registry/schema'
import type { SiteSetting } from '@/payload-types'

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value
      ? Number((value as { id: number }).id)
      : null
const mediaOf = (value: unknown): MediaSummary | null =>
  value && typeof value === 'object' && 'url' in value ? (value as MediaSummary) : null

// Resolves the records a composition references, from the selected site release (or the
// authenticated workspace), and renders every section through the shared renderers.
export async function sectionData(
  composition: Composition,
  settings: SiteSetting,
): Promise<SectionData> {
  const payload = await siteCMS()
  const user = await previewUser()
  const types = new Set(composition.content.map((s) => s.type))
  const read = { overrideAccess: false, user, draft: Boolean(user), limit: 200 } as const
  const [projects, services, team, clients] = await Promise.all([
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
  ])
  const media: Record<number, MediaSummary> = {}
  const ids = compositionMedia(composition)
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
  return (
    <>
      {composition.content.map((section, index) => (
        <SectionView
          key={section.props.id}
          section={section}
          ctx={{
            data,
            pagePath,
            headingLevel: hiddenHeader && index === 0 && section.type === 'Hero' ? 1 : 2,
          }}
        />
      ))}
    </>
  )
}
