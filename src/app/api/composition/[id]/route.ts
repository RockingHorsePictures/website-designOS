import { cms, currentUser } from '@/lib/cms'
import { compositionSchema } from '@/editor/registry/schema'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in to save.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  const parsed = compositionSchema.safeParse(body.composition)
  if (!parsed.success)
    return Response.json({ error: 'Invalid section configuration.' }, { status: 400 })
  const payload = await cms()
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id < 1)
    return Response.json({ error: 'Invalid page ID.' }, { status: 400 })
  const existing = await payload.findByID({
    collection: 'pages',
    id,
    draft: true,
    user,
    overrideAccess: false,
  })
  if (existing.updatedAt !== body.updatedAt)
    return Response.json(
      { error: 'This page changed in another window. Reload before saving.' },
      { status: 409 },
    )
  const doc = await payload.update({
    collection: 'pages',
    id,
    data: { composition: parsed.data, _status: 'draft' },
    draft: true,
    user,
    overrideAccess: false,
  })
  return Response.json({ updatedAt: doc.updatedAt })
}
