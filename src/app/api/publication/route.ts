import { cms, currentUser } from '@/lib/cms'
import { changePublication, releaseID } from '@/lib/releases'
export async function GET() {
  const user = await currentUser()
  if (!user) return new Response('Sign in', { status: 401 })
  const state = await (await cms()).findGlobal({ slug: 'publication', depth: 0 })
  return Response.json(
    {
      preview: releaseID(state.previewRelease),
      live: releaseID(state.liveRelease),
      liveChangedAt: state.liveChangedAt,
      canPublish: user.role !== 'ai',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return new Response('Invalid origin', { status: 403 })
  const user = await currentUser()
  if (!user) return new Response('Sign in', { status: 401 })
  try {
    const { action, expected } = await request.json()
    if (expected !== null && (!Number.isSafeInteger(expected) || expected < 1))
      return new Response('Invalid release', { status: 400 })
    await changePublication(await cms(), user, action, expected)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Publication failed.' },
      {
        status:
          typeof error === 'object' && error && 'status' in error ? Number(error.status) : 409,
      },
    )
  }
}
