import { Fragment, type ReactNode } from 'react'
import { SiteLink } from '@/components/site/SiteLink'
import { safeLink } from '@/lib/urls'
import { parseBlocks } from '@/lib/markdown'

const inlinePattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|\[([^\]]+)\]\(([^)\s]+)\)|\n/g
export function Inline({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of text.matchAll(inlinePattern)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<strong key={key++}>{m[1]}</strong>)
    else if (m[2] || m[3]) out.push(<em key={key++}>{m[2] || m[3]}</em>)
    else if (m[4])
      out.push(
        safeLink(m[5]) ? (
          <SiteLink key={key++} href={m[5]}>
            {m[4]}
          </SiteLink>
        ) : (
          m[4]
        ),
      )
    else out.push(<br key={key++} />)
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

// `level` is the heading level of the surrounding section; subheadings nest beneath it.
export function Markdown({ source, level = 2 }: { source: string; level?: number }) {
  const H = `h${Math.min(level + 1, 6)}` as 'h3'
  const H2 = `h${Math.min(level + 2, 6)}` as 'h4'
  return (
    <>
      {parseBlocks(source || '').map((block, i) => (
        <Fragment key={i}>
          {block.kind === 'p' && (
            <p>
              <Inline text={block.text} />
            </p>
          )}
          {block.kind === 'h' && (
            <H>
              <Inline text={block.text} />
            </H>
          )}
          {block.kind === 'h2' && (
            <H2>
              <Inline text={block.text} />
            </H2>
          )}
          {block.kind === 'quote' && (
            <blockquote>
              <Inline text={block.text} />
            </blockquote>
          )}
          {(block.kind === 'ul' || block.kind === 'ol') &&
            (() => {
              const List = block.kind
              return (
                <List>
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <Inline text={item} />
                    </li>
                  ))}
                </List>
              )
            })()}
        </Fragment>
      ))}
    </>
  )
}
