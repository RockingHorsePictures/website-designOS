import { draftMode } from 'next/headers'
import { cms, currentUser } from '@/lib/cms'
import { contentCollections, contentPath, type ContentCollection } from '@/lib/urls'
export async function GET(request: Request) {
  const user = await currentUser()
  if (!user) return new Response('Sign in to preview drafts.', { status: 401 })
  const params = new URL(request.url).searchParams
  const collection = params.get('collection') as ContentCollection
  const id = Number(params.get('id'))
  if (!contentCollections.includes(collection) || !Number.isSafeInteger(id) || id <= 0)
    return new Response('Invalid preview.', { status: 400 })
  const doc = await (await cms())
    .findByID({ collection, id, draft: true, overrideAccess: false, user })
    .catch(() => null)
  if (!doc) return new Response('Page not found.', { status: 404 })
  ;(await draftMode()).enable()
  return new Response(null, {
    status: 307,
    headers: {
      Location: `/workspace-preview${contentPath(collection, doc.slug)}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
