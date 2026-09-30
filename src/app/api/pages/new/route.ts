import { cms, currentUser } from '@/lib/cms'
import { compositionSchema, emptyComposition } from '@/editor/registry/schema'
import { reservedSlugs, validSlug } from '@/lib/urls'
import { starterComposition } from '@/lib/starter'

// Creates a draft page, blank or copied from a page template, and returns its ID so the
// dashboard can open it in the composer. Section IDs are regenerated to stay unique.
const fresh = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(fresh)
  if (!value || typeof value !== 'object') return value
  const out = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fresh(v)]))
  if ('type' in out && out.props && typeof out.props === 'object' && 'id' in out.props)
    (out.props as { id: string }).id =
      `${String(out.type).toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`
  return out
}
export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    slug?: string
    template?: number | 'starter' | null
  }
  const title = String(body.title || '')
    .trim()
    .slice(0, 200)
  const slug = String(body.slug || '').trim()
  if (!title) return Response.json({ error: 'Give the page a title.' }, { status: 400 })
  if (!validSlug(slug) || reservedSlugs.includes(slug))
    return Response.json(
      { error: 'Use a different web address (lowercase letters, numbers, hyphens).' },
      { status: 400 },
    )
  const payload = await cms()
  if ((await payload.count({ collection: 'pages', where: { slug: { equals: slug } } })).totalDocs)
    return Response.json({ error: 'A page already uses that address.' }, { status: 409 })
  let composition: unknown = emptyComposition
  let summary = `${title}.`
  if (body.template === 'starter') composition = starterComposition(title)
  else if (typeof body.template === 'number') {
    const template = await payload
      .findByID({
        collection: 'pages',
        id: body.template,
        draft: true,
        user,
        overrideAccess: false,
      })
      .catch(() => null)
    if (template?.isTemplate) {
      composition = fresh(template.composition)
      summary = template.summary || summary
    }
  }
  if (!compositionSchema.safeParse(composition).success) composition = emptyComposition
  try {
    const doc = await payload.create({
      collection: 'pages',
      draft: true,
      data: { title, slug, summary, composition, _status: 'draft' } as never,
      user,
      overrideAccess: false,
    })
    return Response.json({ id: doc.id })
  } catch (error) {
    const status = (error as { status?: number }).status
    return Response.json(
      {
        error: status && status < 500 ? (error as Error).message : 'The page could not be created.',
      },
      { status: status && status < 500 ? status : 500 },
    )
  }
}
