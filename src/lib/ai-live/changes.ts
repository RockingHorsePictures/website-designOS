import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  APIError,
  type CollectionSlug,
  type GlobalSlug,
  type Payload,
  type TypedUser,
} from 'payload'

// Overview → Changes by AI: what the live AI connection changed, and Undo. Undo only restores the
// fields the AI changed, and skips any a person has changed since, so it never discards later work.

const db = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle
export type AIChange = {
  id: number
  at: string
  actor: string
  action: 'create' | 'update' | 'upload'
  collection: string | null
  global: string | null
  doc_id: string | null
  title: string | null
  locale: string | null
  fields: string[]
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  undone_at: string | null
  undone_by: string | null
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const id = (value: string) => (/^\d+$/.test(value) ? Number(value) : value)

export async function listAIChanges(payload: Payload, since: string | null, limit = 50) {
  const { rows } = await db(payload).execute(
    since
      ? sql`SELECT id, at, actor, action, collection, global, doc_id, title, locale, fields, undone_at, undone_by FROM designos_ai_changes WHERE at > ${since} ORDER BY at DESC LIMIT ${limit}`
      : sql`SELECT id, at, actor, action, collection, global, doc_id, title, locale, fields, undone_at, undone_by FROM designos_ai_changes ORDER BY at DESC LIMIT ${limit}`,
  )
  return rows as Omit<AIChange, 'before' | 'after'>[]
}

export async function undoAIChange(payload: Payload, person: TypedUser, changeID: number) {
  if (person.role === 'ai') throw new APIError('Only a person can undo AI changes.', 403)
  const { rows } = await db(payload).execute(
    sql`SELECT * FROM designos_ai_changes WHERE id = ${changeID}`,
  )
  const change = rows[0] as AIChange | undefined
  if (!change) throw new APIError('That change was not found.', 404)
  if (change.undone_at) throw new APIError('That change was already undone.', 409)
  const options = {
    user: person,
    overrideAccess: false,
    depth: 0,
    context: { designosImport: true },
    ...(change.locale ? { locale: change.locale } : {}),
  } as const
  const restored: string[] = []
  const skipped: string[] = []
  if (change.action !== 'update') {
    // Undoing an addition removes the record (a person's delete permission applies).
    await payload.delete({
      ...options,
      collection: change.collection as CollectionSlug,
      id: id(change.doc_id!),
    } as never)
  } else {
    const current = (change.global
      ? await payload.findGlobal({
          ...options,
          slug: change.global as GlobalSlug,
          draft: true,
        } as never)
      : await payload.findByID({
          ...options,
          collection: change.collection as CollectionSlug,
          id: id(change.doc_id!),
          draft: true,
        } as never)) as unknown as Record<string, unknown>
    const data: Record<string, unknown> = {}
    for (const field of change.fields) {
      if (same(current[field], change.after?.[field])) {
        data[field] = change.before?.[field] ?? null
        restored.push(field)
      } else skipped.push(field)
    }
    if (restored.length) {
      if (change.global)
        await payload.updateGlobal({ ...options, slug: change.global as GlobalSlug, data } as never)
      else
        await payload.update({
          ...options,
          collection: change.collection as CollectionSlug,
          id: id(change.doc_id!),
          data,
          draft: current._status === 'draft',
        } as never)
    }
  }
  await db(payload)
    .execute(sql`UPDATE designos_ai_changes SET undone_at = now(), undone_by = ${person.email}
    WHERE id = ${changeID}`)
  return { restored, skipped }
}
