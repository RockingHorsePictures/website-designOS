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
export async function publicAssetIDs(payload: Payload, collection: AssetCollection) {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const { rows } = await db.execute(sql`
    SELECT DISTINCT (item->>'id')::int AS id
    FROM publication p
    JOIN site_releases r ON r.id IN (p.live_release_id, p.preview_release_id)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.snapshot -> 'collections' -> ${collection}, '[]'::jsonb)) AS item`)
  return (rows as { id: number }[]).map((r) => r.id)
}
