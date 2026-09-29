import { describe, it, expect } from 'vitest'
import {
  compositionMedia,
  compositionSchema,
  sectionCatalog,
  sectionMeta,
  sectionSchemas,
  sectionTypes,
} from '../../src/editor/registry/schema'
import { sectionRenderers, pick } from '../../src/components/sections'
import { sectionFields } from '../../src/editor/registry/config'
import { auditContent } from '../../src/lib/quality'
import { parseBlocks, plainText } from '../../src/lib/markdown'
import { schemaFor, sectionSchemas as schemaGraph } from '../../src/lib/search/metadata'
import { auditSite } from '../../src/lib/site-audit'
import { imageSrc, reservedSlugs } from '../../src/lib/urls'
import { changedPaths } from '../../src/lib/releases'

const editorData = {
  projects: [],
  services: [],
  team: [],
  clients: [],
  media: [],
  facts: [],
  contact: {},
}
const withDefaults = (type: (typeof sectionTypes)[number], id = `${type}-1`) => ({
  type,
  props: { id, ...sectionMeta[type].defaults },
})

describe('section registry', () => {
  it('keeps schema, metadata, renderer and composer fields in step', () => {
    const fields = sectionFields(editorData)
    for (const type of sectionTypes) {
      expect(sectionRenderers[type], `${type} renderer`).toBeTypeOf('function')
      expect(fields[type], `${type} fields`).toBeTruthy()
      const props = Object.keys(sectionSchemas[type].shape.props.shape).filter((k) => k !== 'id')
      expect(Object.keys(fields[type]).sort(), `${type} fields cover every prop`).toEqual(
        props.sort(),
      )
      expect(Object.keys(sectionMeta[type].defaults).sort()).toEqual(props.sort())
    }
  })
  it('accepts every section with its defaults and rejects unknown props', () => {
    const content = sectionTypes.map((type) => withDefaults(type))
    expect(compositionSchema.safeParse({ root: { props: {} }, content }).success).toBe(true)
    const extra = { ...withDefaults('Text'), props: { ...withDefaults('Text').props, css: 'x' } }
    expect(compositionSchema.safeParse({ root: {}, content: [extra] }).success).toBe(false)
  })
  it('still accepts compositions saved by version 0.2', () => {
    const legacy = {
      root: { props: {} },
      content: [
        { type: 'Intro', props: { id: 'a', heading: 'H', body: 'B', style: 'plain' } },
        {
          type: 'SelectedProjects',
          props: { id: 'b', heading: 'W', mode: 'featured', projectIds: [], limit: 3 },
        },
        {
          type: 'CallToAction',
          props: { id: 'c', heading: 'N', body: '', label: 'Go', href: '/' },
        },
      ],
      zones: {},
    }
    expect(compositionSchema.safeParse(legacy).success).toBe(true)
  })
  it('rejects unsafe links inside sections and a bad page header option', () => {
    const hero = withDefaults('Hero')
    hero.props = { ...hero.props, primary: { label: 'x', href: 'javascript:alert(1)' } } as never
    expect(compositionSchema.safeParse({ root: {}, content: [hero] }).success).toBe(false)
    expect(
      compositionSchema.safeParse({ root: { props: { pageHeader: 'nope' } }, content: [] }).success,
    ).toBe(false)
  })
  it('finds media referenced anywhere in a composition', () => {
    const gallery = withDefaults('Gallery')
    ;(gallery.props as { items: unknown[] }).items = [
      { media: { image: 7, alt: '', decorative: false }, caption: '' },
    ]
    const hero = withDefaults('Hero')
    ;(hero.props as { media: unknown }).media = { image: 3, alt: '', decorative: false }
    const parsed = compositionSchema.parse({ root: {}, content: [hero, gallery] })
    expect(compositionMedia(parsed as never).sort()).toEqual([3, 7])
  })
  it('describes every section for AI tools as JSON schema', () => {
    const catalog = sectionCatalog()
    expect(catalog.map((s) => s.type)).toEqual(sectionTypes)
    expect(catalog.find((s) => s.type === 'FAQ')!.props).toHaveProperty('properties.items')
  })
  it('selects referenced records in the chosen order without copying them', () => {
    const all = [1, 2, 3].map((id) => ({ id }))
    expect(pick(all, 'manual', [3, 1]).map((r) => r.id)).toEqual([3, 1])
    expect(pick(all, 'all', [], 2).map((r) => r.id)).toEqual([1, 2])
  })
})

describe('text format', () => {
  it('parses paragraphs, subheadings, lists and quotes', () => {
    const blocks = parseBlocks('Intro\n\n## Sub\n\n- a\n- b\n\n1. one\n\n> said')
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'h', 'ul', 'ol', 'quote'])
  })
  it('produces plain text for structured data', () => {
    expect(plainText('**Bold** and [a link](/x).\n\n- one\n- two')).toBe(
      'Bold and a link.\n\none; two',
    )
  })
})

describe('section-aware quality checks', () => {
  const doc = (content: unknown[], root = {}) => ({
    title: 'Page',
    slug: 'page',
    summary: 'A page summary that is long enough to pass the description check here.',
    composition: { root: { props: root }, content },
  })
  it('flags figures and testimonials without approved facts', () => {
    const stats = withDefaults('Stats')
    ;(stats.props as { items: unknown[] }).items = [{ value: '50%', label: 'Faster', factId: null }]
    expect(auditContent(doc([stats])).some((f) => f.field === 'evidence')).toBe(true)
  })
  it('requires a Hero heading when the page header is hidden', () => {
    const findings = auditContent(doc([withDefaults('Text')], { pageHeader: 'hidden' }))
    expect(findings.some((f) => /h1/.test(f.message))).toBe(true)
  })
  it('checks Markdown links and section image descriptions', () => {
    const text = withDefaults('Text')
    ;(text.props as { body: string }).body = '[click here](/about)'
    const media = withDefaults('Media')
    ;(media.props as { media: unknown }).media = { image: 5, alt: '', decorative: false }
    const findings = auditContent(doc([text, media]), { media: { 5: { alt: '' } } })
    expect(findings.some((f) => /describes the destination/.test(f.message))).toBe(true)
    expect(findings.some((f) => /alt text/.test(f.message))).toBe(true)
  })
})

describe('structured data from sections', () => {
  const settings = { companyName: 'Acme', language: 'en-GB', id: 1 } as never
  it('publishes FAQPage only from visible, answered questions', () => {
    const faq = withDefaults('FAQ')
    ;(faq.props as { items: unknown[] }).items = [
      { question: 'What?', answer: 'This.' },
      { question: 'Empty?', answer: '' },
    ]
    const graph = schemaGraph({ root: {}, content: [faq] } as never, 'https://x.test/')
    expect(graph[0]['@type']).toBe('FAQPage')
    expect((graph[0].mainEntity as unknown[]).length).toBe(1)
    ;(faq.props as { structuredData: boolean }).structuredData = false
    expect(schemaGraph({ root: {}, content: [faq] } as never, 'https://x.test/')).toEqual([])
  })
  it('links the organisation, site, page and service by @id', () => {
    const schema = schemaFor(
      {
        id: 1,
        title: 'Design',
        slug: 'design',
        summary: 'S',
        updatedAt: '',
        createdAt: '',
      } as never,
      'services',
      settings,
    )
    const types = schema['@graph'].map((n) => n['@type'])
    expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'WebPage', 'Service']))
    const crumbs = schema['@graph'].find((n) => n['@type'] === 'BreadcrumbList')!
    expect((crumbs.itemListElement as unknown[]).length).toBe(3)
  })
})

describe('site health', () => {
  it('finds broken navigation links, orphans and duplicate titles', () => {
    const page = (id: number, slug: string, title: string, composition?: unknown) => ({
      id,
      slug,
      title,
      summary: 'A useful summary for the page that is long enough.',
      composition,
    })
    const report = auditSite({
      documents: {
        pages: [page(1, 'home', 'Home'), page(2, 'about', 'Same'), page(3, 'hidden', 'Same')],
        services: [],
        'case-studies': [],
      },
      navigation: {
        primary: [
          { label: 'About', url: '/about' },
          { label: 'Gone', url: '/gone' },
        ],
      },
      settings: { companyName: 'Acme' },
      searchProfile: { allowSearchCrawlers: true },
      media: [{ id: 1, alt: '' }],
      redirects: [],
    })
    const messages = report.findings.map((f) => `${f.target}: ${f.message}`)
    expect(messages.some((m) => m.startsWith('Navigation: Gone'))).toBe(true)
    expect(messages.some((m) => m.startsWith('Page: Same') && /Nothing/.test(m))).toBe(true)
    expect(messages.some((m) => /share the same search title/.test(m))).toBe(true)
    expect(report.counts.warning).toBeGreaterThan(0)
  })
})

describe('urls and releases', () => {
  it('serves first-party uploads same-origin and reserves proxy paths', () => {
    expect(imageSrc('http://localhost:3000/api/media/file/a.png')).toBe('/api/media/file/a.png')
    expect(imageSrc('https://x.public.blob.vercel-storage.com/a.png')).toContain('blob')
    expect(reservedSlugs).toEqual(expect.arrayContaining(['preview', 'workspace-preview']))
  })
  it('notifies search engines only about changed or removed Live pages', () => {
    const snap = (docs: Record<string, unknown>[]) =>
      ({
        version: 1,
        collections: { pages: docs, services: [], 'case-studies': [] },
        globals: {},
      }) as never
    const a = { slug: 'a', _status: 'published', updatedAt: '1' }
    const b = { slug: 'b', _status: 'published', updatedAt: '1' }
    expect(changedPaths(snap([a, b]), snap([a, { ...b, updatedAt: '2' }]))).toEqual(['/b'])
    expect(changedPaths(snap([a, b]), snap([a]))).toEqual(['/b'])
    expect(changedPaths(null, snap([{ ...a, demo: true }]))).toEqual([])
  })
})
