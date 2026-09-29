import { createHash } from 'node:crypto'
import { z } from 'zod'
import { cms } from '@/lib/cms'

const submission = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
  page: z
    .string()
    .max(500)
    .regex(/^\/(?!\/)[^\s]*$/)
    .catch('/'),
  website: z.string().optional(),
  started: z.coerce.number().optional(),
})

function reply(request: Request, status: number, body: Record<string, unknown>, page = '/') {
  if ((request.headers.get('accept') || '').includes('application/json'))
    return Response.json(body, { status })
  // No-JavaScript fallback: return to the page. Errors fall back to the page without the flag.
  const url = new URL(page, request.url)
  if (status < 300) url.searchParams.set('sent', 'contact')
  url.hash = 'contact'
  return Response.redirect(url, 303)
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const type = request.headers.get('content-type') || ''
  const raw = type.includes('application/json')
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData().catch(() => new FormData())).entries())
  const parsed = submission.safeParse(raw)
  if (!parsed.success)
    return reply(request, 400, { error: 'Check your name, email address and message.' })
  const input = parsed.data
  // Bots fill hidden fields or post instantly: acknowledge without storing anything.
  if (input.website || (input.started && Date.now() - input.started < 2500))
    return reply(request, 200, { ok: true }, input.page)

  const payload = await cms()
  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const senderKey = createHash('sha256')
    .update(`${address}|${process.env.PAYLOAD_SECRET}`)
    .digest('hex')
    .slice(0, 32)
  const recent = await payload.count({
    collection: 'form-submissions',
    where: {
      senderKey: { equals: senderKey },
      createdAt: { greater_than: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    },
  })
  if (recent.totalDocs >= 5)
    return reply(request, 429, { error: 'Too many messages. Please try again later.' }, input.page)

  const referer = request.headers.get('referer') || ''
  const channel = /\/(workspace-)?preview(\/|$|\?)/.test(new URL(referer || request.url).pathname)
    ? 'preview'
    : 'live'
  await payload.create({
    collection: 'form-submissions',
    data: {
      name: input.name,
      email: input.email,
      message: input.message,
      page: input.page,
      channel,
      senderKey,
      status: 'new',
    },
  })
  // Optional notification when SMTP is configured; the enquiry is already safely stored.
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const to = process.env.FORM_NOTIFY_EMAIL || settings.email
  if (process.env.SMTP_HOST && to)
    await payload
      .sendEmail({
        to,
        replyTo: input.email,
        subject: `${channel === 'preview' ? '[Preview] ' : ''}New enquiry from ${input.name}`,
        text: `${input.message}\n\n— ${input.name} <${input.email}>\nPage: ${input.page}`,
      })
      .catch(() => payload.logger.warn('Enquiry stored; notification email failed.'))
  return reply(request, 200, { ok: true }, input.page)
}
