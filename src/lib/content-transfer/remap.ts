import type { Field } from 'payload'

// Content transfer: records move between databases (typically the AI's local build database and
// the live site), so every reference to another record or file is rewritten from its source ID to
// the ID it has in the destination. Pure: used by the importer, the test suite and the CLI.

export type IDMap = Record<string, Record<string, number | string>>
export type RemapReport = {
  // References whose target is not (yet) in the destination: removed, never left pointing at
  // whatever happens to have that ID there.
  unresolved: string[]
  // Section props that look like references but match no collection: kept as they are.
  unknown: string[]
}

// Fields never copied: identity, timestamps, generated file metadata, approvals and secrets.
export const skippedKeys = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'protection',
  '_order',
  'position',
  'sizes',
  'url',
  'thumbnailURL',
  'filename',
  'mimeType',
  'filesize',
  'width',
  'height',
  'prefix',
  'webhookSecret',
  'pagePassword',
  'googleSub',
])

const aliases: Record<string, string[]> = {
  project: ['case-studies'],
  caseStudy: ['case-studies'],
  member: ['team-members'],
  person: ['team-members'],
  people: ['team-members'],
  fact: ['approved-facts'],
  image: ['media'],
  poster: ['media'],
  logo: ['media'],
  font: ['fonts'],
}
// The collection a section prop such as `projectIds`, `awardId` or `sectorIds` refers to.
export function referencedCollection(prop: string, collections: string[]): string | null {
  const match = /^(.*?)(Ids|Id)$/.exec(prop)
  if (!match || !match[1]) return null
  const stem = match[1]
  const kebab = stem.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
  const candidates = [
    ...(aliases[stem] || []),
    `${kebab}s`,
    kebab.endsWith('y') ? `${kebab.slice(0, -1)}ies` : '',
    kebab,
  ]
  return candidates.find((c) => c && collections.includes(c)) || null
}

const isID = (v: unknown): v is number | string =>
  typeof v === 'number' || (typeof v === 'string' && v !== '')
const idOf = (v: unknown) =>
  isID(v) ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : null

export class Remapper {
  readonly report: RemapReport = { unresolved: [], unknown: [] }
  constructor(
    private map: IDMap,
    private collections: string[],
  ) {}

  private target(collection: string, source: unknown, where: string) {
    const id = idOf(source)
    if (id === null || id === undefined) return null
    const found = this.map[collection]?.[String(id)]
    if (found === undefined) this.report.unresolved.push(`${where} → ${collection} #${id}`)
    return found ?? null
  }

  // A document's data, following the destination collection's fields.
  fields(fields: Field[], data: Record<string, unknown>, where: string, top = false) {
    const out: Record<string, unknown> = {}
    for (const field of fields) {
      if (field.type === 'tabs') {
        for (const tab of field.tabs)
          if ('name' in tab && tab.name) {
            if (data[tab.name] && typeof data[tab.name] === 'object')
              out[tab.name] = this.fields(
                tab.fields,
                data[tab.name] as Record<string, unknown>,
                `${where}.${tab.name}`,
              )
          } else Object.assign(out, this.fields(tab.fields, data, where, top))
        continue
      }
      if (!('name' in field) || !field.name) {
        if ('fields' in field) Object.assign(out, this.fields(field.fields, data, where, top))
        continue
      }
      const name = field.name
      if (!(name in data) || (top && skippedKeys.has(name))) continue
      if ('virtual' in field && field.virtual) continue
      if (field.type === 'ui' || field.type === 'join') continue
      out[name] = this.value(field, data[name], `${where}.${name}`)
    }
    return out
  }

  private value(field: Field, value: unknown, where: string): unknown {
    if (value === null || value === undefined) return value
    if (field.type === 'upload' || field.type === 'relationship') {
      const one = (item: unknown) => {
        if (Array.isArray(field.relationTo)) {
          const poly = item as { relationTo?: string; value?: unknown }
          if (!poly?.relationTo) return null
          const id = this.target(poly.relationTo, poly.value, where)
          return id === null ? null : { relationTo: poly.relationTo, value: id }
        }
        return this.target(field.relationTo, item, where)
      }
      return Array.isArray(value) ? value.map(one).filter((v) => v !== null) : one(value)
    }
    if (field.type === 'richText') return this.richText(value, where)
    if (field.type === 'json') return this.json(value, where)
    if (field.type === 'array' && Array.isArray(value))
      return value.map((row, i) =>
        row && typeof row === 'object'
          ? {
              ...('id' in row ? { id: (row as { id: unknown }).id } : {}),
              ...this.fields(field.fields, row as Record<string, unknown>, `${where}[${i}]`),
            }
          : row,
      )
    if (field.type === 'group' && typeof value === 'object')
      return this.fields(field.fields, value as Record<string, unknown>, where)
    if (field.type === 'blocks' && Array.isArray(value))
      return value.map((row, i) => {
        const block = field.blocks.find((b) => b.slug === (row as { blockType?: string }).blockType)
        if (!block || !row || typeof row !== 'object') return row
        return {
          ...row,
          ...this.fields(block.fields, row as Record<string, unknown>, `${where}[${i}]`),
        }
      })
    return value
  }

  // Lexical rich text: uploads, relationship blocks and internal links carry record IDs.
  richText(value: unknown, where: string): unknown {
    const walk = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(walk).filter((n) => n !== undefined)
      if (!node || typeof node !== 'object') return node
      const n = { ...(node as Record<string, unknown>) }
      if ((n.type === 'upload' || n.type === 'relationship') && typeof n.relationTo === 'string') {
        const id = this.target(n.relationTo, n.value, where)
        if (id === null) return undefined
        n.value = id
      }
      const fields = n.fields as Record<string, unknown> | undefined
      const doc = fields?.doc as { relationTo?: string; value?: unknown } | undefined
      if (fields && doc?.relationTo && fields.linkType === 'internal') {
        const id = this.target(doc.relationTo, doc.value, where)
        n.fields =
          id === null
            ? { ...fields, linkType: 'custom', url: '#', doc: null }
            : { ...fields, doc: { relationTo: doc.relationTo, value: id } }
      }
      for (const [key, child] of Object.entries(n))
        if (key !== 'fields' && child && typeof child === 'object') n[key] = walk(child)
      return n
    }
    return walk(value)
  }

  // Page compositions and other JSON: section media ({ image, alt, decorative }) and props named
  // after a collection (`projectIds`, `formId`, `awardIds` …).
  json(value: unknown, where: string): unknown {
    if (Array.isArray(value)) return value.map((v, i) => this.json(v, `${where}[${i}]`))
    if (!value || typeof value !== 'object') return value
    const out: Record<string, unknown> = {}
    const v = value as Record<string, unknown>
    const mediaRef = 'image' in v && 'decorative' in v
    for (const [key, item] of Object.entries(v)) {
      if (mediaRef && key === 'image') {
        out[key] = isID(item) ? this.target('media', item, `${where}.image`) : item
        continue
      }
      const collection = /Ids?$/.test(key) ? referencedCollection(key, this.collections) : null
      // Database IDs are numbers; strings such as Vimeo IDs are not record references.
      const ids =
        key.endsWith('Ids') && Array.isArray(item) && item.every((n) => typeof n === 'number')
      const single = key.endsWith('Id') && (typeof item === 'number' || item === null)
      if (collection && ids)
        out[key] = (item as unknown[])
          .map((id) => this.target(collection, id, `${where}.${key}`))
          .filter((id) => id !== null)
      else if (collection && single)
        out[key] = item === null ? null : this.target(collection, item, `${where}.${key}`)
      else {
        if ((ids || single) && item !== null && !(Array.isArray(item) && !item.length))
          this.report.unknown.push(`${where}.${key}`)
        out[key] = item && typeof item === 'object' ? this.json(item, `${where}.${key}`) : item
      }
    }
    return out
  }
}
