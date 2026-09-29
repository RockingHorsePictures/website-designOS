import { cms, currentUser } from '@/lib/cms'
import { loadSiteAudit } from '@/lib/site-audit-load'

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in to check the site.' }, { status: 401 })
  const payload = await cms()
  return Response.json(await loadSiteAudit(payload, { ...user, collection: 'users' }), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
