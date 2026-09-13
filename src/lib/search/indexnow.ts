export async function notifyIndexNow(paths: string[], logger: { warn: (message: string) => void }) {
  const key = process.env.INDEXNOW_KEY
  const origin = process.env.NEXT_PUBLIC_SERVER_URL
  if (!key || !origin || process.env.SITE_ENV !== 'production') return
  try {
    const result = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        host: new URL(origin).host,
        key,
        keyLocation: `${origin}/api/indexnow-key`,
        urlList: paths.map((path) => new URL(path, origin).href),
      }),
    })
    if (!result.ok)
      logger.warn(`IndexNow returned ${result.status}; publishing remains successful.`)
  } catch {
    logger.warn('IndexNow unavailable; publishing remains successful.')
  }
}
