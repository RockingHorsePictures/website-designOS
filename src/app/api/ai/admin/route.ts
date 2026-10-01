import type { TypedUser } from 'payload'
import { cms, currentUser } from '@/lib/cms'
import { codePreview, codePreviewMessage } from '@/lib/code-preview'
import { releaseID } from '@/lib/releases'
import { aiStatus, decideConnection, disconnectAI, setAIEditing } from '@/lib/ai-live/connect'
import { listAIChanges, undoAIChange } from '@/lib/ai-live/changes'
import { failure, json, sameOrigin } from '@/lib/ai-live/http'

// Overview → AI editing. Status and the change list for staff; undo for staff; switching AI edits,
// approving a connection and disconnecting for administrators.
async function staff() {
  const user = await currentUser()
  return user && (user.role === 'admin' || user.role === 'editor') ? user : null
}
export async function GET() {
  const user = await staff()
  if (!user) return json({ error: 'Sign in first.' }, 401)
  const payload = await cms()
  const publication = await payload.findGlobal({ slug: 'publication', depth: 0 })
  const previewID = releaseID(publication.previewRelease)
  const preview = previewID
    ? ((await payload
        .findByID({
          collection: 'site-releases',
          id: previewID,
          depth: 0,
          select: { createdAt: true },
        } as never)
        .catch(() => null)) as { createdAt?: string } | null)
    : null
  const since = preview?.createdAt || null
  return json({
    ...(await aiStatus(payload)),
    canManage: user.role === 'admin',
    since,
    changes: await listAIChanges(payload, since),
  })
}
export async function POST(request: Request) {
  if (codePreview()) return json({ error: codePreviewMessage() }, 403)
  if (!sameOrigin(request)) return json({ error: 'Invalid origin.' }, 403)
  const user = await staff()
  if (!user) return json({ error: 'Sign in first.' }, 401)
  const payload = await cms()
  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    days?: number
    id?: number
    code?: string
    allow?: boolean
  }
  try {
    if (body.action === 'undo')
      return json(
        await undoAIChange(payload, { ...user, collection: 'users' } as TypedUser, Number(body.id)),
      )
    if (user.role !== 'admin')
      return json({ error: 'Only an administrator can change AI access.' }, 403)
    if (body.action === 'editing') {
      const days = Math.max(0, Math.min(30, Number(body.days) || 0))
      await setAIEditing(payload, days ? new Date(Date.now() + days * 86_400_000) : null)
      return json(await aiStatus(payload))
    }
    if (body.action === 'disconnect') {
      await disconnectAI(payload)
      return json(await aiStatus(payload))
    }
    if (body.action === 'decide')
      return json(await decideConnection(payload, String(body.code || ''), Boolean(body.allow)))
    return json({ error: 'Unknown action.' }, 400)
  } catch (error) {
    return failure(error)
  }
}
