// How collections are ordered wherever they are listed. Owners arrange a custom order by dragging
// rows in the admin list (or typing a Position); Site Settings → Listing order picks, per
// collection, whether the site uses that custom order, dates or titles; list sections can
// override it. The custom order is Payload's `orderable` key (`_order`), a fractional index.
// Pure: used by the CMS config, the site, the composer and tests.

export const listingOrders = ['custom', 'newest', 'oldest', 'az', 'za'] as const
export type ListingOrder = (typeof listingOrders)[number]
export const listingOrderOptions = [
  { label: 'Custom order (drag to arrange)', value: 'custom' },
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'A to Z', value: 'az' },
  { label: 'Z to A', value: 'za' },
] satisfies { label: string; value: ListingOrder }[]

// Collections with a custom order. `setting` is the Site Settings → Listing order field (pages
// are only ordered in the admin and llms.txt, so they have no site setting).
export const orderedCollections = {
  pages: { title: 'title', setting: null, fallback: 'custom' },
  services: { title: 'title', setting: 'services', fallback: 'custom' },
  'case-studies': { title: 'title', setting: 'caseStudies', fallback: 'custom' },
  'team-members': { title: 'name', setting: 'team', fallback: 'custom' },
  posts: { title: 'title', setting: 'posts', fallback: 'newest' },
  categories: { title: 'title', setting: 'categories', fallback: 'custom' },
  clients: { title: 'name', setting: 'clients', fallback: 'az' },
} as const satisfies Record<
  string,
  { title: string; setting: string | null; fallback: ListingOrder }
>
export type OrderedCollection = keyof typeof orderedCollections
export const orderedCollectionSlugs = Object.keys(orderedCollections) as OrderedCollection[]
export const isOrderedCollection = (slug: string): slug is OrderedCollection =>
  slug in orderedCollections
export const isListingOrder = (value: unknown): value is ListingOrder =>
  listingOrders.includes(value as ListingOrder)

// The order a collection uses on the site: the section's choice, else Site Settings, else the
// collection's fallback.
export function listingOrder(
  collection: OrderedCollection,
  settings?: { listingOrder?: Record<string, unknown> | null } | null,
  override?: unknown,
): ListingOrder {
  if (isListingOrder(override)) return override
  const key = orderedCollections[collection].setting
  const chosen = key ? settings?.listingOrder?.[key] : null
  return isListingOrder(chosen) ? chosen : orderedCollections[collection].fallback
}

type Doc = Record<string, unknown>
const dateOf = (doc: Doc) => String(doc.date || doc.publishedAt || doc.createdAt || '')
const idOf = (doc: Doc) => Number(doc.id) || 0
// Fractional keys compare by character code (they only use 0-9 and a-z), never by locale.
const byKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Custom order: the `_order` key; releases captured before 0.5 carry the old numeric `order`.
function customRank(a: Doc, b: Doc) {
  const ka = typeof a._order === 'string' ? a._order : null
  const kb = typeof b._order === 'string' ? b._order : null
  if (ka && kb) return byKey(ka, kb)
  if (ka || kb) return ka ? -1 : 1
  const na = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
  const nb = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
  return na === nb ? 0 : na < nb ? -1 : 1
}

export function compareDocs(collection: OrderedCollection, order: ListingOrder) {
  const titleKey = orderedCollections[collection].title
  const title = (doc: Doc) => String(doc[titleKey] ?? '')
  return (a: Doc, b: Doc) => {
    let result = 0
    if (order === 'custom') result = customRank(a, b)
    else if (order === 'newest') result = byKey(dateOf(b), dateOf(a))
    else if (order === 'oldest') result = byKey(dateOf(a), dateOf(b))
    else {
      result = title(a).localeCompare(title(b), undefined, { sensitivity: 'base', numeric: true })
      if (order === 'za') result = -result
    }
    return result || idOf(a) - idOf(b)
  }
}
export function sortDocs<T extends object>(
  docs: T[],
  collection: OrderedCollection,
  order: ListingOrder,
): T[] {
  const compare = compareDocs(collection, order)
  return [...docs].sort((a, b) => compare(a as Doc, b as Doc))
}

// The equivalent database sort, so limited queries fetch the right records first.
export function querySort(collection: OrderedCollection, order: ListingOrder) {
  const dated = ['services', 'case-studies', 'posts', 'pages'].includes(collection)
  if (order === 'custom') return '_order'
  if (order === 'newest') return dated ? '-publishedAt' : '-createdAt'
  if (order === 'oldest') return dated ? 'publishedAt' : 'createdAt'
  return `${order === 'za' ? '-' : ''}${orderedCollections[collection].title}`
}
