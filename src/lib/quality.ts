import { compositionSchema } from '../editor/registry/schema'
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
export function auditContent(doc: AuditDocument): Finding[] {
  const out: Finding[] = []
  const add = (level: Finding['level'], field: string, message: string) =>
    out.push({ level, field, message })
  if (!doc.title?.trim()) add('blocker', 'title', 'Add a page title.')
  if (!validSlug(doc.slug)) add('blocker', 'slug', 'Use a valid URL slug.')
  if (!doc.summary?.trim()) add('blocker', 'summary', 'Add a visible summary.')
  if (doc.composition !== undefined && !compositionSchema.safeParse(doc.composition).success)
    add('blocker', 'composition', 'A section is unknown or its configuration is invalid.')
  const text = [doc.title, doc.summary, JSON.stringify(doc.composition || '')].join(' ')
  if (/\b(lorem ipsum|TODO|TBC|placeholder)\b/i.test(text))
    add('warning', 'content', 'Replace unresolved placeholder copy.')
  if (doc.demo)
    add('warning', 'demo', 'This is demo content and is excluded from production search indexing.')
  if (doc.aiAssisted && (!doc.claimsReviewed || !doc.evidence?.length))
    add(
      'warning',
      'evidence',
      'AI-assisted claims need verified evidence and a human factual review.',
    )
  if (/\b(award[- ]winning|leading|best|\d+%)\b/i.test(text) && !doc.evidence?.length)
    add(
      'warning',
      'evidence',
      'Review potentially factual or comparative claims and attach supporting evidence.',
    )
  if (
    !(doc.seo?.description || doc.summary) ||
    (doc.seo?.description || doc.summary || '').length < 50
  )
    add(
      'recommendation',
      'seo.description',
      'Add a useful search description; the summary is used by default.',
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
  const composition = compositionSchema.safeParse(doc.composition)
  if (composition.success)
    for (const section of composition.data.content) {
      if (section.type === 'CallToAction') {
        if (!safeLink(section.props.href))
          add('blocker', 'composition', 'A link has an unsafe URL.')
        if (/^(click here|here|more)$/i.test(section.props.label))
          add('recommendation', 'composition', 'Use a link label that describes the destination.')
      }
    }
  return out
}
