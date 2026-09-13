import { cms, currentUser } from '@/lib/cms'
import { auditContent, type Finding } from '@/lib/quality'
import { contentCollections, type ContentCollection } from '@/lib/urls'
import { schemaFor, type SearchDoc } from '@/lib/search/metadata'
export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in to run quality checks.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  const { collection, data } = (await request.json()) as {
    collection: ContentCollection
    data: SearchDoc
  }
  if (!contentCollections.includes(collection) || !data)
    return Response.json({ error: 'Invalid document.' }, { status: 400 })
  const payload = await cms()
  if (typeof data.heroMedia?.image === 'number')
    data.heroMedia.image = await payload.findByID({
      collection: 'media',
      id: data.heroMedia.image,
      overrideAccess: false,
      user,
    })
  const findings: Finding[] = auditContent(data)
  for (const fact of data.evidence || []) {
    const record =
      typeof fact === 'object'
        ? fact
        : await payload
            .findByID({ collection: 'approved-facts', id: fact, user, overrideAccess: false })
            .catch(() => null)
    if (
      !record ||
      record.verification !== 'verified' ||
      (record.reviewAt && new Date(record.reviewAt) < new Date())
    )
      findings.push({
        level: 'warning',
        field: 'evidence',
        message: 'A supporting fact is unverified, unavailable or due for review.',
      })
  }
  return Response.json({
    findings,
    schema: schemaFor(data, collection, await payload.findGlobal({ slug: 'site-settings' })),
  })
}
