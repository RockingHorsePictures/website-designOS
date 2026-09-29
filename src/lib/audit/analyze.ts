import { parse, type HTMLElement } from 'node-html-parser'
import { answerEngineAgents, trainingAgents } from '../search/crawlers'

// Deterministic page and site analysis for the audit crawler (scripts/audit.ts). Pure functions:
// they take fetched responses and return measurements plus findings. AI review skills read the
// resulting report and add judgement; they should not re-derive these facts by guessing.

export type Level = 'blocker' | 'warning' | 'recommendation'
export type AuditIssue = { level: Level; area: Area; url?: string; message: string }
export type Area = 'seo' | 'aeo' | 'geo' | 'schema' | 'accessibility' | 'performance' | 'structure'
export type PageReport = {
  url: string
  status: number
  finalURL: string
  redirects: number
  ms: number
  bytes: number
  contentType: string
  xRobots: string
  lang: string
  title: string
  description: string
  robots: string
  canonical: string
  og: Record<string, string>
  twitterCard: string
  h1: string[]
  headings: { level: number; text: string }[]
  words: number
  images: { src: string; alt: string | null }[]
  links: { href: string; text: string; internal: boolean }[]
  jsonLd: { types: string[]; errors: string[]; nodes: Record<string, unknown>[] }
  questions: number
  indexable: boolean
  issues: AuditIssue[]
}

const text = (el: HTMLElement | null | undefined) =>
  (el?.textContent || '').replace(/\s+/g, ' ').trim()
const attr = (root: HTMLElement, selector: string, name: string) =>
  root.querySelector(selector)?.getAttribute(name)?.trim() || ''

// Required and recommended properties for common rich-result types (schema.org + search docs).
const schemaRules: Record<string, { required: string[]; recommended?: string[] }> = {
  Organization: { required: ['name'], recommended: ['url', 'logo', 'sameAs'] },
  LocalBusiness: { required: ['name', 'address'], recommended: ['telephone', 'url'] },
  WebSite: { required: ['name', 'url'] },
  WebPage: { required: ['name'], recommended: ['description'] },
  BreadcrumbList: { required: ['itemListElement'] },
  FAQPage: { required: ['mainEntity'] },
  Question: { required: ['name', 'acceptedAnswer'] },
  VideoObject: { required: ['name', 'thumbnailUrl', 'uploadDate'], recommended: ['description'] },
  Article: { required: ['headline'], recommended: ['datePublished', 'author', 'image'] },
  Service: { required: ['name'], recommended: ['provider', 'description'] },
  Product: { required: ['name'], recommended: ['offers', 'image'] },
  Event: { required: ['name', 'startDate', 'location'] },
  Person: { required: ['name'] },
  ImageObject: { required: ['contentUrl'] },
}
function flatten(value: unknown, out: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) value.forEach((v) => flatten(v, out))
  else if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    if ('@type' in node) out.push(node)
    for (const [key, v] of Object.entries(node)) if (key !== '@context') flatten(v, out)
  }
  return out
}
export function checkSchema(nodes: Record<string, unknown>[]) {
  const errors: string[] = []
  const warnings: string[] = []
  for (const node of nodes) {
    const types = ([] as unknown[]).concat(node['@type']).map(String)
    for (const type of types) {
      const rule =
        schemaRules[type] ||
        (['Corporation', 'ProfessionalService', 'NGO'].includes(type)
          ? schemaRules.Organization
          : null)
      if (!rule) continue
      // Nodes that only reference another node by @id are not definitions.
      if ('@id' in node && Object.keys(node).every((k) => ['@type', '@id'].includes(k))) continue
      for (const key of rule.required)
        if (node[key] === undefined || node[key] === '' || node[key] === null)
          errors.push(`${type} is missing required "${key}".`)
      for (const key of rule.recommended || [])
        if (node[key] === undefined) warnings.push(`${type} could add "${key}".`)
    }
  }
  return { errors, warnings }
}

export function analyzePage(input: {
  url: string
  status: number
  finalURL?: string
  redirects?: number
  ms?: number
  html: string
  headers?: Record<string, string>
  origin: string
}): PageReport {
  const issues: AuditIssue[] = []
  const add = (level: Level, area: Area, message: string) =>
    issues.push({ level, area, url: input.url, message })
  const headers = input.headers || {}
  const root = parse(input.html, {
    comment: false,
    blockTextElements: { script: true, style: true },
  })
  const lang = attr(root, 'html', 'lang')
  const title = text(root.querySelector('head title'))
  const description = attr(root, 'meta[name="description"]', 'content')
  const robots = attr(root, 'meta[name="robots"]', 'content').toLowerCase()
  const canonical = attr(root, 'link[rel="canonical"]', 'href')
  const og: Record<string, string> = {}
  for (const m of root.querySelectorAll('meta[property^="og:"]'))
    og[m.getAttribute('property')!.slice(3)] = m.getAttribute('content') || ''
  const twitterCard = attr(root, 'meta[name="twitter:card"]', 'content')
  const xRobots = (headers['x-robots-tag'] || '').toLowerCase()
  const indexable = input.status === 200 && !/noindex/.test(robots) && !/noindex/.test(xRobots)

  // JSON-LD is read before scripts are stripped from the text measurements below.
  const nodes: Record<string, unknown>[] = []
  const jsonErrors: string[] = []
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      flatten(JSON.parse(script.textContent), nodes)
    } catch {
      jsonErrors.push('A JSON-LD block is not valid JSON.')
    }
  }
  const types = [...new Set(nodes.flatMap((n) => ([] as unknown[]).concat(n['@type']).map(String)))]
  const schema = checkSchema(nodes)
  for (const e of [...jsonErrors, ...schema.errors]) add('warning', 'schema', e)
  for (const w of [...new Set(schema.warnings)]) add('recommendation', 'schema', w)

  const main = root.querySelector('main') || root.querySelector('body') || root
  for (const el of main.querySelectorAll('script, style, noscript, template')) el.remove()
  const headings = main
    .querySelectorAll('h1, h2, h3, h4, h5, h6')
    .map((h) => ({ level: Number(h.tagName[1]), text: text(h) }))
  const h1 = root.querySelectorAll('h1').map((h) => text(h))
  const words = text(main).split(' ').filter(Boolean).length
  const images = main.querySelectorAll('img').map((img) => ({
    src: img.getAttribute('src') || '',
    alt: img.hasAttribute('alt') ? img.getAttribute('alt')! : null,
  }))
  const links = root.querySelectorAll('a[href]').flatMap((a) => {
    const raw = a.getAttribute('href')!.trim()
    if (/^(mailto:|tel:|javascript:|#)/i.test(raw)) return []
    try {
      const url = new URL(raw, input.finalURL || input.url)
      url.hash = ''
      const label =
        text(a) || a.querySelector('img')?.getAttribute('alt') || a.getAttribute('aria-label') || ''
      return [{ href: url.href, text: label, internal: url.origin === input.origin }]
    } catch {
      return []
    }
  })
  const questions =
    headings.filter((h) => /\?\s*$/.test(h.text)).length +
    main.querySelectorAll('details > summary').filter((s) => /\?\s*$/.test(text(s))).length

  if (input.status >= 400) add('blocker', 'structure', `Returns HTTP ${input.status}.`)
  if (input.status === 200 && (headers['content-type'] || '').includes('html')) {
    if (!lang) add('warning', 'accessibility', 'The <html> element has no lang attribute.')
    if (!attr(root, 'meta[name="viewport"]', 'content'))
      add('warning', 'seo', 'No viewport meta tag; the page may not be mobile friendly.')
    if (!title) add('blocker', 'seo', 'Missing <title>.')
    else if (title.length > 65)
      add(
        'recommendation',
        'seo',
        `Title is ${title.length} characters; about 60 display in results.`,
      )
    else if (title.length < 15)
      add('recommendation', 'seo', 'Title is very short; describe the page and brand.')
    if (!description) add('warning', 'seo', 'Missing meta description.')
    else if (description.length < 70 || description.length > 170)
      add(
        'recommendation',
        'seo',
        `Meta description is ${description.length} characters; aim for about 120–160.`,
      )
    if (!canonical) add('warning', 'seo', 'No canonical link.')
    if (h1.length === 0) add('warning', 'seo', 'No <h1> heading.')
    if (h1.length > 1)
      add('warning', 'accessibility', `${h1.length} <h1> headings; use one per page.`)
    for (let i = 1; i < headings.length; i++)
      if (headings[i].level > headings[i - 1].level + 1) {
        add(
          'recommendation',
          'accessibility',
          `Heading level skips from h${headings[i - 1].level} to h${headings[i].level} ("${headings[i].text.slice(0, 50)}").`,
        )
        break
      }
    const emptyHeadings = headings.filter((h) => !h.text).length
    if (emptyHeadings) add('warning', 'accessibility', `${emptyHeadings} empty heading(s).`)
    const noAlt = images.filter((i) => i.alt === null).length
    if (noAlt) add('warning', 'accessibility', `${noAlt} image(s) have no alt attribute.`)
    const vague = links.filter((l) =>
      /^(click here|here|more|read more|learn more)$/i.test(l.text),
    ).length
    if (vague)
      add(
        'recommendation',
        'accessibility',
        `${vague} link(s) have vague text such as "read more".`,
      )
    const unlabeled = links.filter((l) => !l.text).length
    if (unlabeled) add('warning', 'accessibility', `${unlabeled} link(s) have no accessible name.`)
    const untitledFrames = main
      .querySelectorAll('iframe')
      .filter((f) => !f.getAttribute('title')).length
    if (untitledFrames)
      add('warning', 'accessibility', `${untitledFrames} iframe(s) have no title.`)
    if (!og.title || !og.description)
      add('recommendation', 'seo', 'Add Open Graph title and description for link previews.')
    if (!og.image)
      add(
        'recommendation',
        'seo',
        'No Open Graph image; shared links will have no preview picture.',
      )
    if (!types.length) add('warning', 'schema', 'No structured data (JSON-LD).')
    if (indexable && words < 150)
      add(
        'recommendation',
        'geo',
        `Only about ${words} words of content; answer engines favour pages that fully answer a question.`,
      )
    if (indexable && questions && !types.includes('FAQPage'))
      add(
        'recommendation',
        'aeo',
        'The page asks and answers questions but has no FAQPage structured data.',
      )
    if ((input.ms || 0) > 1500)
      add('recommendation', 'performance', `Server responded in ${input.ms} ms.`)
    if (input.html.length > 750_000)
      add('recommendation', 'performance', `HTML is ${Math.round(input.html.length / 1024)} KB.`)
  }
  return {
    url: input.url,
    status: input.status,
    finalURL: input.finalURL || input.url,
    redirects: input.redirects || 0,
    ms: input.ms || 0,
    bytes: input.html.length,
    contentType: headers['content-type'] || '',
    xRobots,
    lang,
    title,
    description,
    robots,
    canonical,
    og,
    twitterCard,
    h1,
    headings,
    words,
    images,
    links,
    jsonLd: { types, errors: [...jsonErrors, ...schema.errors], nodes },
    questions,
    indexable,
    issues,
  }
}

// Minimal robots.txt evaluation: the most specific user-agent group, longest matching rule wins.
export type RobotsGroup = { agents: string[]; rules: { allow: boolean; path: string }[] }
export function parseRobots(source: string): { groups: RobotsGroup[]; sitemaps: string[] } {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let current: RobotsGroup | null = null
  let lastWasAgent = false
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'sitemap') sitemaps.push(value)
    else if (key === 'user-agent') {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }))
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    } else if ((key === 'allow' || key === 'disallow') && current)
      current.rules.push({ allow: key === 'allow', path: value })
    lastWasAgent = false
  }
  return { groups, sitemaps }
}
export function robotsAllows(robots: { groups: RobotsGroup[] }, agent: string, path = '/') {
  const ua = agent.toLowerCase()
  const group =
    robots.groups.find((g) => g.agents.includes(ua)) ||
    robots.groups.find((g) => g.agents.includes('*'))
  if (!group) return true
  let best: { allow: boolean; path: string } | null = null
  for (const rule of group.rules) {
    if (!rule.path) continue
    const pattern = new RegExp(
      '^' +
        rule.path
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\\\$$/, '$'),
    )
    if (
      pattern.test(path) &&
      (!best ||
        rule.path.length > best.path.length ||
        (rule.path.length === best.path.length && rule.allow))
    )
      best = rule
  }
  return best ? best.allow : true
}
export function crawlerPolicy(robotsText: string | null) {
  const robots = parseRobots(robotsText || '')
  const check = (agents: string[]) =>
    Object.fromEntries(agents.map((a) => [a, robotsText === null ? true : robotsAllows(robots, a)]))
  return {
    search: check(['Googlebot', 'Bingbot']),
    answerEngines: check(answerEngineAgents),
    training: check(trainingAgents),
    sitemaps: robots.sitemaps,
  }
}

export type SiteReport = {
  origin: string
  generatedAt: string
  pages: PageReport[]
  robots: ReturnType<typeof crawlerPolicy> & { present: boolean }
  sitemap: { present: boolean; urls: string[] }
  llmsTxt: { present: boolean; bytes: number }
  issues: AuditIssue[]
  summary: Record<Level, number> & { score: number; byArea: Record<string, number> }
}
export function analyzeSite(input: {
  origin: string
  pages: PageReport[]
  robotsText: string | null
  sitemapURLs: string[] | null
  llmsTxt: string | null
  production: boolean
}): SiteReport {
  const issues: AuditIssue[] = input.pages.flatMap((p) => p.issues)
  const add = (level: Level, area: Area, message: string, url?: string) =>
    issues.push({ level, area, message, url })
  const ok = input.pages.filter((p) => p.status === 200 && p.contentType.includes('html'))
  const byTitle = new Map<string, string[]>()
  const byDescription = new Map<string, string[]>()
  for (const p of ok.filter((p) => p.indexable)) {
    if (p.title) byTitle.set(p.title, [...(byTitle.get(p.title) || []), p.url])
    if (p.description)
      byDescription.set(p.description, [...(byDescription.get(p.description) || []), p.url])
  }
  for (const [t, urls] of byTitle)
    if (urls.length > 1)
      add(
        'warning',
        'seo',
        `${urls.length} pages share the title "${t.slice(0, 60)}": ${urls.join(', ')}`,
      )
  for (const [, urls] of byDescription)
    if (urls.length > 1)
      add(
        'recommendation',
        'seo',
        `${urls.length} pages share a meta description: ${urls.join(', ')}`,
      )
  const status = new Map(input.pages.map((p) => [p.url, p.status]))
  const linkedFrom = new Map<string, Set<string>>()
  for (const p of ok)
    for (const l of p.links.filter((l) => l.internal)) {
      if (!linkedFrom.has(l.href)) linkedFrom.set(l.href, new Set())
      linkedFrom.get(l.href)!.add(p.url)
    }
  for (const [href, sources] of linkedFrom) {
    const code = status.get(href)
    if (code && code >= 400)
      add(
        'blocker',
        'structure',
        `Broken internal link to ${href} (HTTP ${code}) from ${[...sources].slice(0, 3).join(', ')}`,
      )
  }
  for (const p of input.pages.filter((p) => p.redirects > 1))
    add('recommendation', 'performance', `${p.url} goes through ${p.redirects} redirects.`, p.url)
  const sitemap = new Set(input.sitemapURLs || [])
  if (input.production) {
    if (input.sitemapURLs === null) add('warning', 'seo', 'No sitemap.xml found.')
    if (input.robotsText === null) add('recommendation', 'seo', 'No robots.txt found.')
    for (const p of ok) {
      const canonicalSelf = !p.canonical || p.canonical === p.url || p.canonical === p.finalURL
      if (p.indexable && canonicalSelf && sitemap.size && !sitemap.has(p.url))
        add('recommendation', 'seo', 'Indexable page is missing from the sitemap.', p.url)
      if (sitemap.has(p.url) && !p.indexable)
        add('warning', 'seo', 'The sitemap lists a page that is not indexable.', p.url)
    }
    for (const url of sitemap)
      if (!linkedFrom.has(url) && url !== `${input.origin}/`)
        add(
          'recommendation',
          'structure',
          'Listed in the sitemap but not linked from any crawled page (orphan).',
          url,
        )
  }
  const policy = crawlerPolicy(input.robotsText)
  if (input.production) {
    if (!Object.values(policy.search).every(Boolean))
      add('blocker', 'seo', 'robots.txt blocks major search engines.')
    const blockedAnswer = Object.entries(policy.answerEngines)
      .filter(([, v]) => !v)
      .map(([k]) => k)
    if (blockedAnswer.length)
      add(
        'recommendation',
        'geo',
        `robots.txt blocks AI answer engines (${blockedAnswer.join(', ')}); they cannot cite this site.`,
      )
    if (!input.llmsTxt) add('recommendation', 'geo', 'No /llms.txt summary for AI assistants.')
  }
  // The site's own organisation node (by @id #organization); other orgs (clients) are separate entities.
  const orgs = new Set(
    ok.flatMap((p) =>
      p.jsonLd.nodes
        .filter((n) => String(n['@id'] || '').endsWith('#organization') && n.name)
        .map((n) => String(n.name)),
    ),
  )
  if (orgs.size > 1)
    add(
      'warning',
      'geo',
      `Structured data names the organisation inconsistently: ${[...orgs].join(' / ')}. Use one name so engines recognise one entity.`,
    )
  if (ok.length && !ok.some((p) => p.jsonLd.types.includes('FAQPage')))
    add(
      'recommendation',
      'aeo',
      'No page publishes FAQ structured data. Answering common customer questions on-page helps answer engines.',
    )
  const langs = new Set(ok.map((p) => p.lang).filter(Boolean))
  if (langs.size > 1)
    add('recommendation', 'seo', `Pages declare different languages: ${[...langs].join(', ')}.`)
  const summary = {
    blocker: 0,
    warning: 0,
    recommendation: 0,
    score: 100,
    byArea: {} as Record<string, number>,
  }
  for (const i of issues) {
    summary[i.level]++
    summary.byArea[i.area] = (summary.byArea[i.area] || 0) + 1
  }
  const pages = Math.max(ok.length, 1)
  summary.score = Math.max(
    0,
    Math.round(
      100 -
        summary.blocker * 10 -
        (summary.warning * 20) / pages -
        (summary.recommendation * 5) / pages,
    ),
  )
  return {
    origin: input.origin,
    generatedAt: new Date().toISOString(),
    pages: input.pages,
    robots: { ...policy, present: input.robotsText !== null },
    sitemap: { present: input.sitemapURLs !== null, urls: input.sitemapURLs || [] },
    llmsTxt: { present: Boolean(input.llmsTxt), bytes: input.llmsTxt?.length || 0 },
    issues,
    summary,
  }
}
