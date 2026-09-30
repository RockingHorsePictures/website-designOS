'use server'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cms } from '@/lib/cms'
import { initializeSite } from '@/lib/setup'
import { sessionCookie } from '@/lib/auth/session'
import { googleEnabled } from '@/lib/auth/google'
import { clientIP, withinLimit } from '@/lib/rate-limit'

export type SetupState = { error?: string }
// The owner chooses DESIGNOS_SETUP_CODE when deploying. Local development needs no code.
export const setupCodeRequired = async () => process.env.SITE_ENV !== 'local'
const sameCode = (given: string, expected: string) => {
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function createOwner(_: SetupState, form: FormData): Promise<SetupState> {
  const payload = await cms()
  if (!(await withinLimit(payload, 'setup', clientIP(await headers()), 10, 900)))
    return { error: 'Too many attempts. Wait a few minutes and try again.' }
  if ((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs)
    return { error: 'This website is already set up. Sign in at /admin.' }
  const expected = process.env.DESIGNOS_SETUP_CODE || ''
  if (await setupCodeRequired()) {
    if (expected.length < 8) return { error: 'Set DESIGNOS_SETUP_CODE first (see below).' }
    if (!sameCode(String(form.get('code') || ''), expected))
      return { error: 'That setup code is not correct.' }
  }
  const name = String(form.get('name') || '')
    .trim()
    .slice(0, 120)
  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase()
  const company = String(form.get('company') || '')
    .trim()
    .slice(0, 120)
  const useGoogle = form.get('method') === 'google' && googleEnabled()
  const password = useGoogle
    ? randomBytes(32).toString('base64url')
    : String(form.get('password') || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (!company) return { error: 'Enter your company or website name.' }
  if (!useGoogle && password.length < 12)
    return { error: 'Choose a password of at least 12 characters.' }
  try {
    const user = await initializeSite(payload, { name, email, password, company })
    if (useGoogle) redirect('/api/auth/google?next=/admin')
    const cookie = await sessionCookie(payload, { ...user, collection: 'users' })
    const [pair, ...attributes] = cookie.split(/;\s*/)
    const [cookieName, ...value] = pair.split('=')
    const options = Object.fromEntries(
      attributes.map((a) => {
        const [k, v] = a.split('=')
        return [k.toLowerCase(), v ?? true]
      }),
    )
    ;(await cookies()).set(cookieName, value.join('='), {
      httpOnly: true,
      path: String(options.path || '/'),
      sameSite: 'lax',
      secure: Boolean(options.secure),
      ...(options.expires ? { expires: new Date(String(options.expires)) } : {}),
    })
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    return { error: 'The administrator could not be created. Check the details and try again.' }
  }
  redirect('/admin?welcome=1')
}
