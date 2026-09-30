import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale } from './lib/locales'

// Resolves the content channel (/preview, /workspace-preview or Live) and the language prefix
// (/fr/…), then rewrites to the underlying route. Both headers are always overwritten, so
// visitors cannot spoof them.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  const path = request.nextUrl.pathname
  const workspace = path === '/workspace-preview' || path.startsWith('/workspace-preview/')
  const preview = path === '/preview' || path.startsWith('/preview/') || workspace
  headers.set(
    'x-designos-view',
    workspace
      ? 'workspace'
      : preview
        ? 'preview'
        : path.startsWith('/editor/')
          ? 'workspace'
          : 'live',
  )
  let rest = preview
    ? path.slice((workspace ? '/workspace-preview' : '/preview').length) || '/'
    : path
  if (/^\/(admin|api|editor|_next|setup)(\/|$)/.test(rest)) {
    if (preview) return new NextResponse('Not found', { status: 404 })
    headers.set('x-designos-locale', defaultLocale)
    return NextResponse.next({ request: { headers } })
  }
  const first = rest.split('/')[1]
  let locale: string = defaultLocale
  if (isLocale(first)) {
    // The main language has no prefix: /en/about → /about.
    if (first === defaultLocale) {
      const url = request.nextUrl.clone()
      url.pathname = path.replace(`/${first}`, '') || '/'
      return NextResponse.redirect(url, 308)
    }
    locale = first
    rest = rest.slice(first.length + 1) || '/'
  }
  headers.set('x-designos-locale', locale)
  headers.set('x-designos-path', rest)
  if (preview || locale !== defaultLocale) {
    const url = request.nextUrl.clone()
    url.pathname = rest
    const response = NextResponse.rewrite(url, { request: { headers } })
    if (preview) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      response.headers.set('Cache-Control', 'private, no-store')
    }
    return response
  }
  return NextResponse.next({ request: { headers } })
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
