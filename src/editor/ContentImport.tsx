'use client'
import { useState, type ChangeEvent } from 'react'
import { Modal } from './Modal'
import type { Bundle } from '../lib/content-transfer/bundle'
import type { Exec, ImportReport, Operation, Plan } from '../lib/content-transfer/driver'

// Overview → Import content: brings a content bundle (made with `npm run content:export`, usually
// from the database the site was designed in) into this site's workspace. Nothing is published.

const exec: Exec = async (op: Operation) => {
  let response: Response
  if (op.op === 'file') {
    const form = new FormData()
    form.set('op', JSON.stringify({ ...op, file: { name: op.file.name } }))
    form.set('file', new Blob([op.file.data as BlobPart]), op.file.name)
    response = await fetch('/api/content-import', { method: 'POST', body: form })
  } else
    response = await fetch('/api/content-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op),
    })
  const body = await response
    .json()
    .catch(() => ({ error: `The server answered ${response.status}.` }))
  return response.ok ? body : { error: body.error || 'This step failed.' }
}
const label = (slug: string) => {
  const words = slug.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function ContentImport({ onClose }: { onClose: () => void }) {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [planned, setPlanned] = useState<Plan | null>(null)
  const [globals, setGlobals] = useState(true)
  const [removeDemo, setRemoveDemo] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number; step: string } | null>(
    null,
  )
  const [report, setReport] = useState<ImportReport | null>(null)
  const running = Boolean(progress && !report)

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const { readBundle } = await import('../lib/content-transfer/bundle')
      const { plan } = await import('../lib/content-transfer/driver')
      const read = readBundle(new Uint8Array(await file.arrayBuffer()))
      setPlanned(await plan(read, exec))
      setBundle(read)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The file could not be read.')
    }
    setBusy(false)
  }
  async function start() {
    if (!bundle || !planned) return
    const { runImport } = await import('../lib/content-transfer/driver')
    setProgress({ done: 0, total: 1, step: 'Starting' })
    const result = await runImport(
      bundle,
      planned,
      exec,
      { globals, removeDemo },
      (done, total, step) => setProgress({ done, total, step }),
    )
    setReport(result)
  }

  const rows =
    bundle && planned
      ? planned.collections.map((slug) => {
          const total = bundle.manifest.collections[slug] || 0
          const existing = Object.keys(planned.matches[slug] || {}).length
          return { slug, total, existing, upload: planned.uploads.includes(slug) }
        })
      : []

  return (
    <Modal title="Import content" onClose={running ? () => {} : onClose} locked={running} wide>
      <div className="dos-form dos-import">
        {!bundle && (
          <>
            <p>
              Bring in content prepared elsewhere, for example the pages, case studies and images
              your AI built while designing the site. Make the bundle with{' '}
              <code>npm run content:export</code>.
            </p>
            <p className="dos-import-note">
              Everything arrives in your workspace. Nothing is published until you{' '}
              <strong>Save to Preview</strong> and <strong>Publish to Live</strong>.
            </p>
            <label className="dos-file">
              Content bundle (.zip)
              <input type="file" accept=".zip,application/zip" onChange={choose} disabled={busy} />
            </label>
            {busy && <p role="status">Reading the bundle…</p>}
          </>
        )}

        {bundle && planned && !progress && (
          <>
            <p>
              Exported {new Date(bundle.manifest.exportedAt).toLocaleString()} from the{' '}
              {bundle.manifest.source} site (Design OS {bundle.manifest.designos}). Records this
              site already has (same web address, name or file) are updated; the rest are added.
            </p>
            <table className="dos-import-table">
              <thead>
                <tr>
                  <th scope="col">Content</th>
                  <th scope="col">New</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.slug}>
                    <th scope="row">{label(row.slug)}</th>
                    <td>{row.total - row.existing}</td>
                    <td>{row.upload ? `${row.existing} already here` : row.existing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {planned.missing.length > 0 && (
              <p className="dos-error">
                This site has nowhere to put: {planned.missing.map(label).join(', ')}. Those records
                are skipped (the site’s code needs those collections first).
              </p>
            )}
            {planned.warnings.map((w) => (
              <p key={w} className="dos-import-note">
                {w}
              </p>
            ))}
            {Object.keys(bundle.globals).length > 0 && (
              <label className="dos-option">
                <input
                  type="checkbox"
                  checked={globals}
                  onChange={(e) => setGlobals(e.target.checked)}
                />
                <span>
                  <strong>Also import site settings, navigation, theme and search strategy</strong>
                  <span>Replaces those settings with the bundle’s (locked fields are kept).</span>
                </span>
              </label>
            )}
            <label className="dos-option">
              <input
                type="checkbox"
                checked={removeDemo}
                onChange={(e) => setRemoveDemo(e.target.checked)}
              />
              <span>
                <strong>Remove demo content</strong>
                <span>Deletes example records marked “Demo” that the bundle doesn’t replace.</span>
              </span>
            </label>
            {error && (
              <p role="alert" className="dos-error">
                {error}
              </p>
            )}
            <div className="dos-button-row">
              <button type="button" className="dos-button" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="dos-button dos-button--primary" onClick={start}>
                Import into workspace
              </button>
            </div>
          </>
        )}

        {progress && !report && (
          <div role="status" aria-live="polite">
            <p>Importing… {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</p>
            <progress value={progress.done} max={Math.max(progress.total, 1)} />
            <p className="dos-import-note">{progress.step}. Keep this window open.</p>
          </div>
        )}

        {report && (
          <>
            <p className={report.errors.length ? 'dos-error' : 'dos-success'} role="status">
              {report.errors.length
                ? `Imported with ${report.errors.length} problem${report.errors.length === 1 ? '' : 's'} (listed below). You can fix them and import the same bundle again: it updates instead of duplicating.`
                : 'Import complete. Review your pages and records, then Save to Preview and Publish to Live from Overview.'}
            </p>
            <ul className="dos-import-summary">
              {Object.entries(report.created).map(([slug, n]) => (
                <li key={`c-${slug}`}>
                  {label(slug)}: {n} added
                </li>
              ))}
              {Object.entries(report.updated).map(([slug, n]) => (
                <li key={`u-${slug}`}>
                  {label(slug)}: {n} updated
                </li>
              ))}
              {report.reusedFiles > 0 && <li>{report.reusedFiles} files were already here</li>}
              {report.removed.length > 0 && <li>{report.removed.length} demo records removed</li>}
            </ul>
            {report.errors.length > 0 && (
              <details open>
                <summary>Problems</summary>
                <ul>
                  {report.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
            {report.unresolved.length > 0 && (
              <details>
                <summary>
                  {report.unresolved.length} links pointed at records that aren’t in the bundle, so
                  they were removed
                </summary>
                <ul>
                  {report.unresolved.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
            {report.unknown.length > 0 && (
              <details>
                <summary>{report.unknown.length} section settings to check by hand</summary>
                <p>
                  These look like links to records but match no collection, so they were kept as
                  they were.
                </p>
                <ul>
                  {report.unknown.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="dos-button-row">
              <button
                type="button"
                className="dos-button dos-button--primary"
                onClick={() => window.location.reload()}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
