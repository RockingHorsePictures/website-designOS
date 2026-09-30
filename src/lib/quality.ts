import { allSections, compositionSchema, type Composition } from '../editor/registry/schema'
import { parseBlocks } from './markdown'
import { safeLink, validSlug } from './urls'

export type Finding = {
  level: 'blocker' | 'warning' | 'recommendation'
  field: string
  message: string
}
export type AuditDocument = {
  title?: string
  slug?: string
  summary?: string
  composition?: unknown
  seo?: {
    title?: string | null
    description?: string | null
    canonical?: string | null
    noindex?: boolean | null
  } | null
  aiAssisted?: boolean | null
  claimsReviewed?: boolean | null
  evidence?: unknown[] | null
  demo?: boolean | null
  heroMedia?: { image?: unknown; decorative?: boolean | null; altOverride?: string | null } | null
}
export type AuditOptions = {
  // Media descriptions by ID, when available, so section images can be checked for alt text.
  media?: Record<number, { alt?: string | null; decorative?: boolean | null }>
}
const vagueLabel = /^(click here|here|more|read more|learn more|link|this)$/i
const claimPattern = /\b(award[- ]winning|leading|best|first|only|#1|no\.? ?1|\d+(\.\d+)?%|\d+x)\b/i

// Links written inside section text use the small Markdown format; audit them like fields.
function markdownLinks(source: string): { label: string; href: string }[] {
  return parseBlocks(source).flatMap((block) =>
    [
      ...('items' in block ? block.items.join('\n') : block.text).matchAll(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
      ),
    ].map((m) => ({ label: m[1], href: m[2] })),
  )
}
function sectionFindings(composition: Composition, options: AuditOptions, add: Add) {
  const hidden = composition.root.props?.pageHeader === 'hidden'
  const first = composition.content[0]
  if (hidden && !(first?.type === 'Hero' && first.props.heading.trim()))
    add(
      'warning',
      'composition',
      'The page header is hidden, so the first section must be a Hero with a heading to give the page its main (h1) heading.',
    )
  allSections(composition.content).forEach((section, index) => {
    const where = `Section ${index + 1} (${section.type})`
    const p = section.props as Record<string, unknown>
    const links: { label: string; href: string }[] = []
    const images: { image: number | null; alt: string; decorative: boolean }[] = []
    const visit = (value: unknown, key = '') => {
      if (typeof value === 'string') {
        if (['body', 'intro', 'answer', 'description', 'transcript', 'quote'].includes(key)) {
          links.push(...markdownLinks(value))
        }
      } else if (Array.isArray(value)) value.forEach((v) => visit(v, key))
      else if (value && typeof value === 'object') {
        const v = value as Record<string, unknown>
        if ('image' in v && 'decorative' in v) images.push(v as (typeof images)[number])
        else if ('label' in v && 'href' in v && typeof v.href === 'string' && v.href)
          links.push(v as { label: string; href: string })
        for (const [k, item] of Object.entries(v)) visit(item, k)
      }
    }
    visit(p)
    if (section.type === 'CallToAction')
      links.push({ label: section.props.label, href: section.props.href })
    for (const link of links) {
      if (!safeLink(link.href)) add('blocker', 'composition', `${where}: a link has an unsafe URL.`)
      if (!link.label.trim())
        add('warning', 'composition', `${where}: a link has a destination but no label.`)
      else if (vagueLabel.test(link.label.trim()))
        add(
          'recommendation',
          'composition',
          `${where}: use a link label that describes the destination.`,
        )
    }
    for (const image of images) {
      if (!image.image || image.decorative || image.alt.trim()) continue
      const asset = options.media?.[image.image]
      if (options.media && !asset?.decorative && !asset?.alt?.trim())
        add(
          'warning',
          'composition',
          `${where}: an image needs a description (alt text) or to be marked decorative.`,
        )
    }
    if (section.type === 'Stats' || section.type === 'Quotes') {
      const missing = section.props.items.filter((item) => !item.factId).length
      if (missing)
        add(
          'warning',
          'evidence',
          `${where}: ${missing} ${section.type === 'Stats' ? 'figure(s)' : 'testimonial(s)'} are not linked to an approved fact.`,
        )
    }
    if (section.type === 'FAQ') {
      if (section.props.items.some((i) => !i.question.trim() || !i.answer.trim()))
        add('warning', 'composition', `${where}: every question needs an answer.`)
      if (!section.props.items.length)
        add('recommendation', 'composition', `${where}: add questions or remove the section.`)
    }
    if (section.type === 'Video' && section.props.videoId) {
      if (!section.props.transcript.trim())
        add(
          'recommendation',
          'composition',
          `${where}: add a transcript for accessibility and answer engines.`,
        )
      if (!section.props.title || !section.props.description || !section.props.uploadDate)
        add(
          'recommendation',
          'composition',
          `${where}: add a title, description and upload date so search engines can list the video.`,
        )
    }
    if (section.type === 'Contact' && section.props.form && !section.props.successMessage.trim())
      add('recommendation', 'composition', `${where}: add a confirmation message for the form.`)
    if (section.type === 'Form' && !section.props.formId)
      add('warning', 'composition', `${where}: choose a form, or remove the section.`)
    if (section.type === 'GlobalBlock' && !section.props.blockId)
      add('warning', 'composition', `${where}: choose a reusable block, or remove the section.`)
    if (section.type === 'Embed' && section.props.url && !section.props.title.trim())
      add('warning', 'composition', `${where}: give the embed a title for screen readers.`)
    if (section.type === 'Pricing' && section.props.plans.some((plan) => !plan.price.trim()))
      add(
        'recommendation',
        'composition',
        `${where}: every plan should show a price or "Contact us".`,
      )
    if (section.type === 'Columns') return
    const hasContent =
      Object.entries(p).some(
        ([k, v]) =>
          k !== 'id' &&
          typeof v === 'string' &&
          v.trim() &&
          ![
            'style',
            'layout',
            'width',
            'size',
            'mode',
            'columns',
            'provider',
            'mediaPosition',
            'motion',
            'aspect',
          ].includes(k),
      ) ||
      images.some((i) => i.image) ||
      Object.values(p).some((v) => Array.isArray(v) && v.length) ||
      [
        'Services',
        'Team',
        'Logos',
        'SelectedProjects',
        'Contact',
        'Posts',
        'Form',
        'GlobalBlock',
      ].includes(section.type)
    if (!hasContent) add('recommendation', 'composition', `${where} is empty.`)
  })
}
type Add = (level: Finding['level'], field: string, message: string) => void

export function auditContent(doc: AuditDocument, options: AuditOptions = {}): Finding[] {
  const out: Finding[] = []
  const add: Add = (level, field, message) => out.push({ level, field, message })
  if (!doc.title?.trim()) add('blocker', 'title', 'Add a page title.')
  if (!validSlug(doc.slug)) add('blocker', 'slug', 'Use a valid URL slug.')
  if (!doc.summary?.trim()) add('blocker', 'summary', 'Add a visible summary.')
  const composition =
    doc.composition === undefined ? null : compositionSchema.safeParse(doc.composition)
  if (composition && !composition.success)
    add('blocker', 'composition', 'A section is unknown or its configuration is invalid.')
  const text = [doc.title, doc.summary, JSON.stringify(doc.composition || '')].join(' ')
  if (/\b(lorem ipsum|TODO|TBC|TBD|placeholder|xxx)\b/i.test(text))
    add('warning', 'content', 'Replace unresolved placeholder copy.')
  if (doc.demo)
    add('warning', 'demo', 'This is demo content and is excluded from production search indexing.')
  if (doc.aiAssisted && (!doc.claimsReviewed || !doc.evidence?.length))
    add(
      'warning',
      'evidence',
      'AI-assisted claims need verified evidence and a human factual review.',
    )
  if (claimPattern.test(text) && !doc.evidence?.length)
    add(
      'warning',
      'evidence',
      'Review potentially factual or comparative claims and attach supporting evidence.',
    )
  const description = doc.seo?.description || doc.summary || ''
  if (description.length < 50)
    add(
      'recommendation',
      'seo.description',
      'Add a useful search description (about 120–160 characters); the summary is used by default.',
    )
  else if (description.length > 170)
    add(
      'recommendation',
      'seo.description',
      'The search description is long; results usually show about 160 characters.',
    )
  const title = doc.seo?.title || doc.title || ''
  if (title.length > 65)
    add(
      'recommendation',
      'seo.title',
      'The search title is long; results usually show about 60 characters.',
    )
  if (doc.seo?.noindex)
    add('warning', 'seo.noindex', 'This page is excluded from search engines and the sitemap.')
  if (doc.seo?.canonical && !/^https?:\/\//.test(doc.seo.canonical))
    add('blocker', 'seo.canonical', 'Canonical URL must be absolute.')
  const asset = doc.heroMedia
  if (asset?.image && typeof asset.image === 'object') {
    const image = asset.image as { alt?: string; decorative?: boolean }
    if (!asset.decorative && !image.decorative && !asset.altOverride?.trim() && !image.alt?.trim())
      add('warning', 'heroMedia', 'This meaningful image needs an accessible description.')
  }
  if (composition?.success) sectionFindings(composition.data as Composition, options, add)
  return out
}
