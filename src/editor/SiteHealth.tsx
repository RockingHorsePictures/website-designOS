'use client'
import { useState } from 'react'
import type { SiteAudit } from '../lib/site-audit'

const headings = { blocker: 'Must fix', warning: 'Should fix', recommendation: 'Suggestions' }

// Whole-site checks an owner can act on in the CMS, without AI. AI audits add judgement on top.
export function SiteHealth() {
  const [report, setReport] = useState<SiteAudit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <section className="dos-panel dos-site-health" aria-labelledby="site-health-title">
      <div className="dos-panel-head">
        <div>
          <h2 id="site-health-title">Site health</h2>
          <p>
            Checks every page for missing search details, broken internal links, unlinked pages,
            image descriptions and unsupported claims. It reads your saved workspace.
          </p>
        </div>
        <button
          type="button"
          className="dos-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              const res = await fetch('/api/site-health')
              const result = await res.json()
              if (!res.ok) throw new Error(result.error || 'The check failed.')
              setReport(result)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'The check failed.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Checking…' : report ? 'Check again' : 'Check the whole site'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div aria-live="polite">
        {report && (
          <>
            <p className="dos-health-score">
              <strong>{report.score}</strong>/100 · {report.counts.blocker} must fix ·{' '}
              {report.counts.warning} should fix · {report.counts.recommendation} suggestions
            </p>
            {!report.findings.length && <p>No issues found by these automated checks.</p>}
            {(['blocker', 'warning', 'recommendation'] as const).map((level) => {
              const items = report.findings.filter((f) => f.level === level)
              if (!items.length) return null
              return (
                <details key={level} open={level !== 'recommendation'}>
                  <summary>
                    {headings[level]} ({items.length})
                  </summary>
                  <ul>
                    {items.map((f, i) => (
                      <li key={i}>
                        <strong>{f.admin ? <a href={f.admin}>{f.target}</a> : f.target}</strong>
                        {' — '}
                        {f.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )
            })}
          </>
        )}
      </div>
    </section>
  )
}
