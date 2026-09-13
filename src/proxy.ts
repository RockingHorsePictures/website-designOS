import { NextResponse, type NextRequest } from 'next/server'
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
  if (preview) {
    const url = request.nextUrl.clone()
    url.pathname = path.slice((workspace ? '/workspace-preview' : '/preview').length) || '/'
    if (/^\/(admin|api|editor|_next)(\/|$)/.test(url.pathname))
      return new NextResponse('Not found', { status: 404 })
    const response = NextResponse.rewrite(url, { request: { headers } })
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
  return NextResponse.next({ request: { headers } })
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
