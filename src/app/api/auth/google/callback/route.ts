import { cms } from '@/lib/cms'
import { clearCookie, finishGoogleSignIn, googleEnabled, SignInError } from '@/lib/auth/google'
import { sessionCookie } from '@/lib/auth/session'
import { clientIP, withinLimit } from '@/lib/rate-limit'
import type { TypedUser } from 'payload'

function back(request: Request, message: string) {
  const url = new URL('/admin/login', request.url)
  url.searchParams.set('sso', message)
  const headers = new Headers({ Location: url.href })
  headers.append('Set-Cookie', clearCookie)
  return new Response(null, { status: 302, headers })
}
// Completes Google sign-in for a person already added under Users.
export async function GET(request: Request) {
  if (!googleEnabled()) return new Response('Google sign-in is not set up.', { status: 404 })
  const payload = await cms()
  if (!(await withinLimit(payload, 'auth-google', clientIP(request.headers), 30, 900)))
    return back(request, 'Too many attempts. Wait a few minutes.')
  try {
    const identity = await finishGoogleSignIn(request)
    const bySub = await payload.find({
      collection: 'users',
      where: { googleSub: { equals: identity.sub } },
      limit: 1,
      overrideAccess: true,
    })
    const byEmail = bySub.docs[0]
      ? null
      : await payload.find({
          collection: 'users',
          where: { email: { equals: identity.email } },
          limit: 1,
          overrideAccess: true,
        })
    const user = (bySub.docs[0] || byEmail?.docs[0]) as TypedUser | undefined
    if (!user)
      return back(request, 'This Google account has not been invited. Ask an administrator.')
    if (user.role === 'ai') return back(request, 'Connection accounts cannot sign in here.')
    if (user.googleSub && user.googleSub !== identity.sub)
      return back(request, 'This account is linked to a different Google account.')
    if (user.lockUntil && new Date(user.lockUntil) > new Date())
      return back(request, 'This account is temporarily locked.')
    // Link the stable Google ID on first sign-in (email matched an invited user).
    if (!user.googleSub)
      await payload.db.updateOne({
        collection: 'users',
        id: user.id,
        data: { googleSub: identity.sub },
      })
    const headers = new Headers({ Location: new URL(identity.next, request.url).href })
    headers.append('Set-Cookie', await sessionCookie(payload, { ...user, collection: 'users' }))
    headers.append('Set-Cookie', clearCookie)
    return new Response(null, { status: 302, headers })
  } catch (error) {
    return back(
      request,
      error instanceof SignInError ? error.message : 'Google sign-in failed. Please try again.',
    )
  }
}
