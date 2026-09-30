import { plainText } from './markdown'
import { contentPath, type ContentCollection } from './urls'

// Plain text from a Lexical rich-text value.
export function lexicalText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const node = value as { text?: string; children?: unknown[]; root?: unknown }
  if (node.root) return lexicalText(node.root)
  const own = typeof node.text === 'string' ? node.text : ''
  const children = Array.isArray(node.children) ? node.children.map(lexicalText).join(' ') : ''
  return `${own} ${children}`.trim()
}
// Visible text from a page composition (headings, text fields and item lists).
export function compositionText(value: unknown): string {
  const out: string[] = []
  const visit = (v: unknown, key = '') => {
    if (typeof v === 'string') {
      if (
        ![
          'id',
          'href',
          'url',
          'type',
          'layout',
          'mode',
          'style',
          'width',
          'size',
          'provider',
          'videoId',
          'aspect',
          'align',
          'columns',
          'mediaPosition',
          'motion',
          'uploadDate',
        ].includes(key)
      )
        out.push(plainText(v))
    } else if (Array.isArray(v)) v.forEach((item) => visit(item, key))
    else if (v && typeof v === 'object') for (const [k, item] of Object.entries(v)) visit(item, k)
  }
  visit((value as { content?: unknown })?.content)
  return out.join(' ')
}
export type SearchHit = {
  title: string
  path: string
  summary: string
  kind: string
  score: number
}
const kinds: Record<ContentCollection, string> = {
  pages: 'Page',
  services: 'Service',
  'case-studies': 'Case study',
  posts: 'Post',
}
const normalise = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
// Scores documents: every term must appear; title matches weigh most.
export function searchDocuments(
  query: string,
  docs: { collection: ContentCollection; doc: Record<string, unknown> }[],
): SearchHit[] {
  const terms = normalise(query)
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8)
  if (!terms.length) return []
  const hits: SearchHit[] = []
  for (const { collection, doc } of docs) {
    if (doc.visibility === 'password' || (doc.seo as { noindex?: boolean })?.noindex) continue
    const title = normalise(String(doc.title || ''))
    const summary = normalise(
      `${doc.summary || ''} ${(doc.seo as { description?: string })?.description || ''}`,
    )
    const body = normalise(
      [
        compositionText(doc.composition),
        lexicalText(doc.body),
        lexicalText(doc.narrative),
        lexicalText(doc.description),
        String(doc.results || ''),
      ].join(' '),
    )
    let score = 0
    for (const term of terms) {
      const s =
        (title.includes(term) ? 6 : 0) +
        (summary.includes(term) ? 3 : 0) +
        (body.includes(term) ? 1 : 0)
      if (!s) {
        score = 0
        break
      }
      score += s
    }
    if (score)
      hits.push({
        title: String(doc.title),
        path: contentPath(collection, String(doc.slug)),
        summary: String(doc.summary || ''),
        kind: kinds[collection],
        score,
      })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 50)
}
