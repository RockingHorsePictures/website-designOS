import { auditContent, type Finding } from './quality'
import { compositionSchema, type Composition } from '../editor/registry/schema'
import { parseBlocks } from './markdown'
import { contentPath, type ContentCollection } from './urls'

// Whole-site checks over the editable workspace: what an owner can fix in the CMS without AI.
// The same report feeds the admin Overview, the audit CLI and the AI tools.
export type SiteFinding = Finding & { target: string; admin?: string }
export type SiteAuditInput = {
  documents: Record<ContentCollection, Record<string, unknown>[]>
  navigation: { primary?: Link[] | null; secondary?: Link[] | null; footer?: Link[] | null }
  settings: Record<string, unknown>
  searchProfile: Record<string, unknown>
  media: {
    id: number
    alt?: string | null
    decorative?: boolean | null
    filename?: string | null
  }[]
  redirects: { from: string; to: string }[]
}
type Link = { label: string; url: string }
export type SiteAudit = {
  generatedAt: string
  score: number
  counts: Record<Finding['level'], number>
  findings: SiteFinding[]
}

function linksIn(composition: Composition): string[] {
  const out: string[] = []
  const visit = (value: unknown, key = '') => {
    if (typeof value === 'string') {
      if (['body', 'intro', 'answer', 'description', 'transcript', 'quote'].includes(key))
        for (const block of parseBlocks(value))
          for (const m of ('items' in block ? block.items.join('\n') : block.text).matchAll(
            /\[[^\]]+\]\(([^)\s]+)\)/g,
          ))
            out.push(m[1])
      else if (key === 'href' && value) out.push(value)
    } else if (Array.isArray(value)) value.forEach((v) => visit(v, key))
    else if (value && typeof value === 'object')
      for (const [k, v] of Object.entries(value)) visit(v, k)
  }
  composition.content.forEach((s) => visit(s.props))
  return out
}
const internalPath = (href: string) => {
  if (!/^\/(?!\/)/.test(href)) return null
  return href.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
}

export function auditSite(input: SiteAuditInput): SiteAudit {
  const findings: SiteFinding[] = []
  const media = Object.fromEntries(input.media.map((m) => [m.id, m]))
  const paths = new Map<string, string>()
  const linked = new Set<string>(['/'])
  const titles = new Map<string, string[]>()
  const descriptions = new Map<string, string[]>()
  const outgoing: { from: string; admin: string; href: string }[] = []
  const labels: Record<ContentCollection, string> = {
    pages: 'Page',
    services: 'Service',
    'case-studies': 'Case study',
  }
  for (const [collection, docs] of Object.entries(input.documents) as [
    ContentCollection,
    Record<string, unknown>[],
  ][])
    for (const doc of docs) {
      if (doc.includeInSite === false) continue
      const path = contentPath(collection, String(doc.slug))
      const target = `${labels[collection]}: ${doc.title}`
      const admin = `/admin/collections/${collection}/${doc.id}`
      paths.set(path, target)
      for (const f of auditContent(doc as Parameters<typeof auditContent>[0], { media }))
        findings.push({ ...f, target, admin })
      const seo = (doc.seo || {}) as { title?: string; description?: string; noindex?: boolean }
      if (!seo.noindex) {
        const title = (seo.title || String(doc.title)).trim().toLowerCase()
        const description = (seo.description || String(doc.summary || '')).trim().toLowerCase()
        titles.set(title, [...(titles.get(title) || []), target])
        if (description)
          descriptions.set(description, [...(descriptions.get(description) || []), target])
      }
      const parsed = compositionSchema.safeParse(doc.composition)
      if (parsed.success)
        for (const href of linksIn(parsed.data as Composition))
          outgoing.push({ from: target, admin, href })
    }
  const add = (level: Finding['level'], target: string, message: string, admin?: string) =>
    findings.push({ level, field: 'site', target, message, admin })
  if (!paths.has('/'))
    add('blocker', 'Site', 'Create a page with the slug "home" to be the homepage.')
  for (const [, targets] of titles)
    if (targets.length > 1)
      add(
        'warning',
        targets.join(', '),
        'These pages share the same search title. Make each one distinct.',
      )
  for (const [, targets] of descriptions)
    if (targets.length > 1)
      add('recommendation', targets.join(', '), 'These pages share the same search description.')

  const redirects = new Map(input.redirects.map((r) => [r.from, r.to]))
  const exists = (path: string) =>
    paths.has(path) ||
    redirects.has(path) ||
    ['/services', '/case-studies', '/team'].includes(path) ||
    /^\/(api|admin)\//.test(path)
  const nav = [
    ...(input.navigation.primary || []),
    ...(input.navigation.secondary || []),
    ...(input.navigation.footer || []),
  ]
  for (const link of nav) {
    const path = internalPath(link.url)
    if (!path) continue
    linked.add(redirects.get(path) || path)
    if (!exists(path))
      add(
        'warning',
        `Navigation: ${link.label}`,
        `Links to ${path}, which is not a page in this site.`,
        '/admin/globals/navigation',
      )
  }
  for (const link of outgoing) {
    const path = internalPath(link.href)
    if (!path) continue
    linked.add(redirects.get(path) || path)
    if (!exists(path))
      add(
        'warning',
        link.from,
        `A section links to ${path}, which is not a page in this site.`,
        link.admin,
      )
  }
  // Records reached from their index pages count as linked when the index itself is linked.
  for (const [path, target] of paths) {
    const index = path.match(/^\/(services|case-studies)\//)?.[1]
    if (linked.has(path) || (index && linked.has(`/${index}`))) continue
    add(
      'recommendation',
      target,
      'Nothing in the navigation or other pages links here, so visitors and crawlers may not find it.',
    )
  }
  const s = input.settings
  const settingsAdmin = '/admin/globals/site-settings'
  if (!String(s.description || '').trim())
    add(
      'recommendation',
      'Site Settings',
      'Add a company description; it is used for search results, sharing and llms.txt.',
      settingsAdmin,
    )
  if (!s.logo) add('recommendation', 'Site Settings', 'Add a main logo.', settingsAdmin)
  if (!s.siteIcon) add('recommendation', 'Site Settings', 'Add a browser icon.', settingsAdmin)
  if (!s.defaultShareImage)
    add(
      'recommendation',
      'Site Settings',
      'Add a default sharing image for links shared on social media and messaging apps.',
      settingsAdmin,
    )
  if (!s.email && !s.phone)
    add(
      'recommendation',
      'Site Settings',
      'Add contact details; they appear in Contact sections and structured data.',
      settingsAdmin,
    )
  const profileAdmin = '/admin/globals/search-profile'
  if (input.searchProfile.allowSearchCrawlers === false)
    add(
      'warning',
      'Search Strategy',
      'Search engines are blocked. The site will not appear in search results.',
      profileAdmin,
    )
  if (input.searchProfile.allowAnswerEngines === false)
    add(
      'recommendation',
      'Search Strategy',
      'AI answer engines are blocked, so assistants such as ChatGPT search, Perplexity and Claude cannot cite the site.',
      profileAdmin,
    )
  const missingAlt = input.media.filter((m) => !m.decorative && !m.alt?.trim())
  if (missingAlt.length)
    add(
      'warning',
      'Media',
      `${missingAlt.length} image(s) have no description and are not marked decorative.`,
      '/admin/collections/media',
    )
  const counts = { blocker: 0, warning: 0, recommendation: 0 }
  for (const f of findings) counts[f.level]++
  const order = { blocker: 0, warning: 1, recommendation: 2 }
  findings.sort((a, b) => order[a.level] - order[b.level])
  return {
    generatedAt: new Date().toISOString(),
    score: Math.max(0, 100 - counts.blocker * 20 - counts.warning * 4 - counts.recommendation),
    counts,
    findings,
  }
}
