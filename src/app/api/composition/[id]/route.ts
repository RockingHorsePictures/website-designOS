import { cms, currentUser } from '@/lib/cms'
import { blockCompositionSchema, compositionSchema } from '@/editor/registry/schema'
import { defaultLocale, isLocale } from '@/lib/locales'

// Saves a composer draft for a page or reusable block, in one language. Detects edits made in
// another window by comparing the document's last update time.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in to save.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  const collection = body.collection === 'blocks' ? 'blocks' : 'pages'
  const locale = isLocale(body.locale) ? body.locale : defaultLocale
  const parsed = (collection === 'blocks' ? blockCompositionSchema : compositionSchema).safeParse(
    body.composition,
  )
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message || 'Invalid section configuration.' },
      { status: 400 },
    )
  const payload = await cms()
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id < 1)
    return Response.json({ error: 'Invalid ID.' }, { status: 400 })
  const draft = collection === 'pages'
  try {
    const existing = await payload.findByID({
      collection,
      id,
      draft,
      locale,
      user,
      overrideAccess: false,
    })
    if (existing.updatedAt !== body.updatedAt)
      return Response.json(
        { error: 'This changed in another window. Reload before saving.' },
        { status: 409 },
      )
    const doc = await payload.update({
      collection,
      id,
      data: { composition: parsed.data, ...(draft ? { _status: 'draft' as const } : {}) },
      draft,
      locale,
      user,
      overrideAccess: false,
    })
    return Response.json({ updatedAt: doc.updatedAt })
  } catch (error) {
    const status = (error as { status?: number }).status
    return Response.json(
      {
        error:
          status && status < 500
            ? (error as Error).message
            : 'The draft could not be saved. Try again.',
      },
      { status: status && status < 500 ? status : 500 },
    )
  }
}
