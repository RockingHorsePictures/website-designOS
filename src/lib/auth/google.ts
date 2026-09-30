// Hosted defaults (derived secrets) must apply before PAYLOAD_SECRET is read.
import '../env'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { siteOrigin } from '../urls'

// "Sign in with Google" (OpenID Connect, authorization code + PKCE). Only people an
// administrator has already added under Users can sign in; nobody is created automatically.
export const googleEnabled = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
// The address the visitor is on (Google checks it against the registered redirect URIs).
export const redirectURI = (origin = siteOrigin()) => `${origin}/api/auth/google/callback`
const COOKIE = 'designos-oauth'
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const b64 = (buf: Buffer) => buf.toString('base64url')
const sign = (value: string) =>
  createHmac('sha256', `${process.env.PAYLOAD_SECRET}|oauth`).update(value).digest('base64url')

type Pending = { state: string; nonce: string; verifier: string; next: string; exp: number }
export function beginGoogleSignIn(next: string, origin?: string) {
  const pending: Pending = {
    state: b64(randomBytes(24)),
    nonce: b64(randomBytes(24)),
    verifier: b64(randomBytes(48)),
    next: /^\/admin(\/|$)/.test(next) ? next : '/admin',
    exp: Date.now() + 10 * 60 * 1000,
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectURI(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: b64(createHash('sha256').update(pending.verifier).digest()),
    code_challenge_method: 'S256',
    prompt: 'select_account',
    ...(process.env.GOOGLE_ALLOWED_DOMAIN ? { hd: process.env.GOOGLE_ALLOWED_DOMAIN } : {}),
  })
  const value = Buffer.from(JSON.stringify(pending)).toString('base64url')
  const secure = process.env.SITE_ENV !== 'local' ? '; Secure' : ''
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    cookie: `${COOKIE}=${value}.${sign(value)}; Path=/api/auth/google; Max-Age=600; HttpOnly; SameSite=Lax${secure}`,
  }
}
export const clearCookie = `${COOKIE}=; Path=/api/auth/google; Max-Age=0; HttpOnly; SameSite=Lax`

function readPending(cookieHeader: string | null): Pending | null {
  const raw = cookieHeader
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  if (!raw) return null
  const [value, signature] = raw.split('.')
  const expected = Buffer.from(sign(value || ''))
  if (!signature || expected.length !== Buffer.from(signature).length) return null
  if (!timingSafeEqual(expected, Buffer.from(signature))) return null
  try {
    const pending = JSON.parse(Buffer.from(value, 'base64url').toString()) as Pending
    return pending.exp > Date.now() ? pending : null
  } catch {
    return null
  }
}

// Exchanges the code and verifies Google's ID token. Returns the verified identity.
export async function finishGoogleSignIn(request: Request) {
  const url = new URL(request.url)
  const pending = readPending(request.headers.get('cookie'))
  if (!pending) throw new SignInError('Your sign-in expired. Please try again.')
  if (url.searchParams.get('error')) throw new SignInError('Google sign-in was cancelled.')
  if (url.searchParams.get('state') !== pending.state)
    throw new SignInError('Sign-in could not be verified. Please try again.')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code') || '',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectURI(url.origin),
      grant_type: 'authorization_code',
      code_verifier: pending.verifier,
    }),
    signal: AbortSignal.timeout(10000),
  })
  const tokens = (await res.json().catch(() => ({}))) as { id_token?: string }
  if (!res.ok || !tokens.id_token) throw new SignInError('Google did not confirm the sign-in.')
  const { payload: claims } = await jwtVerify(tokens.id_token, jwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID!,
  })
  if (claims.nonce !== pending.nonce) throw new SignInError('Sign-in could not be verified.')
  if (claims.email_verified !== true || typeof claims.email !== 'string')
    throw new SignInError('Your Google account email is not verified.')
  const domain = process.env.GOOGLE_ALLOWED_DOMAIN
  if (domain && claims.hd !== domain) throw new SignInError(`Sign in with your ${domain} account.`)
  return {
    sub: String(claims.sub),
    email: claims.email.toLowerCase(),
    name: typeof claims.name === 'string' ? claims.name : '',
    next: pending.next,
  }
}
export class SignInError extends Error {}
