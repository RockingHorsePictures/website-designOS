import { cms, currentUser } from '@/lib/cms'
import { dashboard } from '@/lib/dashboard'

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  return Response.json(await dashboard(await cms(), { ...user, collection: 'users' }), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
