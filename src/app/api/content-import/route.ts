import { cms, currentUser } from '@/lib/cms'
import { codePreview, codePreviewMessage } from '@/lib/code-preview'
import { transferOperation } from '@/lib/content-transfer/server'
import type { Operation } from '@/lib/content-transfer/driver'

// One step of a content import (Overview → Import content). Administrators only; never on a
// code preview. Files arrive as multipart form data, every other step as JSON.
export const maxDuration = 60
export async function POST(request: Request) {
  if (codePreview()) return Response.json({ error: codePreviewMessage() }, { status: 403 })
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  if (user.role !== 'admin')
    return Response.json({ error: 'Only an administrator can import content.' }, { status: 403 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  let op: Operation
  let file: { data: Buffer; name: string } | undefined
  try {
    if ((request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
      const form = await request.formData()
      op = JSON.parse(String(form.get('op')))
      const upload = form.get('file')
      if (upload instanceof File)
        file = { data: Buffer.from(await upload.arrayBuffer()), name: upload.name }
    } else op = await request.json()
  } catch {
    return Response.json({ error: 'The import step could not be read.' }, { status: 400 })
  }
  try {
    return Response.json(await transferOperation(await cms(), user, op, file))
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500
    const message =
      error instanceof Error && status < 500 ? error.message : 'This step failed on the server.'
    // Validation errors name the fields that need attention.
    const data = (error as { data?: { errors?: { message?: string; path?: string }[] } }).data
    const detail = data?.errors
      ?.map((e) => e.path || e.message)
      .filter(Boolean)
      .join(', ')
    return Response.json({ error: detail ? `${message} (${detail})` : message }, { status })
  }
}
