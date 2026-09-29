// A deliberately small, safe text format for editor-written copy:
//   blank line = new paragraph · "## " subheading · "- " or "1. " list · "> " quote
//   **bold** · *italic* · [label](/path or https://…)
// It renders React elements only (never raw HTML), and unsafe link targets render as plain text.
export type Block =
  | { kind: 'p' | 'h' | 'h2' | 'quote'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of source.replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim())
    if (!lines.length) continue
    if (lines.every((l) => /^\s*[-*]\s+/.test(l)))
      blocks.push({ kind: 'ul', items: lines.map((l) => l.replace(/^\s*[-*]\s+/, '')) })
    else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
      blocks.push({ kind: 'ol', items: lines.map((l) => l.replace(/^\s*\d+[.)]\s+/, '')) })
    else if (lines.length === 1 && /^###\s+/.test(lines[0]))
      blocks.push({ kind: 'h2', text: lines[0].replace(/^###\s+/, '') })
    else if (lines.length === 1 && /^##?\s+/.test(lines[0]))
      blocks.push({ kind: 'h', text: lines[0].replace(/^##?\s+/, '') })
    else if (lines.every((l) => /^>\s?/.test(l)))
      blocks.push({ kind: 'quote', text: lines.map((l) => l.replace(/^>\s?/, '')).join('\n') })
    else blocks.push({ kind: 'p', text: lines.join('\n') })
  }
  return blocks
}

// Plain text for metadata, structured data, llms.txt and audits.
export function plainText(source: string) {
  return parseBlocks(source || '')
    .map((b) => ('items' in b ? b.items.join('; ') : b.text))
    .join('\n\n')
    .replace(/\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g, '$1$2$3')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .trim()
}
