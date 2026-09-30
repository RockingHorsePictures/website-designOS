import { beginGoogleSignIn, googleEnabled } from '@/lib/auth/google'

// Starts "Sign in with Google".
export async function GET(request: Request) {
  if (!googleEnabled()) return new Response('Google sign-in is not set up.', { status: 404 })
  const next = new URL(request.url).searchParams.get('next') || '/admin'
  const { url, cookie } = beginGoogleSignIn(next, new URL(request.url).origin)
  return new Response(null, { status: 302, headers: { Location: url, 'Set-Cookie': cookie } })
}
