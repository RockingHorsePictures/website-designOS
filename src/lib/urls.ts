import { localeCodes } from './locales'

export type ContentCollection = 'pages' | 'case-studies' | 'services' | 'posts'
export const contentCollections: ContentCollection[] = [
  'pages',
  'case-studies',
  'services',
  'posts',
]
// URL prefix for each structured collection; pages sit at the root.
export const collectionBase: Record<ContentCollection, string> = {
  pages: '',
  'case-studies': '/case-studies',
  services: '/services',
  posts: '/blog',
}
export function contentPath(collection: ContentCollection, slug: string) {
  return collection === 'pages'
    ? slug === 'home'
      ? '/'
      : `/${slug}`
    : `${collectionBase[collection]}/${slug}`
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
  'blog',
  'search',
  'setup',
  'connect-ai',
  'og',
  // Language prefixes (/fr/…) are routes too.
  ...localeCodes,
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
// Services whose embed pages may be framed by an Embed section: host and allowed path.
const embedHosts: [string, RegExp][] = [
  ['www.google.com', /^\/maps\/embed/],
  ['www.openstreetmap.org', /^\/export\/embed\.html/],
  ['calendly.com', /^\/[\w-]+/],
  ['cal.com', /^\/[\w-]+/],
  ['open.spotify.com', /^\/embed\//],
  ['w.soundcloud.com', /^\/player\//],
  ['form.typeform.com', /^\/to\//],
  ['docs.google.com', /^\/forms\/.+\/viewform/],
  ['airtable.com', /^\/embed\//],
  ['www.loom.com', /^\/embed\//],
  ['www.figma.com', /^\/embed/],
  ['codepen.io', /\/embed\//],
  ['player.vimeo.com', /^\/video\/\d+/],
  ['www.youtube-nocookie.com', /^\/embed\//],
]
export function embedAllowed(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      embedHosts.some(([host, path]) => url.hostname === host && path.test(url.pathname))
    )
  } catch {
    return false
  }
}
export function validSlug(value: unknown) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
export function vimeoID(value: string) {
  return /^\d+$/.test(value)
    ? value
    : value.match(/^https:\/\/(?:www\.)?vimeo.com\/(\d+)(?:\?.*)?$/)?.[1]
}
