import { describe, it, expect } from 'vitest'
import {
  analyzePage,
  analyzeSite,
  checkSchema,
  crawlerPolicy,
  parseRobots,
  robotsAllows,
} from '../../src/lib/audit/analyze'

const origin = 'https://acme.test'
const html = (body: string, head = '') =>
  `<!doctype html><html lang="en"><head><title>Acme services for people</title>
  <meta name="viewport" content="width=device-width"><meta name="description" content="${'d'.repeat(130)}">
  <link rel="canonical" href="${origin}/">${head}</head><body><main>${body}</main></body></html>`

describe('page analysis', () => {
  it('measures headings, images, links and structured data', () => {
    const page = analyzePage({
      url: `${origin}/`,
      status: 200,
      origin,
      headers: { 'content-type': 'text/html' },
      html: html(
        `<h1>Acme</h1><h3>Skipped</h3><img src="a.png"><a href="/about">here</a><a href="https://x.test">X</a>
         <details><summary>What do you do?</summary><p>Things.</p></details>`,
        `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"${origin}/#organization","name":"Acme"}]}</script>`,
      ),
    })
    expect(page.h1).toEqual(['Acme'])
    expect(page.jsonLd.types).toEqual(['Organization'])
    expect(page.links.filter((l) => l.internal).map((l) => l.href)).toEqual([`${origin}/about`])
    const messages = page.issues.map((i) => i.message).join('\n')
    expect(messages).toMatch(/no alt attribute/)
    expect(messages).toMatch(/skips from h1 to h3/)
    expect(messages).toMatch(/vague text/)
    expect(messages).toMatch(/FAQPage/)
  })
  it('treats noindex headers as not indexable and reports invalid JSON-LD', () => {
    const page = analyzePage({
      url: `${origin}/x`,
      status: 200,
      origin,
      headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow' },
      html: html('<h1>X</h1>', '<script type="application/ld+json">{oops</script>'),
    })
    expect(page.indexable).toBe(false)
    expect(page.jsonLd.errors).toContain('A JSON-LD block is not valid JSON.')
  })
  it('checks required schema properties but ignores @id references', () => {
    expect(checkSchema([{ '@type': 'FAQPage' }]).errors).toEqual([
      'FAQPage is missing required "mainEntity".',
    ])
    expect(checkSchema([{ '@type': 'Organization', '@id': '#org' }]).errors).toEqual([])
  })
})

describe('robots evaluation', () => {
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\n\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nSitemap: ${origin}/sitemap.xml`
  it('applies the most specific group and longest rule', () => {
    const parsed = parseRobots(robots)
    expect(parsed.sitemaps).toEqual([`${origin}/sitemap.xml`])
    expect(robotsAllows(parsed, 'Googlebot', '/')).toBe(true)
    expect(robotsAllows(parsed, 'Googlebot', '/admin/x')).toBe(false)
    expect(robotsAllows(parsed, 'GPTBot', '/')).toBe(false)
    expect(robotsAllows(parsed, 'OAI-SearchBot', '/')).toBe(true)
  })
  it('summarises search, answer-engine and training access', () => {
    const policy = crawlerPolicy(robots)
    expect(policy.search.Googlebot).toBe(true)
    expect(policy.training.GPTBot).toBe(false)
    expect(policy.answerEngines['Claude-SearchBot']).toBe(true)
  })
})

describe('site analysis', () => {
  it('finds broken internal links, duplicate titles and entity inconsistency', () => {
    const page = (path: string, body: string, name = 'Acme') =>
      analyzePage({
        url: `${origin}${path}`,
        status: 200,
        origin,
        headers: { 'content-type': 'text/html' },
        html: html(
          `<h1>T</h1>${body}`,
          `<script type="application/ld+json">{"@type":"Organization","@id":"${origin}/#organization","name":"${name}","url":"${origin}"}</script>`,
        ),
      })
    const missing = analyzePage({ url: `${origin}/gone`, status: 404, origin, html: '' })
    const report = analyzeSite({
      origin,
      pages: [page('/', '<a href="/gone">Gone page</a>'), page('/b', '', 'Acme Ltd'), missing],
      robotsText: 'User-agent: *\nAllow: /',
      sitemapURLs: [`${origin}/`, `${origin}/b`],
      llmsTxt: null,
      production: true,
    })
    const text = report.issues.map((i) => i.message).join('\n')
    expect(text).toMatch(/Broken internal link to https:\/\/acme.test\/gone/)
    expect(text).toMatch(/share the title/)
    expect(text).toMatch(/inconsistently/)
    expect(text).toMatch(/llms.txt/)
    expect(report.summary.blocker).toBeGreaterThan(0)
  })
})
