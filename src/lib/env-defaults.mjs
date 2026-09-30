import { createHash } from 'node:crypto'

// Hosted defaults so a site created with the Vercel Deploy Button needs no hand-made settings.
// Explicit environment variables always win; nothing here weakens the data-separation guards:
//  - Production uses the Neon/Blob resources the integration attached to Production.
//  - Code previews are only treated as separate data when DESIGNOS_PREVIEW_DATA=branch, which
//    the owner sets after enabling Neon's per-preview database branches. Otherwise the preview
//    build stops with an explanation instead of touching Production data.
//  - Signing secrets are derived from this site's own database credentials when not supplied,
//    so every site gets distinct secrets without anyone generating them by hand.
/** @param {NodeJS.ProcessEnv} [env] */
export function applyHostedDefaults(env = process.env) {
  const vercel = env.VERCEL_ENV
  if (vercel === 'production') {
    env.SITE_ENV ||= 'production'
    env.DATABASE_ENV ||= 'production'
  } else if (vercel === 'preview' && env.DESIGNOS_PREVIEW_DATA === 'branch') {
    env.SITE_ENV ||= 'preview'
    env.DATABASE_ENV ||= 'preview'
  }
  env.DATABASE_URL ||= env.POSTGRES_URL
  const seed = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL
  if (seed) {
    const derive = (/** @type {string} */ purpose) =>
      createHash('sha256').update(`design-os|${purpose}|${seed}`).digest('base64url')
    env.PAYLOAD_SECRET ||= derive('payload')
    env.CRON_SECRET ||= derive('cron')
  }
  if (!env.NEXT_PUBLIC_SERVER_URL && vercel === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL)
    env.NEXT_PUBLIC_SERVER_URL = `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  return env
}
applyHostedDefaults()
