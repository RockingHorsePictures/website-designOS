import { cms } from '@/lib/cms'
import { codePreview, codePreviewMessage } from '@/lib/code-preview'
import { clientIP, withinLimit } from '@/lib/rate-limit'
import { collectConnection, startConnection } from '@/lib/ai-live/connect'
import { failure, json } from '@/lib/ai-live/http'

// npm run ai:connect -- live <site>: { step: 'start', label } returns a code for the owner to
// approve at /connect-ai; then { step: 'collect', code, secret } until approved. The key is handed
// over once.
export async function POST(request: Request) {
  if (codePreview()) return json({ error: codePreviewMessage() }, 403)
  const payload = await cms()
  const body = (await request.json().catch(() => ({}))) as {
    step?: string
    label?: string
    code?: string
    secret?: string
  }
  try {
    const ip = clientIP(request.headers)
    if (body.step === 'start') {
      if (!(await withinLimit(payload, 'ai-connect-start', ip, 10, 3600)))
        return json({ error: 'Too many connection requests. Try again later.' }, 429)
      const started = await startConnection(payload, String(body.label || ''))
      return json({
        ...started,
        approveURL: `${new URL(request.url).origin}/connect-ai?code=${started.code}`,
      })
    }
    if (body.step === 'collect') {
      if (!(await withinLimit(payload, 'ai-connect-collect', ip, 240, 900)))
        return json({ error: 'Too many requests. Try again later.' }, 429)
      return json(
        await collectConnection(payload, String(body.code || ''), String(body.secret || '')),
      )
    }
    return json({ error: 'Unknown step.' }, 400)
  } catch (error) {
    return failure(error)
  }
}
