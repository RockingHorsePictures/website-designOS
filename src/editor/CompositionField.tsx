'use client'
import { useDocumentInfo, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { compositionSchema } from './registry/schema'

export const CompositionField: JSONFieldClientComponent = ({ path }) => {
  const { value } = useField({ path })
  const { id } = useDocumentInfo()
  const result = compositionSchema.safeParse(value)
  return (
    <div style={{ padding: '1rem', border: '1px solid currentColor' }}>
      <h3>Page sections</h3>
      {result.success ? (
        <ol>
          {result.data.content.map((s) => (
            <li key={s.props.id}>
              {s.type} — {s.props.heading}
            </li>
          ))}
        </ol>
      ) : (
        <p>No valid sections yet.</p>
      )}
      {id ? (
        <a href={`/editor/${id}`}>Open page composer</a>
      ) : (
        <p>Save this page as a draft to open the composer.</p>
      )}
      <p>
        Save changes in this form before opening the composer. The composer saves drafts; publish
        from this page after review.
      </p>
    </div>
  )
}
