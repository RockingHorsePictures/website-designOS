import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import type { Field, CollectionSlug, GlobalSlug } from 'payload'
import { cms, currentUser } from './cms'
import { releaseID, type Snapshot, type ReleaseCollection, type ReleaseGlobal } from './releases'
import { tokenDefaults } from '../design-system/tokens'
import { typographyDefaults } from '../design-system/typography'
export const siteView = cache(async () => {
  const view = (await headers()).get('x-designos-view')
  if (view === 'workspace' && (await currentUser())) return 'workspace'
  return view === 'preview' ? 'preview' : 'live'
})
export const siteSnapshot = cache(async () => {
  const payload = await cms()
  const view = await siteView()
  if (view === 'workspace') return null
  const state = await payload.findGlobal({ slug: 'publication', depth: 0 })
  const id = releaseID(view === 'preview' ? state.previewRelease : state.liveRelease)
  if (!id) return null
  const release = await payload.findByID({ collection: 'site-releases', id, depth: 0 })
  if (release.formatVersion !== 1)
    throw new Error('This application cannot render the published release format.')
  return release.snapshot as Snapshot
})
function matches(doc: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, test]) => {
    if (key === 'and')
      return (test as Record<string, unknown>[]).every((part) => matches(doc, part))
    if (key === 'or') return (test as Record<string, unknown>[]).some((part) => matches(doc, part))
    const value = key
      .split('.')
      .reduce<unknown>(
        (value, part) =>
          value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined,
        doc,
      )
    const filter = test as { equals?: unknown; in?: unknown[]; not_equals?: unknown }
    return (
      (!('equals' in filter) || value === filter.equals) &&
      (!filter.in || filter.in.includes(value)) &&
      (!('not_equals' in filter) || value !== filter.not_equals)
    )
  })
}
function populate(
  doc: Record<string, unknown>,
  fields: Field[],
  snapshot: Snapshot,
  payload: Awaited<ReturnType<typeof cms>>,
  depth: number,
): Record<string, unknown> {
  const out = { ...doc }
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs)
        Object.assign(out, populate(out, tab.fields, snapshot, payload, depth))
      continue
    }
    if (!('name' in field) || !field.name) {
      if ('fields' in field)
        Object.assign(out, populate(out, field.fields, snapshot, payload, depth))
      continue
    }
    const name = field.name
    const value = out[name]
    if (!value) continue
    if ((field.type === 'relationship' || field.type === 'upload') && depth > 0) {
      const resolve = (id: unknown) => {
        const relation = typeof field.relationTo === 'string' ? field.relationTo : null
        if (!relation) return id
        const match = snapshot.collections[relation as ReleaseCollection]?.find(
          (item) => item.id === id,
        )
        return match
          ? populate(
              match,
              payload.collections[relation as CollectionSlug].config.fields,
              snapshot,
              payload,
              depth - 1,
            )
          : null
      }
      out[name] = Array.isArray(value) ? value.map(resolve).filter(Boolean) : resolve(value)
    } else if ('fields' in field) {
      out[name] = Array.isArray(value)
        ? value.map((row) =>
            populate(row as Record<string, unknown>, field.fields, snapshot, payload, depth),
          )
        : populate(value as Record<string, unknown>, field.fields, snapshot, payload, depth)
    }
  }
  return out
}
// All public rendering, metadata, redirects and discovery read the selected immutable snapshot.
export const siteCMS = cache(async () => {
  const payload = await cms()
  if ((await siteView()) === 'workspace') return payload
  const snapshot = await siteSnapshot()
  const find = (async (options: {
    collection: ReleaseCollection
    where?: Record<string, unknown>
    limit?: number
    page?: number
    sort?: string
    depth?: number
  }) => {
    let docs = (snapshot?.collections[options.collection] || []).filter((doc) =>
      matches(doc, options.where),
    )
    if (options.sort) {
      const descending = options.sort.startsWith('-')
      const key = options.sort.replace(/^-/, '')
      docs = [...docs].sort(
        (a, b) =>
          String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true }) *
          (descending ? -1 : 1),
      )
    }
    const totalDocs = docs.length
    const limit = options.limit || 100
    const page = options.page || 1
    return {
      docs: docs
        .slice((page - 1) * limit, page * limit)
        .map((doc) =>
          populate(
            doc,
            payload.collections[options.collection].config.fields,
            snapshot!,
            payload,
            options.depth ?? 2,
          ),
        ),
      totalDocs,
      hasNextPage: page * limit < totalDocs,
      page,
      totalPages: Math.ceil(totalDocs / limit),
    }
  }) as typeof payload.find
  const findGlobal = (async ({ slug }: { slug: ReleaseGlobal }) => {
    const doc = snapshot?.globals[slug]
    if (!doc)
      return slug === 'theme'
        ? { ...tokenDefaults, ...typographyDefaults }
        : slug === 'site-settings'
          ? { companyName: 'Coming soon' }
          : {}
    const fields = payload.config.globals.find(
      (global) => global.slug === (slug as GlobalSlug),
    )!.fields
    return populate(doc, fields, snapshot!, payload, 2)
  }) as typeof payload.findGlobal
  return { ...payload, find, findGlobal }
})
