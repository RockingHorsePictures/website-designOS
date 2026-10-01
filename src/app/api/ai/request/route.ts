import { readOnlyAI } from '@/cms/access'
import { codePreview } from '@/lib/code-preview'
import { runAIRequest, type AIRequest } from '@/lib/ai-live/request'
import { aiCaller, failure, json } from '@/lib/ai-live/http'

// One read or write by the live AI connection (npm run ai:request -- live …, or the MCP tools).
// JSON for reads and record writes; multipart (`request` JSON plus `file`) for image uploads.
export const maxDuration = 60
export async function POST(request: Request) {
  const caller = await aiCaller(request)
  if (caller instanceof Response) return caller
  const { payload, user } = caller
  try {
    let input: AIRequest
    let upload: { data: Buffer; name: string; mimetype: string; size: number } | undefined
    if ((request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
      const form = await request.formData()
      input = JSON.parse(String(form.get('request')))
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'Attach the image file.' }, 400)
      upload = {
        data: Buffer.from(await file.arrayBuffer()),
        name: file.name,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
      }
    } else input = await request.json()
    return json(
      await runAIRequest(payload, user, input, {
        readOnly: readOnlyAI(user as never) || codePreview(),
        live: true,
        upload,
      }),
    )
  } catch (error) {
    return failure(error)
  }
}
