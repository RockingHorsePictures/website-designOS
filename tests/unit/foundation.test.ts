import { describe, it, expect } from 'vitest'
import { safeLink, contentPath, validSlug, vimeoID } from '../../src/lib/urls'
import { tokenStyle } from '../../src/design-system/tokens'
import { compositionSchema } from '../../src/editor/registry/schema'
import { auditContent } from '../../src/lib/quality'
import { indexable, serializeSchema } from '../../src/lib/search/metadata'
import { DisabledAIProvider } from '../../src/lib/ai/providers'

describe('content contracts', () => {
  it('accepts Puck empty zones but rejects unsupported nested layouts', () => {
    expect(compositionSchema.safeParse({ root: {}, content: [], zones: {} }).success).toBe(true)
    expect(
      compositionSchema.safeParse({ root: {}, content: [], zones: { hidden: [] } }).success,
    ).toBe(false)
  })
  it('rejects unknown sections, copied entity content and unsafe links', () => {
    for (const content of [
      [{ type: 'Unknown', props: { id: 'a' } }],
      [
        {
          type: 'SelectedProjects',
          props: {
            id: 'a',
            heading: 'Work',
            mode: 'latest',
            projectIds: [],
            limit: 3,
            title: 'Copied title',
          },
        },
      ],
      [
        {
          type: 'CallToAction',
          props: { id: 'a', heading: 'Next', body: '', label: 'Go', href: 'javascript:alert(1)' },
        },
      ],
    ])
      expect(compositionSchema.safeParse({ root: { props: {} }, content }).success).toBe(false)
  })
  it('keeps stable IDs and approved variants', () => {
    const section = {
      type: 'Intro',
      props: { id: 'one', heading: 'Hello', body: 'Body', style: 'plain' },
    }
    expect(compositionSchema.safeParse({ root: {}, content: [section] }).success).toBe(true)
    expect(compositionSchema.safeParse({ root: {}, content: [section, section] }).success).toBe(
      false,
    )
  })
  it('constrains semantic token values', () => {
    expect(tokenStyle({ accent: '#123456' })).toHaveProperty('--color-accent', '#123456')
    expect(tokenStyle({ accent: 'url(evil)' })).toHaveProperty('--color-accent', '#333333')
  })
})
describe('search and security', () => {
  it('never indexes preview, drafts, demo records or explicit noindex', () => {
    expect(indexable({ _status: 'published' }, '/', false)).toBe(false)
    for (const doc of [
      { _status: 'draft' },
      { _status: 'published', demo: true },
      { _status: 'published', seo: { noindex: true } },
    ])
      expect(indexable(doc, '/', true)).toBe(false)
    expect(indexable({ _status: 'published' }, '/', true)).toBe(true)
  })
  it('escapes script termination in structured data', () => {
    expect(serializeSchema({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
    expect(JSON.parse(serializeSchema({ name: '<test>' })).name).toBe('<test>')
  })
  it('rejects script URLs and protocol-relative links', () => {
    for (const u of ['javascript:alert(1)', '//evil.test', '/\\evil.test', 'data:text/html,x'])
      expect(safeLink(u)).toBe(false)
    for (const u of ['/', '/services/test', 'https://example.com', 'mailto:hello@example.com'])
      expect(safeLink(u)).toBe(true)
  })
  it('maps collection paths and Vimeo IDs consistently', () => {
    expect(contentPath('pages', 'home')).toBe('/')
    expect(contentPath('services', 'test')).toBe('/services/test')
    expect(validSlug('../admin')).toBe(false)
    expect(vimeoID('https://vimeo.com/12345')).toBe('12345')
  })
})
describe('quality and optional AI', () => {
  it('separates blockers from advisory findings', () => {
    const q = auditContent({
      title: 'Demo',
      slug: 'demo',
      summary: 'TODO replace me',
      aiAssisted: true,
    })
    expect(q.some((x) => x.level === 'warning')).toBe(true)
    expect(q.some((x) => x.level === 'blocker')).toBe(false)
    expect(auditContent({}).filter((x) => x.level === 'blocker')).toHaveLength(3)
  })
  it('respects decorative images and per-use descriptions', () => {
    const base = {
      title: 'Test',
      slug: 'test',
      summary: 'A summary',
      heroMedia: { image: { alt: '' } },
    }
    expect(auditContent(base).some((f) => f.field === 'heroMedia')).toBe(true)
    expect(
      auditContent({ ...base, heroMedia: { ...base.heroMedia, decorative: true } }).some(
        (f) => f.field === 'heroMedia',
      ),
    ).toBe(false)
  })
  it('works without runtime AI credentials', async () => {
    const provider = new DisabledAIProvider()
    expect((await provider.suggestAltText()).needsReview).toBe(true)
    expect(await provider.recommend()).toEqual([])
  })
})
