import { describe, it, expect } from 'vitest'
import { enabledLocales, localePath, splitLocale, defaultLocale } from '../../src/lib/locales'
import { prefixed } from '../../src/components/site/SiteLink'
import { validateSubmission, contactForm, publicForm } from '../../src/lib/form-definitions'
import { privateAddress, safeWebhookTarget } from '../../src/lib/forms'
import {
  accessToken,
  checkPagePassword,
  hashPagePassword,
  hasPageAccess,
} from '../../src/lib/page-access'
import { searchDocuments, lexicalText } from '../../src/lib/site-search'
import { embedAllowed } from '../../src/lib/urls'
import { applyHostedDefaults } from '../../src/lib/env-defaults.mjs'
import {
  allSections,
  blockCompositionSchema,
  compositionSchema,
  sectionMeta,
} from '../../src/editor/registry/schema'
import { auditContent } from '../../src/lib/quality'

const section = (type: keyof typeof sectionMeta, id: string, extra = {}) => ({
  type,
  props: { id, ...sectionMeta[type].defaults, ...extra },
})

describe('languages', () => {
  it('maps paths to and from language prefixes; the main language has none', () => {
    expect(defaultLocale).toBe('en')
    expect(localePath('/about', 'fr')).toBe('/fr/about')
    expect(localePath('/', 'fr')).toBe('/fr')
    expect(localePath('/about', 'en')).toBe('/about')
    expect(splitLocale('/fr/blog/x')).toEqual(['fr', '/blog/x'])
    expect(splitLocale('/fr')).toEqual(['fr', '/'])
    expect(splitLocale('/about')).toEqual(['en', '/about'])
  })
  it('always publishes the main language first and ignores unknown codes', () => {
    expect(enabledLocales({ languages: ['de', 'xx', 'en', 'fr'] })).toEqual(['en', 'de', 'fr'])
    expect(enabledLocales(null)).toEqual(['en'])
  })
  it('keeps preview and language prefixes on internal links only', () => {
    expect(prefixed('/about', '/preview/fr/team')).toBe('/preview/fr/about')
    expect(prefixed('/', '/fr/x')).toBe('/fr')
    expect(prefixed('/', '/preview')).toBe('/preview')
    expect(prefixed('/about', '/team')).toBe('/about')
    expect(prefixed('https://example.com', '/fr/x')).toBe('https://example.com')
    expect(prefixed('/admin', '/fr/x')).toBe('/admin')
  })
})

describe('forms', () => {
  const form = publicForm({
    id: 3,
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true },
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        options: [{ label: 'Small', value: 's' }],
      },
      { name: 'agree', label: 'Agree', type: 'checkbox', required: true },
    ],
    submitLabel: 'Go',
    successMessage: 'Thanks',
  })
  it('validates against the form and drops unknown input', () => {
    const ok = validateSubmission(form, { email: 'a@b.co', size: 's', agree: 'on', extra: 'x' })
    expect(ok.errors).toEqual([])
    expect(ok.data).toEqual({ email: 'a@b.co', size: 's', agree: true })
    const bad = validateSubmission(form, { email: 'nope', size: 'huge' })
    expect(bad.errors).toHaveLength(3)
    expect(
      validateSubmission(contactForm, { name: 'A', email: 'a@b.co', message: 'Hi' }).errors,
    ).toEqual([])
  })
  it('never sends webhooks to private, loopback or metadata addresses', async () => {
    for (const ip of [
      '10.0.0.1',
      '127.0.0.1',
      '169.254.169.254',
      '192.168.1.5',
      '172.20.0.1',
      '::1',
      'fd00::1',
      '::ffff:10.0.0.1',
    ])
      expect(privateAddress(ip), ip).toBe(true)
    for (const ip of [
      '::ffff:7f00:1',
      '::127.0.0.1',
      '64:ff9b::a9fe:a9fe',
      '::ffff:0:7f00:1',
      '2002:7f00:1::',
      '198.18.0.1',
      'not-an-ip',
    ])
      expect(privateAddress(ip), ip).toBe(true)
    expect(privateAddress('8.8.8.8')).toBe(false)
    expect(privateAddress('2606:4700::1111')).toBe(false)
    expect(await safeWebhookTarget('https://[::ffff:127.0.0.1]/')).toBe(false)
    expect(await safeWebhookTarget('https://[::ffff:169.254.169.254]/')).toBe(false)
    expect(await safeWebhookTarget('https://169.254.169.254/latest')).toBe(false)
    expect(await safeWebhookTarget('http://8.8.8.8/hook')).toBe(false)
    expect(await safeWebhookTarget('https://user:pw@8.8.8.8/hook')).toBe(false)
    expect(await safeWebhookTarget('https://8.8.8.8/hook')).toBe(true)
  })
})

describe('protected pages', () => {
  it('stores only a salted hash and binds access to the page and password', () => {
    const stored = hashPagePassword('secret-words')
    expect(stored).not.toContain('secret-words')
    expect(checkPagePassword('secret-words', stored)).toBe(true)
    expect(checkPagePassword('wrong', stored)).toBe(false)
    const token = accessToken(4, stored)
    expect(hasPageAccess({ id: 4, pagePassword: stored }, token)).toBe(true)
    expect(hasPageAccess({ id: 5, pagePassword: stored }, token)).toBe(false)
    expect(hasPageAccess({ id: 4, pagePassword: hashPagePassword('new') }, token)).toBe(false)
  })
})

describe('site search', () => {
  it('requires every term and ranks title matches first, skipping protected pages', () => {
    const docs = [
      {
        collection: 'pages' as const,
        doc: { title: 'Brand films', slug: 'films', summary: 'Video work' },
      },
      {
        collection: 'posts' as const,
        doc: { title: 'News', slug: 'news', summary: 'We made brand films' },
      },
      {
        collection: 'pages' as const,
        doc: { title: 'Brand films secret', slug: 's', visibility: 'password' },
      },
    ]
    const hits = searchDocuments('brand films', docs)
    expect(hits.map((h) => h.path)).toEqual(['/films', '/blog/news'])
    expect(searchDocuments('brand zebra', docs)).toEqual([])
  })
  it('reads text from rich text', () => {
    expect(
      lexicalText({ root: { children: [{ children: [{ text: 'Hello' }, { text: 'world' }] }] } }),
    ).toContain('Hello')
  })
})

describe('embeds, hosting defaults and layout', () => {
  it('allows only listed embed providers over https', () => {
    expect(embedAllowed('https://www.google.com/maps/embed?pb=1')).toBe(true)
    expect(embedAllowed('https://calendly.com/acme/intro')).toBe(true)
    expect(embedAllowed('http://www.google.com/maps/embed')).toBe(false)
    expect(embedAllowed('https://evil.example/embed')).toBe(false)
    expect(embedAllowed('javascript:alert(1)')).toBe(false)
  })
  it('derives hosted settings without weakening preview separation', () => {
    const production = applyHostedDefaults({
      VERCEL_ENV: 'production',
      DATABASE_URL: 'postgres://a',
    } as never)
    expect(production.SITE_ENV).toBe('production')
    expect(production.PAYLOAD_SECRET!.length).toBeGreaterThanOrEqual(32)
    const other = applyHostedDefaults({
      VERCEL_ENV: 'production',
      DATABASE_URL: 'postgres://b',
    } as never)
    expect(other.PAYLOAD_SECRET).not.toBe(production.PAYLOAD_SECRET)
    expect(
      applyHostedDefaults({ VERCEL_ENV: 'preview', DATABASE_URL: 'x' } as never).DATABASE_ENV,
    ).toBeUndefined()
    expect(
      applyHostedDefaults({ VERCEL_ENV: 'preview', DESIGNOS_PREVIEW_DATA: 'branch' } as never)
        .DATABASE_ENV,
    ).toBe('preview')
    expect(
      applyHostedDefaults({ PAYLOAD_SECRET: 'keep', DATABASE_URL: 'x' } as never).PAYLOAD_SECRET,
    ).toBe('keep')
  })
  it('nests sections in columns (one level), with unique IDs everywhere', () => {
    const columns = section('Columns', 'c', {
      first: [section('Text', 't1')],
      second: [section('FAQ', 'f1')],
    })
    const ok = { root: {}, content: [columns] }
    expect(compositionSchema.safeParse(ok).success).toBe(true)
    expect(allSections(ok.content as never).map((s) => s.props.id)).toEqual(['c', 't1', 'f1'])
    const nested = {
      root: {},
      content: [section('Columns', 'c', { first: [section('Columns', 'd')] })],
    }
    expect(compositionSchema.safeParse(nested).success).toBe(false)
    const duplicate = {
      root: {},
      content: [section('Columns', 'c', { first: [section('Text', 'c')] })],
    }
    expect(compositionSchema.safeParse(duplicate).success).toBe(false)
  })
  it('keeps reusable blocks from containing blocks, and checks new sections', () => {
    const block = { root: {}, content: [section('GlobalBlock', 'g', { blockId: 1 })] }
    expect(compositionSchema.safeParse(block).success).toBe(true)
    expect(blockCompositionSchema.safeParse(block).success).toBe(false)
    const findings = auditContent({
      title: 'x',
      slug: 'x',
      summary: 'A summary that is long enough to avoid the description warning here.',
      composition: {
        root: {},
        content: [
          section('Form', 'f'),
          section('Columns', 'c', {
            first: [section('Embed', 'e', { url: 'https://www.google.com/maps/embed?pb=1' })],
          }),
        ],
      },
    })
    expect(findings.some((f) => /choose a form/.test(f.message))).toBe(true)
    expect(findings.some((f) => /embed a title/.test(f.message))).toBe(true)
  })
})

describe('Vercel Blob OIDC storage', () => {
  it('derives the public host from a connected store ID', async () => {
    const { blobStoreBaseURL } = await import('@/cms/storage/vercel-blob-oidc')
    expect(blobStoreBaseURL('store_i1h9YyqmOudQwJsT')).toBe(
      'https://i1h9yyqmoudqwjst.public.blob.vercel-storage.com',
    )
  })
})

describe('updates workflow', () => {
  it('matches the repository workflow and links to a prefilled GitHub file', async () => {
    const { readFileSync } = await import('node:fs')
    const { updateWorkflow, updateWorkflowLink } = await import('@/lib/update-workflow')
    expect(updateWorkflow).toBe(
      readFileSync('.github/workflows/designos-update.yml', 'utf8').replaceAll('\r\n', '\n'),
    )
    const link = new URL(updateWorkflowLink('acme', 'site'))
    expect(link.pathname).toBe('/acme/site/new/main')
    expect(link.searchParams.get('filename')).toBe('.github/workflows/designos-update.yml')
    expect(link.searchParams.get('value')).toBe(updateWorkflow)
  })
})

describe('preview database check', () => {
  it('treats pooled and direct hosts of one database as the same, and branches as different', async () => {
    const { databaseFingerprint } = await import('../../scripts/database-identity.mjs')
    const live = databaseFingerprint(
      'postgres://u:p@ep-cool-sun-123-pooler.eu-west-2.aws.neon.tech/db',
    )
    expect(databaseFingerprint('postgres://u:p@ep-cool-sun-123.eu-west-2.aws.neon.tech/db')).toBe(
      live,
    )
    expect(
      databaseFingerprint('postgres://u:p@ep-other-456-pooler.eu-west-2.aws.neon.tech/db'),
    ).not.toBe(live)
  })
})

describe('listing order', () => {
  const docs = [
    { id: 1, title: 'banana', _order: 'a1', publishedAt: '2026-01-02' },
    { id: 2, title: 'Apple', _order: 'a105', publishedAt: '2026-03-01' },
    { id: 3, title: 'cherry', _order: 'a2', publishedAt: '2025-12-31' },
  ]
  it('orders by custom key (by character code), dates and titles', async () => {
    const { sortDocs } = await import('@/lib/ordering')
    const ids = (order: Parameters<typeof sortDocs>[2]) =>
      sortDocs(docs, 'services', order).map((d) => d.id)
    // 'a105' sits between 'a1' and 'a2'; a numeric locale compare would put it last.
    expect(ids('custom')).toEqual([1, 2, 3])
    expect(ids('newest')).toEqual([2, 1, 3])
    expect(ids('oldest')).toEqual([3, 1, 2])
    expect(ids('az')).toEqual([2, 1, 3])
    expect(ids('za')).toEqual([3, 1, 2])
  })
  it('falls back to the old numeric order in releases captured before custom keys', async () => {
    const { sortDocs } = await import('@/lib/ordering')
    const legacy = [
      { id: 1, order: 3 },
      { id: 2, order: 1 },
      { id: 3, order: 2 },
    ]
    expect(sortDocs(legacy, 'team-members', 'custom').map((d) => d.id)).toEqual([2, 3, 1])
  })
  it('uses a section choice, then Site Settings, then the collection default', async () => {
    const { listingOrder } = await import('@/lib/ordering')
    const settings = { listingOrder: { services: 'az', posts: 'custom' } }
    expect(listingOrder('services', settings, 'newest')).toBe('newest')
    expect(listingOrder('services', settings, 'default')).toBe('az')
    expect(listingOrder('posts', settings)).toBe('custom')
    expect(listingOrder('posts', null)).toBe('newest')
    expect(listingOrder('clients', {})).toBe('az')
  })
  it('keeps hand-picked records in their chosen order and "Latest" newest first', async () => {
    const { pick } = await import('@/components/sections')
    expect(
      pick(docs, 'manual', [3, 1], 10, undefined, { collection: 'services', order: 'az' }).map(
        (d) => d.id,
      ),
    ).toEqual([3, 1])
    expect(
      pick(docs, 'latest', [], 10, undefined, { collection: 'posts' }).map((d) => d.id),
    ).toEqual([2, 1, 3])
    expect(
      pick(docs, 'all', [], 2, undefined, { collection: 'services', order: 'za' }).map((d) => d.id),
    ).toEqual([3, 1])
  })
})

describe('content transfer', () => {
  const collections = [
    'media',
    'case-studies',
    'services',
    'team-members',
    'awards',
    'sectors',
    'categories',
    'approved-facts',
    'forms',
  ]
  it('recognises section props named after a collection', async () => {
    const { referencedCollection } = await import('@/lib/content-transfer/remap')
    expect(referencedCollection('projectIds', collections)).toBe('case-studies')
    expect(referencedCollection('memberIds', collections)).toBe('team-members')
    expect(referencedCollection('awardIds', collections)).toBe('awards')
    expect(referencedCollection('sectorIds', collections)).toBe('sectors')
    expect(referencedCollection('categoryId', collections)).toBe('categories')
    expect(referencedCollection('factId', collections)).toBe('approved-facts')
    expect(referencedCollection('formId', collections)).toBe('forms')
    expect(referencedCollection('vimeoId', collections)).toBeNull()
  })
  it('rewrites references in compositions and never keeps a source ID', async () => {
    const { Remapper } = await import('@/lib/content-transfer/remap')
    const remap = new Remapper({ 'case-studies': { '5': 50 }, media: { '7': 70 } }, collections)
    const out = remap.json(
      {
        content: [
          {
            type: 'X',
            props: {
              projectIds: [5, 6],
              poster: { image: 7, alt: '', decorative: true },
              vimeoId: '123456',
              widgetIds: [3],
            },
          },
        ],
      },
      'page',
    ) as { content: { props: Record<string, unknown> }[] }
    expect(out.content[0].props.projectIds).toEqual([50])
    expect(out.content[0].props.poster).toEqual({ image: 70, alt: '', decorative: true })
    expect(out.content[0].props.vimeoId).toBe('123456')
    expect(remap.report.unresolved).toEqual(['page.content[0].props.projectIds → case-studies #6'])
    expect(remap.report.unknown).toEqual(['page.content[0].props.widgetIds'])
  })
  it('rewrites rich text uploads and internal links, dropping ones it cannot place', async () => {
    const { Remapper } = await import('@/lib/content-transfer/remap')
    const remap = new Remapper({ media: { '1': 10 }, services: { '2': 20 } }, collections)
    const out = JSON.stringify(
      remap.richText(
        {
          root: {
            children: [
              { type: 'upload', relationTo: 'media', value: 1 },
              { type: 'upload', relationTo: 'media', value: 9 },
              {
                type: 'link',
                fields: { linkType: 'internal', doc: { relationTo: 'services', value: 2 } },
                children: [],
              },
            ],
          },
        },
        'doc',
      ),
    )
    expect(out).toContain('"value":10')
    expect(out).not.toContain('"value":9')
    expect(out).toContain('"value":20')
  })
  it('round-trips a bundle through a zip', async () => {
    const { readBundle, writeBundle } = await import('@/lib/content-transfer/bundle')
    const bundle = {
      manifest: {
        format: 'designos-content' as const,
        version: 1,
        designos: 'x',
        exportedAt: 'now',
        source: 'local',
        defaultLocale: 'en',
        locales: ['en'],
        collections: { media: 1 },
        globals: [],
        skippedDemo: {},
      },
      records: { media: { en: [{ id: 1, filename: 'a b.png' }] } },
      globals: {},
      files: { 'media/1': { name: 'a b.png', data: new Uint8Array([1, 2, 3]) } },
    }
    const back = readBundle(writeBundle(bundle))
    expect(back.records).toEqual(bundle.records)
    expect([...back.files['media/1'].data]).toEqual([1, 2, 3])
    expect(() => readBundle(new Uint8Array([1, 2, 3]))).toThrow(/not a content bundle/)
  })
})

describe('AI write access', () => {
  it('is read-only when marked, or once the owner’s time limit has passed', async () => {
    const { readOnlyAI } = await import('@/cms/access')
    const soon = new Date(Date.now() + 60_000).toISOString()
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(readOnlyAI({ role: 'ai', aiReadOnly: true })).toBe(true)
    expect(readOnlyAI({ role: 'ai', aiReadOnly: false, aiWriteUntil: soon })).toBe(false)
    expect(readOnlyAI({ role: 'ai', aiReadOnly: false, aiWriteUntil: past })).toBe(true)
    // Installer code-preview contributors have no time limit.
    expect(readOnlyAI({ role: 'ai', aiReadOnly: false })).toBe(false)
    expect(readOnlyAI({ role: 'admin', aiWriteUntil: past })).toBe(false)
  })
})
