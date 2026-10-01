import type { Payload, TypedUser } from 'payload'
import { cms } from '../cms'

// Shared by the /api/ai/* routes. The live AI connection authenticates with its key
// (`Authorization: users API-Key <key>`); people use their normal admin session.

export const json = (body: unknown, status = 200) => Response.json(body, { status })
export const failure = (error: unknown) => {
  const status =
    error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 500
  const message =
    error instanceof Error && status < 500 ? error.message : 'The request failed on the server.'
  const data = (error as { data?: { errors?: { message?: string; path?: string }[] } }).data
  const detail = data?.errors
    ?.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
    .filter(Boolean)
    .join('; ')
  return json({ error: detail ? `${message} (${detail})` : message }, status)
}

export async function aiCaller(
  request: Request,
): Promise<{ payload: Payload; user: TypedUser } | Response> {
  const payload = await cms()
  const { user } = await payload.auth({ headers: request.headers })
  const live = user as (TypedUser & { aiConnection?: string | null }) | null
  if (!live || live.role !== 'ai' || live.aiConnection !== 'live')
    return json(
      {
        error:
          'This AI connection is not valid any more. Reconnect it with: npm run ai:connect -- live <site address>',
      },
      401,
    )
  return { payload, user: { ...live, collection: 'users' } as TypedUser }
}

export const sameOrigin = (request: Request) =>
  request.headers.get('origin') === new URL(request.url).origin
