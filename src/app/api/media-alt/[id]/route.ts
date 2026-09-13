import { cms, currentUser } from '@/lib/cms'
import { aiProvider } from '@/lib/ai/runtime'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { reserveAICall } from '@/lib/ai/budget'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  if (process.env.AI_ENABLED !== 'true')
    return Response.json({
      text: '',
      reason: 'Automatic descriptions are disabled. Enter a description manually.',
    })
  const payload = await cms()
  if (!(await reserveAICall(payload)))
    return Response.json(
      { error: 'Daily automatic-description limit reached. You can still edit manually.' },
      { status: 429 },
    )
  const media = await payload.findByID({
    collection: 'media',
    id: Number((await params).id),
    user,
    overrideAccess: false,
  })
  if (media.decorative)
    return Response.json({ text: '', reason: 'Decorative images use an empty description.' })
  if (!media.filename || !media.mimeType?.startsWith('image/'))
    return Response.json({ error: 'No image available.' }, { status: 400 })
  try {
    let bytes: Buffer
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const url = new URL(media.url || '')
      if (!url.hostname.endsWith('.public.blob.vercel-storage.com'))
        throw new Error('Unexpected media host')
      const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' })
      if (!response.ok) throw new Error('Image unavailable')
      bytes = Buffer.from(await response.arrayBuffer())
    } else bytes = await readFile(path.join(process.cwd(), 'media', path.basename(media.filename)))
    if (bytes.length > 8_000_000)
      return Response.json(
        { error: 'Use an image under 8 MB for automatic descriptions.' },
        { status: 400 },
      )
    const result = await aiProvider().suggestAltText({
      image: { base64: bytes.toString('base64'), mimeType: media.mimeType },
      context: media.context || media.caption || '',
      approvedFacts: [],
    })
    return Response.json(result)
  } catch {
    return Response.json(
      { error: 'Automatic description unavailable. Manual descriptions are still available.' },
      { status: 503 },
    )
  }
}
