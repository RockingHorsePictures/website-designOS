import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Field, Payload } from 'payload'

type AssetCollection = 'media' | 'fonts'
const idOf = (v: unknown) =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number(v.id) : null

// Media and font IDs that released content actually uses: upload/relationship fields, section
// media references inside compositions, and uploads embedded in rich text.
export function collectAssets(
  value: unknown,
  fields: Field[],
  found: Record<AssetCollection, Set<number>>,
) {
  if (!value || typeof value !== 'object') return
  const doc = value as Record<string, unknown>
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) collectAssets(doc, tab.fields, found)
      continue
    }
    if (!('name' in field) || !field.name) {
      if ('fields' in field) collectAssets(doc, field.fields, found)
      continue
    }
    const v = doc[field.name]
    if (v === undefined || v === null) continue
    if (
      (field.type === 'upload' || field.type === 'relationship') &&
      (field.relationTo === 'media' || field.relationTo === 'fonts')
    )
      for (const item of Array.isArray(v) ? v : [v]) {
        const id = idOf(item)
        if (id) found[field.relationTo].add(id)
      }
    else if (field.type === 'json' || field.type === 'richText') scanJSON(v, found)
    else if ('fields' in field)
      for (const row of Array.isArray(v) ? v : [v]) collectAssets(row, field.fields, found)
  }
}
function scanJSON(value: unknown, found: Record<AssetCollection, Set<number>>) {
  if (Array.isArray(value)) value.forEach((v) => scanJSON(v, found))
  else if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    // Section media reference: { image, alt, decorative }
    if ('image' in v && 'decorative' in v && typeof v.image === 'number') found.media.add(v.image)
    // Lexical upload node: { type: 'upload', relationTo: 'media', value }
    if (v.relationTo === 'media' && v.value !== undefined) {
      const id = idOf(v.value)
      if (id) found.media.add(id)
    }
    Object.values(v).forEach((item) => scanJSON(item, found))
  }
}

// IDs of files anonymous visitors may fetch: those in the current Live and Preview releases.
// Cached per publication state, so image requests do not re-read the release snapshots.
const cache = new Map<string, number[]>()
export async function publicAssetIDs(payload: Payload, collection: AssetCollection) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const state = (
    await db.execute(sql`SELECT live_release_id, preview_release_id FROM publication LIMIT 1`)
  ).rows[0] as { live_release_id: number | null; preview_release_id: number | null } | undefined
  const key = `${collection}:${state?.live_release_id}:${state?.preview_release_id}`
  const hit = cache.get(key)
  if (hit) return hit
  const { rows } = await db.execute(sql`
    SELECT DISTINCT (item->>'id')::int AS id
    FROM publication p
    JOIN site_releases r ON r.id IN (p.live_release_id, p.preview_release_id)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.snapshot -> 'collections' -> ${collection}, '[]'::jsonb)) AS item`)
  const ids = (rows as { id: number }[]).map((r) => r.id)
  if (cache.size > 20) cache.clear()
  cache.set(key, ids)
  return ids
}

// Every stored filename (original and sizes) of the records released in a set of snapshots.
const releasedNames = (collection: AssetCollection, releases: ReturnType<typeof sql>) => sql`
  SELECT DISTINCT names.f AS filename
  FROM site_releases r
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.snapshot -> 'collections' -> ${collection}, '[]'::jsonb)) AS item
  CROSS JOIN LATERAL (
    SELECT item ->> 'filename' AS f
    UNION ALL
    SELECT s.value ->> 'filename'
    FROM jsonb_each(CASE WHEN jsonb_typeof(item -> 'sizes') = 'object' THEN item -> 'sizes' ELSE '{}'::jsonb END) AS s
  ) AS names
  WHERE names.f IS NOT NULL AND ${releases}`

// Filenames visitors may load: those in the current Live and Preview releases. A replaced image's
// old file stays loadable for as long as a current release shows it.
const nameCache = new Map<string, Set<string>>()
export async function publicAssetFilenames(payload: Payload, collection: AssetCollection) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const state = (
    await db.execute(sql`SELECT live_release_id, preview_release_id FROM publication LIMIT 1`)
  ).rows[0] as { live_release_id: number | null; preview_release_id: number | null } | undefined
  const key = `${collection}:${state?.live_release_id}:${state?.preview_release_id}`
  const hit = nameCache.get(key)
  if (hit) return hit
  const ids = [state?.live_release_id, state?.preview_release_id].filter(
    (id): id is number => typeof id === 'number',
  )
  const names = new Set<string>()
  if (ids.length) {
    const { rows } = await db.execute(
      releasedNames(
        collection,
        sql`r.id IN (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    )
    for (const row of rows as { filename: string }[]) names.add(row.filename)
  }
  if (nameCache.size > 20) nameCache.clear()
  nameCache.set(key, names)
  return names
}

// Whether any release (current or past) still uses a stored file, so it must not be deleted.
export async function fileInAnyRelease(
  payload: Payload,
  collection: AssetCollection,
  filename: string,
) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const { rows } = await db.execute(
    sql`SELECT 1 FROM (${releasedNames(collection, sql`true`)}) AS released WHERE filename = ${filename} LIMIT 1`,
  )
  return rows.length > 0
}
