import { cms } from '@/lib/cms'
import { currentSnapshot } from '@/lib/releases'
import { accessCookie, accessToken, checkPagePassword } from '@/lib/page-access'
import { clientIP, withinLimit } from '@/lib/rate-limit'

// Checks a protected page's password against the released page and sets an access cookie.
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin)
    return new Response('Invalid origin.', { status: 403 })
  const form = await request.formData().catch(() => new FormData())
  const id = Number(form.get('id'))
  const back = String(form.get('back') || '/')
  const referer = new URL(request.headers.get('referer') || request.url, request.url).pathname
  const channel = /^\/(workspace-)?preview(\/|$)/.test(referer) ? 'preview' : 'live'
  const target = new URL(/^\/(?!\/)[^\s\\]*$/.test(back) ? back : '/', request.url)
  if (target.origin !== new URL(request.url).origin) target.pathname = '/'
  // Return to the address the visitor used (keeps /preview and language prefixes).
  const returnTo = new URL(referer.startsWith('/') ? referer : target.pathname, request.url)
  const payload = await cms()
  if (!(await withinLimit(payload, 'page-access', clientIP(request.headers), 10, 900)))
    return new Response('Too many attempts. Try again in a few minutes.', { status: 429 })
  const snapshot = await currentSnapshot(payload, channel)
  const doc = snapshot?.collections.pages.find((p) => p.id === id)
  const password = String(form.get('password') || '')
  if (!doc || !checkPagePassword(password, doc.pagePassword)) {
    returnTo.searchParams.set('access', 'denied')
    return Response.redirect(returnTo, 303)
  }
  const response = Response.redirect(returnTo, 303)
  const secure = process.env.SITE_ENV !== 'local' ? '; Secure' : ''
  const headers = new Headers(response.headers)
  headers.append(
    'Set-Cookie',
    `${accessCookie(id)}=${accessToken(id, doc.pagePassword)}; Path=/; Max-Age=43200; HttpOnly; SameSite=Lax${secure}`,
  )
  return new Response(null, { status: 303, headers })
}
