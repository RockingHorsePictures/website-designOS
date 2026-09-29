export type ContentCollection = 'pages' | 'case-studies' | 'services'
export const contentCollections: ContentCollection[] = ['pages', 'case-studies', 'services']
export function contentPath(collection: ContentCollection, slug: string) {
  return collection === 'pages' ? (slug === 'home' ? '/' : `/${slug}`) : `/${collection}/${slug}`
}
// Top-level paths owned by the application or its proxy; pages cannot use them as slugs.
export const reservedSlugs = [
  'admin',
  'api',
  'editor',
  'services',
  'case-studies',
  'team',
  'robots',
  'sitemap',
  'preview',
  'workspace-preview',
  'llms',
  'feed',
]
export function safeLink(value: string): boolean {
  if (/^[\s]|[\\\u0000-\u001f]/.test(value)) return false
  return (
    /^\/(?!\/)/.test(value) ||
    /^https?:\/\/[^\s]+$/i.test(value) ||
    /^mailto:[^\s@]+@[^\s@]+$/.test(value) ||
    /^tel:\+?[0-9 ()-]+$/.test(value)
  )
}
// Configured public origin; code-testing deployments fall back to their own Vercel address
// rather than inheriting Production's.
export function siteOrigin() {
  const host = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
  return process.env.NEXT_PUBLIC_SERVER_URL || (host ? `https://${host}` : 'http://localhost:3000')
}
export function absoluteURL(path: string, origin = siteOrigin()) {
  return new URL(path, origin).href
}
// Payload makes first-party upload URLs absolute (serverURL). Serve them as same-origin paths so
// next/image never needs this site's own host allow-listed; external (Blob) URLs pass through.
export function imageSrc(url: string) {
  const match = url.match(/^https?:\/\/[^/]+(\/api\/(?:media|fonts)\/file\/.*)$/)
  return match ? match[1] : url
}
export function validSlug(value: unknown) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
export function vimeoID(value: string) {
  return /^\d+$/.test(value)
    ? value
    : value.match(/^https:\/\/(?:www\.)?vimeo.com\/(\d+)(?:\?.*)?$/)?.[1]
}
