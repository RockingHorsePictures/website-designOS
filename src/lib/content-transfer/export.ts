import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'
import { bundleFormat, bundleVersion, fileKey, type Bundle, type Doc } from './bundle'
import { transferable, transferableGlobals } from './server'
import { defaultLocale, enabledLocales } from '../locales'
import pkg from '../../../package.json'

// Reads a site's content into a bundle: every collection editors use, every language, the
// site-wide settings and the original uploaded files. Demo records are left out unless asked.
// Secrets and approvals never leave the site.
const secrets = ['protection', 'webhookSecret', 'pagePassword', 'googleSub']
type Slug = 'pages'

export async function exportContent(
  payload: Payload,
  options: {
    includeDemo?: boolean
    source?: string
    only?: (slug: string, doc: Doc) => boolean
  } = {},
): Promise<Bundle> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })
  const locales = enabledLocales(settings as { languages?: unknown })
  const bundle: Bundle = {
    manifest: {
      format: bundleFormat,
      version: bundleVersion,
      designos: pkg.version,
      exportedAt: new Date().toISOString(),
      source: options.source || process.env.SITE_ENV || 'unknown',
      sourceId: sourceIdentity(),
      defaultLocale,
      locales,
      collections: {},
      globals: [],
      skippedDemo: {},
    },
    records: {},
    globals: {},
    files: {},
  }
  const clean = (doc: Record<string, unknown>) => {
    const copy = { ...doc }
    for (const key of secrets) delete copy[key]
    return copy as Doc
  }
  for (const slug of transferable(payload)) {
    const config = payload.collections[slug as Slug].config
    const sort = config.orderable ? '_order' : 'id'
    let keep: Set<string> | null = null
    for (const locale of locales) {
      const { docs } = await payload.find({
        collection: slug as Slug,
        locale: locale as never,
        fallbackLocale: false as never,
        draft: true,
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort,
      })
      if (!keep) {
        const chosen = (docs as unknown as Doc[]).filter((doc) => {
          if (options.only && !options.only(slug, doc)) return false
          if (doc.demo === true && !options.includeDemo) {
            ;(bundle.manifest.skippedDemo[slug] ||= []).push(
              String(doc.title || doc.name || doc.filename || doc.id),
            )
            return false
          }
          return true
        })
        keep = new Set(chosen.map((d) => String(d.id)))
      }
      const selected = (docs as unknown as Doc[]).filter((d) => keep!.has(String(d.id)))
      if (!selected.length) continue
      ;(bundle.records[slug] ||= {})[locale] = selected.map(clean)
    }
    const main = bundle.records[slug]?.[defaultLocale] || []
    if (!main.length) continue
    bundle.manifest.collections[slug] = main.length
    if (config.upload)
      for (const doc of main) bundle.files[fileKey(slug, doc.id)] = await readFile(config, doc)
  }
  for (const global of payload.config.globals.filter((g) =>
    transferableGlobals(payload).includes(g.slug),
  )) {
    for (const locale of locales) {
      const data = (await payload.findGlobal({
        slug: global.slug as 'site-settings',
        locale: locale as never,
        fallbackLocale: false as never,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>
      ;(bundle.globals[global.slug] ||= {})[locale] = clean(data)
    }
    bundle.manifest.globals.push(global.slug)
  }
  return bundle
}

// The database (server and name, never credentials) the content came from.
function sourceIdentity() {
  try {
    const url = new URL(process.env.DATABASE_URL || '')
    return createHash('sha256')
      .update(`${url.hostname.replace('-pooler.', '.')}:${url.port}${url.pathname}`)
      .digest('hex')
      .slice(0, 24)
  } catch {
    return undefined
  }
}

// The original upload: from local storage, or downloaded when the site stores files in the cloud.
async function readFile(
  config: Payload['collections']['media']['config'],
  doc: Doc,
): Promise<{ name: string; data: Uint8Array }> {
  const name = String(doc.filename)
  const upload = (typeof config.upload === 'object' ? config.upload : {}) as { staticDir?: string }
  const dir = path.resolve(process.cwd(), upload.staticDir || config.slug)
  const local = path.join(dir, typeof doc.prefix === 'string' ? doc.prefix : '', name)
  if (existsSync(local)) return { name, data: new Uint8Array(readFileSync(local)) }
  const url = typeof doc.url === 'string' ? doc.url : ''
  const absolute = url.startsWith('http')
    ? url
    : process.env.NEXT_PUBLIC_SERVER_URL
      ? `${process.env.NEXT_PUBLIC_SERVER_URL}${url}`
      : ''
  if (absolute) {
    const response = await fetch(absolute)
    if (response.ok) return { name, data: new Uint8Array(await response.arrayBuffer()) }
  }
  throw new Error(`The file for ${config.slug} “${name}” could not be found.`)
}
