import type { TypedUser } from 'payload'
import { readOnlyAI } from '@/cms/access'
import { codePreview } from '@/lib/code-preview'
import { aiContext } from '@/lib/ai-context'
import { loadSiteAudit } from '@/lib/site-audit-load'
import { aiCaller, failure, json } from '@/lib/ai-live/http'
import pkg from '../../../../../package.json'

// GET ?for=status | context | health, for the live AI connection.
export const maxDuration = 60
export async function GET(request: Request) {
  const caller = await aiCaller(request)
  if (caller instanceof Response) return caller
  const { payload, user } = caller
  const kind = new URL(request.url).searchParams.get('for') || 'status'
  try {
    if (kind === 'context') return json(await aiContext(payload, user))
    if (kind === 'health') return json(await loadSiteAudit(payload, user))
    const until = (user as TypedUser & { aiWriteUntil?: string | null }).aiWriteUntil || null
    const writable = !readOnlyAI(user as never) && !codePreview()
    return json({
      ready: true,
      site: new URL(request.url).origin,
      designos: pkg.version,
      writable,
      editingUntil: writable ? until : null,
      scope: writable
        ? `Read the live workspace and save drafts until ${until}. Cannot save a Preview, publish, approve, unlock or delete.`
        : 'Read the live workspace. AI edits are switched off (the owner can allow them from Overview → AI editing).',
    })
  } catch (error) {
    return failure(error)
  }
}
