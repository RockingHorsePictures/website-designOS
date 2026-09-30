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
    for (const ip of ['::ffff:7f00:1', '::127.0.0.1', '64:ff9b::a9fe:a9fe', '::ffff:0:7f00:1', '2002:7f00:1::', '198.18.0.1', 'not-an-ip'])
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
