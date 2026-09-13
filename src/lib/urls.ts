export type ContentCollection = 'pages' | 'case-studies' | 'services'
export const contentCollections: ContentCollection[] = ['pages', 'case-studies', 'services']
export function contentPath(collection: ContentCollection, slug: string) {
  return collection === 'pages' ? (slug === 'home' ? '/' : `/${slug}`) : `/${collection}/${slug}`
}
export function safeLink(value: string): boolean {
  if (/^[\s]|[\\\u0000-\u001f]/.test(value)) return false
  return (
    /^\/(?!\/)/.test(value) ||
    /^https?:\/\/[^\s]+$/i.test(value) ||
    /^mailto:[^\s@]+@[^\s@]+$/.test(value) ||
    /^tel:\+?[0-9 ()-]+$/.test(value)
  )
}
export function absoluteURL(
  path: string,
  origin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
) {
  return new URL(path, origin).href
}
export function validSlug(value: unknown) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
export function vimeoID(value: string) {
  return /^\d+$/.test(value)
    ? value
    : value.match(/^https:\/\/(?:www\.)?vimeo.com\/(\d+)(?:\?.*)?$/)?.[1]
}
