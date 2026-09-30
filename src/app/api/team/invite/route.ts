import { randomBytes } from 'node:crypto'
import { cms, currentUser } from '@/lib/cms'
import { googleEnabled } from '@/lib/auth/google'

// Administrators invite teammates by email. The account gets an unusable random password: the
// person signs in with Google (if set up) or sets their own password from the emailed link.
export async function POST(request: Request) {
  const user = await currentUser()
  if (user?.role !== 'admin')
    return Response.json({ error: 'Only administrators can invite people.' }, { status: 403 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    email?: string
    role?: string
  }
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const name =
    String(body.name || '')
      .trim()
      .slice(0, 120) || email
  const role = body.role === 'admin' ? 'admin' : 'editor'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  const payload = await cms()
  if ((await payload.count({ collection: 'users', where: { email: { equals: email } } })).totalDocs)
    return Response.json({ error: 'That person already has an account.' }, { status: 409 })
  await payload.create({
    collection: 'users',
    data: { name, email, role, password: randomBytes(32).toString('base64url') },
    user,
    overrideAccess: false,
  })
  let emailed = false
  if (process.env.SMTP_HOST)
    try {
      await payload.forgotPassword({ collection: 'users', data: { email }, disableEmail: false })
      emailed = true
    } catch {}
  return Response.json({
    ok: true,
    message: googleEnabled()
      ? `${name} can now sign in with Google using ${email}.${emailed ? ' We also emailed a link to set a password.' : ''}`
      : emailed
        ? `We emailed ${email} a link to set their password.`
        : `Account created. Email is not set up, so ask ${name} to use "Forgot password" on the sign-in page once email is connected, or set a password for them under Users.`,
  })
}
