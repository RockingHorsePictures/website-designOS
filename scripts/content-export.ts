import nextEnv from '@next/env'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// npm run content:export [-- <file.zip>] [--include-demo]
// Packages this site's content (records, languages, settings and uploaded files) into one zip,
// for importing in another site's admin (Overview → Import content). Read-only: nothing changes
// here. Normally run against the local database a site was designed in.
nextEnv.loadEnvConfig(process.cwd())
const args = process.argv.slice(2)
const includeDemo = args.includes('--include-demo')
const out = path.resolve(
  args.find((a) => !a.startsWith('--')) ||
    `.designos/content-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.zip`,
)
const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')
const { exportContent } = await import('../src/lib/content-transfer/export')
const { writeBundle } = await import('../src/lib/content-transfer/bundle')
const payload = await getPayload({ config })
try {
  console.log(`Exporting content from the ${process.env.SITE_ENV || 'configured'} database…`)
  const bundle = await exportContent(payload, { includeDemo })
  const zip = writeBundle(bundle)
  mkdirSync(path.dirname(out), { recursive: true })
  writeFileSync(out, zip)
  const counts = Object.entries(bundle.manifest.collections)
    .map(([slug, n]) => `  ${slug}: ${n}`)
    .join('\n')
  console.log(
    `\nSaved ${path.relative(process.cwd(), out)} (${(zip.byteLength / 1e6).toFixed(1)} MB)\n\n${counts}\n  settings: ${bundle.manifest.globals.join(', ')}\n  languages: ${bundle.manifest.locales.join(', ')}`,
  )
  const demo = Object.entries(bundle.manifest.skippedDemo)
  if (demo.length)
    console.log(
      `\nLeft out demo records (untick “Demo” on any you want to keep, or pass --include-demo):\n${demo
        .map(([slug, names]) => `  ${slug}: ${names.join(', ')}`)
        .join('\n')}`,
    )
  console.log(
    '\nNext: on the live site, sign in as an administrator and choose Overview → Import content. Everything arrives in the workspace as drafts; review it, then Save to Preview and Publish to Live.',
  )
} finally {
  await payload.destroy()
}
process.exit(0)
