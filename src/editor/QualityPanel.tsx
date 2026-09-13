'use client'
import { useState } from 'react'
import { useDocumentInfo, useForm } from '@payloadcms/ui'
import type { Finding } from '../lib/quality'

export function QualityPanel() {
  const { id, collectionSlug } = useDocumentInfo()
  const { getData } = useForm()
  const [findings, setFindings] = useState<Finding[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [schema, setSchema] = useState<unknown>(null)
  return (
    <div>
      <h3>Pre-publish quality check</h3>
      <p>
        Checks content, accessibility, search and section configuration. Warnings and
        recommendations do not prevent publication. Human factual review is still required.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            const res = await fetch('/api/quality', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ collection: collectionSlug, id, data: getData() }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Quality check failed.')
            setFindings(result.findings)
            setSchema(result.schema)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Quality check failed.')
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Checking…' : 'Check this page'}
      </button>
      {error && <p role="alert">{error}</p>}
      <div aria-live="polite">
        {findings &&
          (findings.length ? (
            ['blocker', 'warning', 'recommendation'].map((level) => (
              <section key={level}>
                <h4>
                  {level === 'blocker'
                    ? 'Blockers'
                    : level === 'warning'
                      ? 'Warnings'
                      : 'Recommendations'}
                </h4>
                <ul>
                  {findings
                    .filter((f) => f.level === level)
                    .map((f, i) => (
                      <li key={i}>{f.message}</li>
                    ))}
                </ul>
              </section>
            ))
          ) : (
            <p>No issues found by these automated checks.</p>
          ))}
      </div>
      {schema ? (
        <details>
          <summary>Generated structured data preview</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(schema, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  )
}
