import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  APIError,
  type CollectionSlug,
  type GlobalSlug,
  type Payload,
  type TypedUser,
} from 'payload'
import { defaultLocale, isLocale } from '../locales'

// One read or write by an AI account, through Payload's normal access rules and lock hooks. Used
// by the local bridge (scripts/ai-client.ts) and the live-site API (/api/ai/request).
//
// On the live site every write must say when the AI last read the record (`expectedUpdatedAt`):
// if a person saved it since, the write is refused, so nobody's edit is silently overwritten. Each
// live write is recorded with what it replaced, for Overview → Changes by AI → Undo.

export type AIRequest = {
  action: 'read' | 'create' | 'update' | 'upload'
  collection?: string
  global?: string
  id?: number | string
  where?: Record<string, unknown>
  page?: number
  data?: Record<string, unknown>
  locale?: string
  expectedUpdatedAt?: string
  file?: string
}
type Mode = {
  readOnly: boolean
  live?: boolean
  upload?: { data: Buffer; name: string; mimetype: string; size: number }
}
const db = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle
const titleOf = (doc: Record<string, unknown> | null | undefined) =>
  String(doc?.title || doc?.name || doc?.filename || doc?.slug || doc?.from || doc?.id || '')
const pick = (doc: Record<string, unknown> | null | undefined, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, doc?.[k] ?? null]))

async function record(
  payload: Payload,
  user: TypedUser,
  change: {
    action: string
    collection?: string
    global?: string
    id?: unknown
    title: string
    locale?: string
    fields: string[]
    before?: unknown
    after?: unknown
  },
) {
  await db(payload).execute(sql`INSERT INTO designos_ai_changes
    (actor, action, collection, global, doc_id, title, locale, fields, before, after)
    VALUES (${user.email}, ${change.action}, ${change.collection ?? null}, ${change.global ?? null},
      ${change.id === undefined ? null : String(change.id)}, ${change.title.slice(0, 200)},
      ${change.locale ?? null}, ${JSON.stringify(change.fields)}::jsonb,
      ${change.before === undefined ? null : JSON.stringify(change.before)}::jsonb,
      ${change.after === undefined ? null : JSON.stringify(change.after)}::jsonb)`)
}

function fresh(current: { updatedAt?: unknown } | null, expected: string | undefined) {
  if (!expected)
    throw new APIError(
      'Live-site updates need expectedUpdatedAt: read the record first and send its updatedAt.',
      400,
    )
  const actual = current?.updatedAt ? new Date(String(current.updatedAt)).getTime() : NaN
  if (actual !== new Date(expected).getTime())
    throw new APIError(
      `This changed since you read it (now saved at ${String(current?.updatedAt)}). Read it again, then reapply only your change.`,
      409,
    )
}

export async function runAIRequest(
  payload: Payload,
  user: TypedUser,
  input: AIRequest,
  mode: Mode,
): Promise<unknown> {
  if (!['read', 'create', 'update', 'upload'].includes(input.action))
    throw new APIError('Supported actions: read, create, update, upload.', 400)
  if (mode.readOnly && input.action !== 'read')
    throw new APIError(
      mode.live
        ? 'AI edits are switched off on this site. Ask the owner to allow them (Overview → AI editing), or send them the change to make.'
        : 'Production AI access is read-only. Use preview for changes.',
      403,
    )
  if (Boolean(input.collection) === Boolean(input.global))
    throw new APIError('Choose one collection or global.', 400)
  const target = input.collection
    ? payload.collections[input.collection as CollectionSlug]?.config
    : payload.config.globals.find((item) => item.slug === input.global)
  const folders = input.collection === 'payload-folders'
  if (!folders && !target?.fields.some((field) => 'name' in field && field.name === 'protection'))
    throw new APIError('This target is not available to the AI connection.', 400)
  if (input.locale !== undefined && !isLocale(input.locale))
    throw new APIError('Supported actions accept locale as a two-letter language code.', 400)
  const options: Record<string, unknown> = {
    user,
    overrideAccess: false,
    depth: 0,
    ...(input.locale ? { locale: input.locale, fallbackLocale: defaultLocale } : {}),
  }
  const fields = Object.keys(input.data || {})

  if (input.action === 'upload') {
    if (input.collection !== 'media')
      throw new APIError('Supported actions: uploads go to the media collection only.', 400)
    if (!String(input.data?.alt || '').trim() && input.data?.decorative !== true)
      throw new APIError('Describe the image in data.alt, or set data.decorative to true.', 400)
    // The caller supplies the file (the live API from the request, the local bridge from disk), so
    // this module never touches the file system (which would make bundles trace the whole site).
    if (!mode.upload)
      throw new APIError(
        'Provide a JSON request file whose "file" is an image inside this website folder.',
        400,
      )
    const file = { file: mode.upload }
    const created = (await payload.create({
      collection: 'media',
      data: input.data as never,
      ...file,
      ...options,
    } as never)) as unknown as Record<string, unknown>
    if (mode.live)
      await record(payload, user, {
        action: 'upload',
        collection: 'media',
        id: created.id,
        title: titleOf(created),
        fields,
      })
    return created
  }

  if (input.global) {
    const slug = input.global as GlobalSlug
    if (input.action === 'create') throw new APIError('Globals already exist. Use update.', 400)
    if (input.action === 'read')
      return payload.findGlobal({ slug, ...options, draft: true } as never)
    const before = (await payload.findGlobal({
      slug,
      ...options,
      draft: true,
      overrideAccess: true,
    } as never)) as unknown as Record<string, unknown>
    if (mode.live) fresh(before, input.expectedUpdatedAt)
    const after = (await payload.updateGlobal({
      slug,
      data: input.data as never,
      ...options,
    } as never)) as unknown as Record<string, unknown>
    if (mode.live)
      await record(payload, user, {
        action: 'update',
        global: slug,
        title: String(target && 'label' in target && target.label ? target.label : slug),
        locale: input.locale,
        fields,
        before: pick(before, fields),
        after: pick(after, fields),
      })
    return after
  }

  const collection = input.collection as CollectionSlug
  if (input.action === 'read')
    return input.id
      ? payload.findByID({ collection, id: input.id, draft: true, ...options } as never)
      : payload.find({
          collection,
          draft: true,
          where: input.where as never,
          page: input.page || 1,
          limit: 100,
          ...options,
        } as never)
  if (input.action === 'create') {
    const created = (await payload.create({
      collection,
      data: input.data as never,
      draft: true,
      ...options,
    } as never)) as unknown as Record<string, unknown>
    if (mode.live)
      await record(payload, user, {
        action: 'create',
        collection,
        id: created.id,
        title: titleOf(created),
        locale: input.locale,
        fields,
      })
    return created
  }
  if (!input.id) throw new APIError('An individual record ID is required for updates.', 400)
  const before = (await payload
    .findByID({ collection, id: input.id, draft: true, ...options, overrideAccess: true } as never)
    .catch(() => null)) as unknown as Record<string, unknown> | null
  if (!before) throw new APIError('That record does not exist.', 404)
  if (mode.live) fresh(before, input.expectedUpdatedAt)
  const after = (await payload.update({
    collection,
    id: input.id,
    data: input.data as never,
    draft: true,
    ...options,
  } as never)) as unknown as Record<string, unknown>
  if (mode.live)
    await record(payload, user, {
      action: 'update',
      collection,
      id: input.id,
      title: titleOf(after),
      locale: input.locale,
      fields,
      before: pick(before, fields),
      after: pick(after, fields),
    })
  return after
}
