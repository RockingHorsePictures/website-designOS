// Crawl one website origin and write a deterministic SEO/AEO/GEO/schema/accessibility report.
//   npm run audit -- [url] [--max 200] [--out .designos/audits] [--json]
// Only the given origin is crawled, politely (4 concurrent requests, robots-aware for /admin etc.).
// Protected Vercel previews: set VERCEL_AUTOMATION_BYPASS_SECRET to send the bypass header.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import nextEnv from '@next/env'
import {
  analyzePage,
  analyzeSite,
  type PageReport,
  type SiteReport,
} from '../src/lib/audit/analyze'

nextEnv.loadEnvConfig(process.cwd())
const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const target =
  args.find((a) => /^https?:\/\//.test(a)) ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  'http://localhost:3000'
const origin = new URL(target).origin
const max = Math.min(Number(flag('max') || 200), 2000)
const outDir = flag('out') || '.designos/audits'
const headers: Record<string, string> = {
  'User-Agent': 'DesignOS-Audit/1.0 (+site owner audit)',
  ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
    : {}),
}
const skip = /^\/(admin|api|editor|workspace-preview|_next)(\/|$)/

async function get(
  url: string,
  redirects = 0,
): Promise<{
  status: number
  url: string
  redirects: number
  body: string
  headers: Record<string, string>
  ms: number
}> {
  const started = Date.now()
  const res = await fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(20000) })
  const location = res.headers.get('location')
  if (res.status >= 300 && res.status < 400 && location && redirects < 10) {
    await res.body?.cancel()
    const next = new URL(location, url).href
    const result = await get(next, redirects + 1)
    return { ...result, ms: result.ms + (Date.now() - started) }
  }
  const type = res.headers.get('content-type') || ''
  const body = /html|xml|text|json/.test(type) ? await res.text() : (await res.body?.cancel(), '')
  return {
    status: res.status,
    url,
    redirects,
    body,
    headers: Object.fromEntries(res.headers.entries()),
    ms: Date.now() - started,
  }
}
async function optional(url: string) {
  try {
    const r = await get(url)
    return r.status === 200 ? r.body : null
  } catch {
    return null
  }
}
async function sitemapURLs(url: string, depth = 0): Promise<string[] | null> {
  const xml = await optional(url)
  if (!xml) return null
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
    m[1].replace(/&amp;/g, '&'),
  )
  if (/<sitemapindex/i.test(xml) && depth < 2)
    return (await Promise.all(locs.map((l) => sitemapURLs(l, depth + 1))))
      .flat()
      .filter((u): u is string => Boolean(u))
  return locs
}

const robotsText = await optional(`${origin}/robots.txt`)
const sitemap = await sitemapURLs(`${origin}/sitemap.xml`)
const llmsTxt = await optional(`${origin}/llms.txt`)
const queue = [`${origin}/`, ...(sitemap || []).filter((u) => u.startsWith(origin))]
const seen = new Set<string>()
const pages: PageReport[] = []
let inflight = 0
async function worker() {
  while (pages.length + inflight < max) {
    if (!queue.length) {
      // Other workers may still discover links; stop only when nothing is in flight.
      if (!inflight) return
      await new Promise((resolve) => setTimeout(resolve, 50))
      continue
    }
    const url = queue.shift()!
    if (seen.has(url)) continue
    seen.add(url)
    inflight++
    try {
      const r = await get(url)
      const page = analyzePage({
        url,
        status: r.status,
        finalURL: r.url,
        redirects: r.redirects,
        ms: r.ms,
        html: r.body,
        headers: r.headers,
        origin,
      })
      pages.push(page)
      for (const link of page.links)
        if (link.internal && !seen.has(link.href) && !skip.test(new URL(link.href).pathname))
          queue.push(link.href)
      process.stderr.write(`\r${pages.length} pages crawled`)
    } catch (error) {
      pages.push(analyzePage({ url, status: 0, html: '', origin, headers: {} }))
      pages[pages.length - 1].issues.push({
        level: 'blocker',
        area: 'structure',
        url,
        message: `Request failed: ${error instanceof Error ? error.message : error}`,
      })
    } finally {
      inflight--
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker))
process.stderr.write('\n')
// A production site sends indexable pages; previews/local send noindex, so skip launch-only checks.
const production = pages.some((p) => p.indexable)
const report = analyzeSite({ origin, pages, robotsText, sitemapURLs: sitemap, llmsTxt, production })

function markdown(r: SiteReport) {
  const lines = [
    `# Site audit: ${r.origin}`,
    '',
    `Generated ${r.generatedAt}. ${r.pages.length} pages crawled${production ? '' : ' (non-production: pages are noindex, so launch-only checks were skipped)'}.`,
    '',
    `**Score ${r.summary.score}/100** · ${r.summary.blocker} blockers · ${r.summary.warning} warnings · ${r.summary.recommendation} recommendations`,
    '',
    '| Area | Findings |',
    '| --- | --- |',
    ...Object.entries(r.summary.byArea).map(([a, n]) => `| ${a} | ${n} |`),
    '',
    '## Crawler access',
    '',
    `- Search engines: ${Object.entries(r.robots.search)
      .map(([k, v]) => `${k} ${v ? 'allowed' : 'blocked'}`)
      .join(', ')}`,
    `- AI answer engines: ${Object.entries(r.robots.answerEngines).filter(([, v]) => !v).length ? 'some blocked' : 'allowed'}`,
    `- AI training crawlers: ${Object.values(r.robots.training).some(Boolean) ? 'some allowed' : 'blocked'}`,
    `- llms.txt: ${r.llmsTxt.present ? 'present' : 'missing'} · sitemap: ${r.sitemap.present ? `${r.sitemap.urls.length} URLs` : 'missing'}`,
    '',
  ]
  for (const level of ['blocker', 'warning', 'recommendation'] as const) {
    const items = r.issues.filter((i) => i.level === level)
    if (!items.length) continue
    lines.push(`## ${level[0].toUpperCase()}${level.slice(1)}s (${items.length})`, '')
    const grouped = new Map<string, string[]>()
    for (const i of items) {
      const key = `[${i.area}] ${i.message}`
      grouped.set(key, [...(grouped.get(key) || []), i.url || ''])
    }
    for (const [message, urls] of grouped) {
      const where = urls.filter(Boolean)
      lines.push(
        `- ${message}${where.length ? ` — ${where.length > 3 ? `${where.slice(0, 3).join(', ')} +${where.length - 3} more` : where.join(', ')}` : ''}`,
      )
    }
    lines.push('')
  }
  lines.push(
    '## Pages',
    '',
    '| URL | Status | Title | Words | Schema |',
    '| --- | --- | --- | --- | --- |',
  )
  for (const p of r.pages)
    lines.push(
      `| ${p.url.replace(r.origin, '') || '/'} | ${p.status} | ${p.title.replace(/\|/g, '/').slice(0, 60)} | ${p.words} | ${p.jsonLd.types.join(', ')} |`,
    )
  return lines.join('\n') + '\n'
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const dir = path.join(outDir, `${new URL(origin).host.replace(/[^a-z0-9.-]/gi, '_')}-${stamp}`)
mkdirSync(dir, { recursive: true })
// Full page nodes are large; keep the JSON useful for AI tools without every JSON-LD node.
writeFileSync(
  path.join(dir, 'report.json'),
  JSON.stringify(
    {
      ...report,
      pages: report.pages.map((p) => ({
        ...p,
        jsonLd: { types: p.jsonLd.types, errors: p.jsonLd.errors },
      })),
    },
    null,
    2,
  ),
)
writeFileSync(path.join(dir, 'report.md'), markdown(report))
if (args.includes('--json')) console.log(JSON.stringify({ dir, summary: report.summary }))
else
  console.log(
    `Audit of ${origin}: score ${report.summary.score}/100, ${report.summary.blocker} blockers, ${report.summary.warning} warnings, ${report.summary.recommendation} recommendations.\nReport: ${path.join(dir, 'report.md')}`,
  )
