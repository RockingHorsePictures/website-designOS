import { cms, currentUser } from '@/lib/cms'
import { aiContext } from '@/lib/ai-context'

export async function GET() {
  const user = await currentUser()
  if (!user)
    return Response.json({ error: 'Sign in to download your website context.' }, { status: 401 })
  return Response.json(await aiContext(await cms(), user), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="website-ai-context.json"',
    },
  })
}
