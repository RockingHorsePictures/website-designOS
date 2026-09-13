import { cms, currentUser } from '@/lib/cms'
import { editableFields, policyApproval, type Policies } from '@/cms/protection'
import { createLocalReq, type CollectionSlug, type GlobalSlug } from 'payload'
import { advisoryLock } from '@/lib/transaction'

async function target(request: Request) {
  const user = await currentUser()
  if (!user) throw new Error('Sign in to view approvals.')
  const payload = await cms()
  const params = new URL(request.url).searchParams
  const collection = params.get('collection') as CollectionSlug | null
  const global = params.get('global') as GlobalSlug | null
  const id = Number(params.get('id'))
  const config = collection
    ? payload.collections[collection]?.config
    : payload.config.globals.find((item) => item.slug === global)
  if (!config?.fields.some((field) => 'name' in field && field.name === 'protection'))
    throw new Error('This target does not support approvals.')
  const doc = collection
    ? await payload.findByID({ collection, id, depth: 0, draft: true, overrideAccess: false, user })
    : await payload.findGlobal({ slug: global!, depth: 0, overrideAccess: false, user })
  return {
    payload,
    user,
    collection,
    global,
    id,
    doc: doc as unknown as Record<string, unknown>,
    fields: editableFields(config.fields),
  }
}
export async function GET(request: Request) {
  try {
    const { doc, fields, user } = await target(request)
    return Response.json(
      {
        fields: fields.map((field) => ({ ...field, value: doc[field.name as keyof typeof doc] })),
        policies: doc.protection || {},
        canApprove: user.role !== 'ai',
        updatedAt: doc.updatedAt,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch {
    return Response.json({ error: 'Sign in and select an existing record.' }, { status: 403 })
  }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return new Response('Invalid origin', { status: 403 })
  try {
    const { payload, user, collection, global, id, doc, fields } = await target(request)
    if (user.role === 'ai')
      return Response.json(
        { error: 'Ask a person to approve this change in the admin.' },
        { status: 403 },
      )
    const body = await request.json()
    if (
      !fields.some((field) => field.name === body.field) ||
      !['default', 'approved', 'locked'].includes(body.state)
    )
      return new Response('Invalid approval', { status: 400 })
    const req = await createLocalReq({ user, context: { policyApproval } }, payload)
    req.transactionID = (await payload.db.beginTransaction()) || undefined
    if (!req.transactionID) throw new Error('Approval requires a transaction.')
    try {
      await advisoryLock(req, 742193802)
      const latest = (collection
        ? await payload.findByID({ collection, id, depth: 0, draft: true, req })
        : await payload.findGlobal({ slug: global!, depth: 0, req })) as unknown as Record<
        string,
        unknown
      >
      if (body.updatedAt !== latest.updatedAt)
        throw new Error('This record changed. Reload it before approving.')
      const protection = {
        ...((latest.protection as Policies) || {}),
        [body.field]: { state: body.state, by: user.email, at: new Date().toISOString() },
      }
      if (collection)
        await payload.update({ collection, id, data: { protection }, draft: '_status' in doc, req })
      else await payload.updateGlobal({ slug: global as 'theme', data: { protection }, req })
      await payload.db.commitTransaction(await req.transactionID)
    } catch (error) {
      await payload.db.rollbackTransaction(await req.transactionID)
      throw error
    }
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 409 },
    )
  }
}
