import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, type Field, type Payload, type PayloadRequest } from 'payload'
import { generateNKeysBetween } from 'payload/shared'
import { bundleFormat, bundleVersion, type Doc } from './bundle'
import type { Operation, OpResult, Plan } from './driver'
import { Remapper, type IDMap } from './remap'
import { defaultLocale } from '../locales'
import { storedFileExists } from '../../cms/storage/exists'
import pkg from '../../../package.json'

// Server half of a content import. Every write goes through Payload as the signed-in
// administrator (normal access rules, locks and hooks apply) and lands in the workspace: nothing
// is published until the owner saves a Preview and publishes it.

// Accounts, enquiries, releases and Payload's own records never move with content.
const excluded = new Set(['users', 'ai-usage', 'form-submissions', 'site-releases', 'publication'])
// Which release is Preview and Live belongs to each site and never moves.
export const transferableGlobals = (payload: Payload): string[] =>
  payload.config.globals.map((g) => g.slug as string).filter((slug) => slug !== 'publication')
export const transferable = (payload: Payload): string[] =>
  payload.config.collections
    .map((c) => c.slug as string)
    .filter((slug) => !excluded.has(slug) && !slug.startsWith('payload-'))

type Slug = 'pages'
const config = (payload: Payload, slug: string) => payload.collections[slug as Slug]?.config
type User = NonNullable<PayloadRequest['user']>

// Collections a collection refers to, so referenced records are created first.
function references(fields: Field[], found = new Set<string>()) {
  for (const field of fields) {
    if (field.type === 'tabs') field.tabs.forEach((tab) => references(tab.fields, found))
    else if (field.type === 'blocks') field.blocks.forEach((b) => references(b.fields, found))
    else if ('fields' in field) references(field.fields, found)
    if ((field.type === 'upload' || field.type === 'relationship') && 'relationTo' in field)
      [field.relationTo].flat().forEach((slug) => found.add(slug))
  }
  return found
}
export function importOrder(payload: Payload, slugs: string[]) {
  const order: string[] = []
  const visiting = new Set<string>()
  const visit = (slug: string) => {
    if (order.includes(slug) || visiting.has(slug)) return // cycles are linked up afterwards
    visiting.add(slug)
    for (const dep of references(config(payload, slug).fields))
      if (slugs.includes(dep) && dep !== slug) visit(dep)
    visiting.delete(slug)
    order.push(slug)
  }
  // Files first: almost everything refers to them.
  for (const slug of slugs.filter((s) => config(payload, s).upload)) visit(slug)
  for (const slug of slugs) visit(slug)
  return order
}

// Records the destination already has: same web address, same file, or a unique same title.
async function matches(payload: Payload, slug: string, keys: Doc[]) {
  const c = config(payload, slug)
  const names = new Set(c.fields.flatMap((f) => ('name' in f && f.name ? [f.name] : [])))
  const titleField = typeof c.admin?.useAsTitle === 'string' ? c.admin.useAsTitle : null
  const by = c.upload
    ? 'filename'
    : names.has('slug')
      ? 'slug'
      : titleField && titleField !== 'id'
        ? titleField
        : null
  if (!by) return {}
  const existing = (
    await payload.find({
      collection: slug as Slug,
      depth: 0,
      pagination: false,
      draft: true,
      overrideAccess: true,
      select: { [by]: true, filesize: true, width: true, height: true } as never,
    })
  ).docs as unknown as Doc[]
  const found: Record<string, number | string> = {}
  for (const key of keys) {
    const value = key[by]
    if (value === undefined || value === null || value === '') continue
    // Images are re-processed on upload (their stored size changes), so they are recognised by
    // name and dimensions; other files by name and size.
    const sameFile = (doc: Doc) =>
      typeof key.width === 'number' && typeof doc.width === 'number'
        ? doc.width === key.width && doc.height === key.height
        : doc.filesize === key.filesize
    const same = existing.filter((doc) => doc[by] === value && (!c.upload || sameFile(doc)))
    if (same.length === 1) found[String(key.id)] = same[0].id
  }
  return found
}

// Whether a record has any translated text in a language (untranslated records are skipped, so
// they keep falling back to the main language).
function translated(fields: Field[], data: Record<string, unknown>): boolean {
  return fields.some((field) => {
    if (field.type === 'tabs')
      return field.tabs.some((tab) =>
        'name' in tab && tab.name
          ? translated(tab.fields, (data[tab.name] as Record<string, unknown>) || {})
          : translated(tab.fields, data),
      )
    if (!('name' in field) || !field.name)
      return 'fields' in field && translated(field.fields, data)
    const value = data[field.name]
    if ('localized' in field && field.localized)
      return (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && !value.length)
      )
    if (field.type === 'group' && value && typeof value === 'object')
      return translated(field.fields, value as Record<string, unknown>)
    if (field.type === 'array' && Array.isArray(value))
      return value.some((row) => row && translated(field.fields, row as Record<string, unknown>))
    return false
  })
}
// A translation needs its title (records validate that); without a localized title, any
// translated text counts.
function isTranslated(c: ReturnType<typeof config>, data: Record<string, unknown>) {
  const title = typeof c.admin?.useAsTitle === 'string' ? c.admin.useAsTitle : null
  const field = title && c.flattenedFields.find((f) => 'name' in f && f.name === title)
  if (field && 'localized' in field && field.localized) {
    const value = data[title!]
    return typeof value === 'string' && value.trim() !== ''
  }
  return translated(c.fields, data)
}
// What earlier imports from the same source created here, so running an import again updates
// those records (even when names repeat, such as many images called vimeo.jpg).
const db = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle
async function importMap(payload: Payload) {
  await db(payload).execute(sql`CREATE TABLE IF NOT EXISTS designos_import_map (
    source text NOT NULL, collection text NOT NULL, source_id text NOT NULL, target_id text NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (source, collection, source_id))`)
}
async function remember(
  payload: Payload,
  source: string,
  collection: string,
  from: unknown,
  to: unknown,
) {
  await importMap(payload)
  await db(payload)
    .execute(sql`INSERT INTO designos_import_map (source, collection, source_id, target_id)
    VALUES (${source}, ${collection}, ${String(from)}, ${String(to)})
    ON CONFLICT (source, collection, source_id) DO UPDATE SET target_id = EXCLUDED.target_id, imported_at = now()`)
}
async function recall(payload: Payload, source: string) {
  await importMap(payload)
  const { rows } = await db(payload).execute(
    sql`SELECT collection, source_id, target_id FROM designos_import_map WHERE source = ${source}`,
  )
  return rows as { collection: string; source_id: string; target_id: string }[]
}
const remapper = (payload: Payload, idMap: IDMap) => new Remapper(idMap, transferable(payload))
async function latestIsDraft(payload: Payload, slug: string, id: number | string) {
  if (!config(payload, slug).versions?.drafts) return false
  const doc = (await payload
    .findByID({ collection: slug as Slug, id, draft: true, depth: 0, overrideAccess: true })
    .catch(() => null)) as { _status?: string } | null
  return doc?._status === 'draft'
}

export async function transferOperation(
  payload: Payload,
  user: User,
  op: Operation,
  file?: { data: Buffer; name: string },
): Promise<OpResult & Partial<Plan>> {
  const slugs = transferable(payload)
  const known = (slug: string) => {
    if (!slugs.includes(slug)) throw new APIError(`This site has no “${slug}” collection.`, 400)
  }
  // A fresh context for every save: Payload's storage plugin keeps per-upload state on it, so a
  // shared object would let the first file's state skip every later file's upload.
  const base = () =>
    ({ user, overrideAccess: false, depth: 0, context: { designosImport: true } }) as const

  if (op.op === 'plan') {
    const m = op.manifest
    if (m?.format !== bundleFormat) throw new APIError('This is not a content bundle.', 400)
    if (m.version > bundleVersion)
      throw new APIError('This bundle was made by a newer Design OS. Update this site first.', 400)
    const inBundle = Object.keys(op.keys || {})
    const present = inBundle.filter((s) => slugs.includes(s))
    const warnings: string[] = []
    if (m.designos !== pkg.version)
      warnings.push(
        `The bundle was made with Design OS ${m.designos}; this site runs ${pkg.version}. Fields that only one of them has are skipped.`,
      )
    if (m.defaultLocale !== defaultLocale)
      warnings.push(
        `The bundle's main language is ${m.defaultLocale}; this site's is ${defaultLocale}. Main-language content is imported as ${defaultLocale}.`,
      )
    const found: IDMap = {}
    const earlier = m.sourceId ? await recall(payload, m.sourceId) : []
    for (const slug of present) {
      found[slug] = await matches(payload, slug, op.keys[slug])
      // Records an earlier import of this source created win over name matches, if they still exist.
      const mine = earlier.filter((r) => r.collection === slug)
      if (!mine.length) continue
      const ids = mine.map((r) => (/^\d+$/.test(r.target_id) ? Number(r.target_id) : r.target_id))
      const alive = new Set(
        (
          await payload.find({
            collection: slug as Slug,
            where: { id: { in: ids } },
            pagination: false,
            depth: 0,
            draft: true,
            overrideAccess: true,
            select: {} as never,
          })
        ).docs.map((d) => String((d as { id: unknown }).id)),
      )
      const wanted = new Set(op.keys[slug].map((k) => String(k.id)))
      for (const r of mine)
        if (alive.has(r.target_id) && wanted.has(r.source_id))
          found[slug][r.source_id] = /^\d+$/.test(r.target_id) ? Number(r.target_id) : r.target_id
    }
    // Files this site has records for but whose stored file is missing (a re-import repairs them).
    const missingFiles: Record<string, string[]> = {}
    for (const slug of present.filter((s) => config(payload, s).upload)) {
      const targets = Object.entries(found[slug] || {})
      if (!targets.length) continue
      const docs = new Map(
        (
          (
            await payload.find({
              collection: slug as Slug,
              where: { id: { in: targets.map(([, t]) => t) } },
              pagination: false,
              depth: 0,
              overrideAccess: true,
              select: { filename: true, prefix: true } as never,
            })
          ).docs as unknown as Doc[]
        ).map((d) => [String(d.id), d]),
      )
      const queue = [...targets]
      const missing: string[] = []
      await Promise.all(
        Array.from({ length: 8 }, async () => {
          for (let next = queue.shift(); next; next = queue.shift()) {
            const doc = docs.get(String(next[1]))
            if (!doc?.filename) continue
            const stored = await storedFileExists(
              payload,
              slug,
              String(doc.filename),
              typeof doc.prefix === 'string' ? doc.prefix : '',
            ).catch(() => true)
            if (!stored) missing.push(next[0])
          }
        }),
      )
      if (missing.length) missingFiles[slug] = missing
    }
    return {
      collections: present,
      order: importOrder(payload, present),
      missingFiles,
      uploads: present.filter((s) => config(payload, s).upload),
      ordered: present.filter((s) => config(payload, s).orderable),
      defaultLocale,
      matches: found,
      missing: inBundle.filter((s) => !slugs.includes(s)),
      warnings,
      // Vercel limits a request to 4.5 MB; locally there is no limit.
      maxFileBytes: process.env.VERCEL ? 4_000_000 : null,
    }
  }

  if (op.op === 'record' || op.op === 'file') {
    known(op.collection)
    const c = config(payload, op.collection)
    if (
      op.op === 'record' &&
      op.locale &&
      op.locale !== defaultLocale &&
      op.targetId !== null &&
      !isTranslated(c, op.record)
    )
      return { id: op.targetId }
    const remap = remapper(payload, op.op === 'record' ? op.idMap : {})
    const data = remap.fields(c.fields, op.record, `${op.collection} #${op.record.id}`, true)
    const draft = Boolean(c.versions?.drafts) && op.record._status === 'draft'
    if (c.versions?.drafts) data._status = draft ? 'draft' : 'published'
    const locale = (op.op === 'record' && op.locale) || defaultLocale
    let id: number | string
    if (op.op === 'file') {
      if (!file) throw new APIError('The file is missing.', 400)
      const upload = {
        data: file.data,
        name: file.name,
        mimetype: String(op.record.mimeType || 'application/octet-stream'),
        size: file.data.byteLength,
      }
      // A target means the record exists but its stored file is missing: upload it again.
      const repair = op.targetId !== null && op.targetId !== undefined
      const saved = (repair
        ? await payload.update({
            ...base(),
            collection: op.collection as Slug,
            id: op.targetId!,
            data: data as never,
            locale: locale as never,
            file: upload,
          })
        : await payload.create({
            ...base(),
            collection: op.collection as Slug,
            data: data as never,
            locale: locale as never,
            file: upload,
          })) as unknown as Doc
      id = saved.id
      const stored = await storedFileExists(
        payload,
        op.collection,
        String(saved.filename),
        typeof saved.prefix === 'string' ? saved.prefix : '',
      )
      if (!stored)
        throw new APIError(
          `The record was saved but its file (${String(saved.filename)}) did not reach storage. Import the bundle again to retry.`,
          502,
        )
    } else if (op.targetId !== null && op.targetId !== undefined) {
      const updated = await payload.update({
        ...base(),
        collection: op.collection as Slug,
        id: op.targetId,
        data: data as never,
        locale: locale as never,
        draft,
      })
      id = updated.id
    } else {
      if (c.upload) throw new APIError('A new file record needs its file.', 400)
      const created = await payload.create({
        ...base(),
        collection: op.collection as Slug,
        data: data as never,
        locale: locale as never,
        draft,
      })
      id = created.id
    }
    if (op.source) await remember(payload, op.source, op.collection, op.record.id, id)
    return { id, unresolved: remap.report.unresolved, unknown: remap.report.unknown }
  }

  if (op.op === 'global') {
    const global = transferableGlobals(payload).includes(op.slug)
      ? payload.config.globals.find((g) => g.slug === op.slug)
      : undefined
    if (!global) throw new APIError(`This site has no “${op.slug}” settings.`, 400)
    if (op.locale && op.locale !== defaultLocale && !translated(global.fields, op.data)) return {}
    const remap = remapper(payload, op.idMap)
    const data = remap.fields(global.fields, op.data, op.slug, true)
    delete data.globalType
    await payload.updateGlobal({
      ...base(),
      slug: op.slug as 'site-settings',
      data: data as never,
      locale: (op.locale || defaultLocale) as never,
    })
    return { unresolved: remap.report.unresolved, unknown: remap.report.unknown }
  }

  if (op.op === 'order') {
    known(op.collection)
    if (!config(payload, op.collection).orderable) return {}
    // The bundle's records go first, in its order; anything else on the site follows.
    const others = await payload.find({
      collection: op.collection as Slug,
      depth: 0,
      limit: 1,
      sort: '_order',
      overrideAccess: true,
      select: { _order: true } as never,
      where: { and: [{ id: { not_in: op.ids } }, { _order: { exists: true } }] },
    })
    const first = (others.docs[0] as { _order?: string } | undefined)?._order || null
    // Keys only: the driver saves them a few records per request, within the time limit.
    return { keys: generateNKeysBetween(null, first, op.ids.length) }
  }

  if (op.op === 'setOrder') {
    known(op.collection)
    if (!config(payload, op.collection).orderable) return {}
    for (const { id, key } of op.items.slice(0, 10))
      await payload.update({
        ...base(),
        collection: op.collection as Slug,
        id,
        data: { _order: key } as never,
        draft: await latestIsDraft(payload, op.collection, id),
      })
    return {}
  }

  if (op.op === 'removeDemo') {
    const removed: string[] = []
    const failed: string[] = []
    for (const slug of slugs) {
      const c = config(payload, slug)
      if (!c.fields.some((f) => 'name' in f && f.name === 'demo')) continue
      const keep = Object.values(op.keep?.[slug] || {})
      const { docs } = await payload.find({
        collection: slug as Slug,
        depth: 0,
        pagination: false,
        draft: true,
        overrideAccess: true,
        where: { demo: { equals: true } },
      })
      for (const doc of docs as unknown as Doc[]) {
        if (keep.includes(doc.id)) continue
        const name = `${slug} “${String(doc.title || doc.name || doc.filename || doc.id)}”`
        try {
          await payload.delete({ ...base(), collection: slug as Slug, id: doc.id })
          removed.push(name)
        } catch (error) {
          failed.push(
            `Could not remove demo ${name}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
    }
    return { removed, failed }
  }
  throw new APIError('Unknown import step.', 400)
}
