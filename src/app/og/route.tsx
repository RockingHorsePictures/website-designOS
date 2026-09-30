import { ImageResponse } from 'next/og'
import { cms } from '@/lib/cms'
import { currentSnapshot } from '@/lib/releases'
import { contentCollections, contentPath } from '@/lib/urls'
import { splitLocale } from '@/lib/locales'
import { tokenDefaults, validColor } from '@/design-system/tokens'

// A branded sharing image (1200×630) for pages without their own. It only renders text taken
// from the Live release for the requested path, never arbitrary input.
export async function GET(request: Request) {
  const payload = await cms()
  const snapshot = await currentSnapshot(payload, 'live')
  if (!snapshot) return new Response('Not found', { status: 404 })
  const requested = new URL(request.url).searchParams.get('path') || '/'
  const [locale, path] = splitLocale(requested)
  const body = (locale !== (snapshot.locale || 'en') && snapshot.translations?.[locale]) || snapshot
  let title = ''
  for (const collection of contentCollections)
    for (const doc of body.collections[collection] || [])
      if (contentPath(collection, String(doc.slug)) === path && doc.visibility !== 'password')
        title = String(doc.title)
  const settings = body.globals['site-settings'] as { companyName?: string }
  const theme = body.globals.theme as Record<string, unknown>
  const color = (key: keyof typeof tokenDefaults) =>
    validColor(theme?.[key]) ? (theme[key] as string) : tokenDefaults[key]
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: color('canvas'),
        color: color('text'),
        borderLeft: `24px solid ${color('accent')}`,
      }}
    >
      <div style={{ fontSize: 34, color: color('muted') }}>{settings?.companyName || ''}</div>
      <div style={{ fontSize: title.length > 60 ? 60 : 76, fontWeight: 700, lineHeight: 1.1 }}>
        {(title || settings?.companyName || '').slice(0, 120)}
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}
