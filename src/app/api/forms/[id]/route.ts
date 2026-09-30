import { cms } from '@/lib/cms'
import { currentSnapshot } from '@/lib/releases'
import {
  contactForm,
  deliverWebhook,
  publicForm,
  validateSubmission,
  verifyTurnstile,
  type PublicForm,
} from '@/lib/forms'
import { clientIP, senderKey, withinLimit } from '@/lib/rate-limit'
import { isLocale, prefixed } from '@/lib/locales'
import { currentUser } from '@/lib/cms'

// Receives Contact and Form section submissions. Works as JSON (fetch) or a plain form POST
// (no JavaScript), validates against the released form definition, stores the enquiry, then
// sends optional email and webhook notifications.
function samePath(page: unknown, request: Request) {
  if (typeof page !== 'string' || !/^\/(?!\/)[^\s\\]*$/.test(page)) return '/'
  const url = new URL(page, request.url)
  return url.origin === new URL(request.url).origin ? `${url.pathname}${url.search}` : '/'
}
function reply(request: Request, status: number, body: Record<string, unknown>, page = '/') {
  if ((request.headers.get('accept') || '').includes('application/json'))
    return Response.json(body, { status })
  const url = new URL(page, request.url)
  if (status < 300) url.searchParams.set('sent', 'contact')
  else if (typeof body.error === 'string') url.searchParams.set('form_error', body.error)
  url.hash = 'contact'
  return Response.redirect(url, 303)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const { id } = await params
  const type = request.headers.get('content-type') || ''
  const raw = (
    type.includes('application/json')
      ? await request.json().catch(() => ({}))
      : Object.fromEntries((await request.formData().catch(() => new FormData())).entries())
  ) as Record<string, unknown>
  const page = samePath(raw.page, request)
  const referer = request.headers.get('referer') || ''
  const channel = /^\/(workspace-)?preview(\/|$)/.test(
    new URL(referer || request.url, request.url).pathname,
  )
    ? 'preview'
    : 'live'
  // Bots fill hidden fields or post instantly: acknowledge without storing anything.
  const started = Number(raw.started)
  if (raw.website || (started && Date.now() - started < 2500))
    return reply(request, 200, { ok: true }, page)

  const payload = await cms()
  const snapshot = await currentSnapshot(payload, channel)
  if (!snapshot) return reply(request, 404, { error: 'This form is not available.' }, page)
  const locale = isLocale(raw.locale) ? raw.locale : null
  const body = (locale && snapshot.translations?.[locale]) || snapshot
  let form: PublicForm | null = null
  let workspace: Record<string, unknown> | null = null
  if (id === 'contact') form = contactForm
  else if (/^\d+$/.test(id)) {
    const doc = (body.collections as Record<string, Record<string, unknown>[]>).forms?.find(
      (f) => f.id === Number(id),
    )
    if (doc) form = publicForm(doc)
    const workspacePreview = /^\/workspace-preview(\/|$)/.test(
      new URL(referer || request.url, request.url).pathname,
    )
    if (!doc && workspacePreview && (await currentUser()))
      form = publicForm(
        ((await payload
          .findByID({
            collection: 'forms',
            id: Number(id),
            depth: 0,
            overrideAccess: true,
            locale: locale || undefined,
          } as never)
          .catch(() => null)) as unknown as Record<string, unknown>) || { id, fields: [] },
      )
    workspace = (await payload
      .findByID({ collection: 'forms', id: Number(id), depth: 0, overrideAccess: true })
      .catch(() => null)) as unknown as Record<string, unknown> | null
  }
  if (!form) return reply(request, 404, { error: 'This form is not available.' }, page)

  const { data, errors } = validateSubmission(form, raw)
  if (errors.length) return reply(request, 400, { error: errors.join(' ') }, page)
  const ip = clientIP(request.headers)
  if (!(await verifyTurnstile(raw['cf-turnstile-response'], ip)))
    return reply(request, 400, { error: 'Please complete the spam check.' }, page)
  const key = senderKey(request.headers)
  if (
    !(await withinLimit(payload, 'form-sender', key, 5, 600)) ||
    !(await withinLimit(payload, 'form-site', 'all', 60, 60))
  )
    return reply(request, 429, { error: 'Too many messages. Please try again later.' }, page)

  const email = typeof data.email === 'string' ? data.email : ''
  const name = typeof data.name === 'string' ? data.name : email || 'Website visitor'
  const store = id === 'contact' || workspace?.storeSubmissions !== false
  const record = store
    ? await payload.create({
        collection: 'form-submissions',
        data: {
          form: typeof form.id === 'number' ? form.id : undefined,
          name,
          email: email || undefined,
          message: typeof data.message === 'string' ? data.message : undefined,
          data,
          page,
          channel,
          senderKey: key,
          status: 'new',
        },
      })
    : null

  const summary = Object.entries(data)
    .map(([k, v]) => `${form!.fields.find((f) => f.name === k)?.label || k}: ${v}`)
    .join('\n')
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const recipients =
    id === 'contact'
      ? [process.env.FORM_NOTIFY_EMAIL || settings.email].filter(Boolean)
      : String(workspace?.notify || process.env.FORM_NOTIFY_EMAIL || '')
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
  const tasks: Promise<unknown>[] = []
  if (process.env.SMTP_HOST && recipients.length)
    tasks.push(
      payload
        .sendEmail({
          to: recipients.join(','),
          ...(email ? { replyTo: email } : {}),
          subject: `${channel === 'preview' ? '[Preview] ' : ''}New ${workspace?.title || 'enquiry'} from ${name}`,
          text: `${summary}\n\nPage: ${page}`,
        })
        .catch(() => payload.logger.warn('Enquiry stored; notification email failed.')),
    )
  if (workspace?.webhookURL && workspace.webhookSecret)
    tasks.push(
      deliverWebhook(String(workspace.webhookURL), String(workspace.webhookSecret), {
        event: 'form.submitted',
        form: { id: form.id, title: workspace.title },
        submission: record?.id ?? null,
        channel,
        page,
        data,
        createdAt: new Date().toISOString(),
      })
        .then(async (delivery) => {
          if (record)
            await payload.update({
              collection: 'form-submissions',
              id: record.id,
              data: { delivery },
            })
        })
        .catch(() => payload.logger.warn('Enquiry stored; webhook status could not be saved.')),
    )
  await Promise.all(tasks)
  if (form.redirect && !(request.headers.get('accept') || '').includes('application/json'))
    return Response.redirect(
      new URL(samePath(prefixed(form.redirect, page), request), request.url),
      303,
    )
  return reply(request, 200, { ok: true, redirect: form.redirect || null }, page)
}
