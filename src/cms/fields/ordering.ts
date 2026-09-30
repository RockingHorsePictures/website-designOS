import type { CollectionBeforeChangeHook, CollectionConfig, Field, PayloadRequest } from 'payload'
import { generateKeyBetween } from 'payload/shared'
import type { OrderedCollection } from '../../lib/ordering'

// Custom order for a collection: Payload's `orderable` (drag rows in the list, which opens
// sorted by that order) plus a Position box on each record for typing a place directly.

const orderedIDsBefore = async (
  req: PayloadRequest,
  slug: OrderedCollection,
  key: string,
  exclude?: number | string,
) =>
  (
    await req.payload.count({
      collection: slug,
      req,
      overrideAccess: true,
      where: {
        and: [
          { _order: { less_than: key } },
          ...(exclude === undefined ? [] : [{ id: { not_equals: exclude } }]),
        ],
      },
    })
  ).totalDocs

export function positionField(slug: OrderedCollection): Field {
  return {
    name: 'position',
    label: 'Position',
    type: 'number',
    virtual: true,
    min: 1,
    admin: {
      position: 'sidebar',
      // Virtual fields are read-only in the admin unless this is explicit; the hook saves it.
      readOnly: false,
      step: 1,
      description:
        'Place in the custom order (1 is first). You can also drag rows in the list. Site Settings → Listing order chooses where the custom order is used.',
    },
    hooks: {
      // Only for a single record: lists would need one count per row.
      afterRead: [
        async ({ data, findMany, req }) => {
          if (findMany || typeof data?._order !== 'string') return undefined
          return (await orderedIDsBefore(req, slug, data._order)) + 1
        },
      ],
    },
  }
}

// Moves the record when a Position was entered (or changed). Runs before Payload's own hook,
// which only assigns a key to records that have none.
function applyPosition(slug: OrderedCollection): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req }) => {
    const wanted = Number(data.position)
    delete data.position
    if (!Number.isInteger(wanted) || wanted < 1) return data
    const id = originalDoc?.id as number | string | undefined
    const current = typeof originalDoc?._order === 'string' ? originalDoc._order : null
    if (current && (await orderedIDsBefore(req, slug, current, id)) + 1 === wanted) return data
    const neighbours = await req.payload.find({
      collection: slug,
      req,
      overrideAccess: true,
      depth: 0,
      limit: wanted,
      pagination: false,
      sort: '_order',
      select: { _order: true } as never,
      where: {
        and: [
          { _order: { exists: true } },
          ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
        ],
      },
    })
    const keys = neighbours.docs.map((doc) => (doc as { _order?: string })._order || null)
    const before = keys[wanted - 2] ?? (wanted > 1 ? keys.at(-1) || null : null)
    const after = keys.length >= wanted ? keys[wanted - 1] : null
    data._order = generateKeyBetween(before, after)
    return data
  }
}

// Adds the custom order to a collection config.
export function orderable<T extends CollectionConfig>(slug: OrderedCollection, config: T): T {
  return {
    ...config,
    orderable: true,
    admin: { ...config.admin, defaultSort: '_order' },
    fields: [...config.fields, positionField(slug)],
    hooks: {
      ...config.hooks,
      beforeChange: [applyPosition(slug), ...(config.hooks?.beforeChange || [])],
    },
  }
}
