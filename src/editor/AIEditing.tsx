'use client'
import { useCallback, useEffect, useState } from 'react'

// Overview → AI editing: whether the live AI connection may save drafts, and everything it
// changed since the last Preview, with Undo.
type Change = {
  id: number
  at: string
  action: 'create' | 'update' | 'upload'
  collection: string | null
  global: string | null
  doc_id: string | null
  title: string | null
  locale: string | null
  fields: string[]
  undone_at: string | null
}
type State = {
  connected: boolean
  editingUntil: string | null
  lastChange: string | null
  canManage: boolean
  since: string | null
  changes: Change[]
}
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
const label = (slug: string) => {
  const words = slug.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
const verbs = { create: 'Added', update: 'Changed', upload: 'Uploaded' }

export function AIEditing() {
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    const res = await fetch('/api/ai/admin', { cache: 'no-store' })
    if (res.ok) setState(await res.json())
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ai/admin', { cache: 'no-store', signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => body && setState(body))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  async function act(
    body: Record<string, unknown>,
    done?: (result: Record<string, unknown>) => string,
  ) {
    setBusy(true)
    setMessage('')
    const res = await fetch('/api/ai/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await res.json().catch(() => ({}))
    setMessage(res.ok ? (done ? done(result) : '') : result.error || 'That did not work.')
    await load()
    setBusy(false)
  }
  if (!state) return null
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const open = (c: Change) =>
    c.global
      ? `/admin/globals/${c.global}`
      : c.action !== 'update' && c.undone_at
        ? null
        : `/admin/collections/${c.collection}/${c.doc_id}`
  return (
    <section className="dos-card dos-ai" aria-labelledby="dos-ai-title">
      <div className="dos-ai-head">
        <h2 id="dos-ai-title">AI editing</h2>
        <span className={`dos-pill ${state.editingUntil ? 'dos-pill--on' : ''}`} role="status">
          {!state.connected
            ? 'Not connected'
            : state.editingUntil
              ? `On until ${when(state.editingUntil)}`
              : 'Read-only'}
        </span>
      </div>
      {!state.connected ? (
        <p className="dos-muted">
          Connect your AI coding tool so it can read your website and, when you allow it, save
          drafts here for you to review. In your website&rsquo;s folder, ask your AI to run{' '}
          <code>npm run ai:connect -- live {origin}</code>, then open the link it shows.
        </p>
      ) : (
        <p className="dos-muted">
          {state.editingUntil
            ? 'Your AI can save drafts in this workspace. Nothing is visible to anyone until you Save to Preview, and nothing goes live until you publish.'
            : 'Your AI can read this website. Allow edits when you want it to save drafts here.'}
        </p>
      )}
      {state.connected && state.canManage && (
        <div className="dos-ai-actions">
          {[1, 7].map((days) => (
            <button
              key={days}
              type="button"
              className="dos-button"
              disabled={busy}
              onClick={() => act({ action: 'editing', days })}
            >
              Allow edits for {days === 1 ? '1 day' : `${days} days`}
            </button>
          ))}
          {state.editingUntil && (
            <button
              type="button"
              className="dos-button"
              disabled={busy}
              onClick={() => act({ action: 'editing', days: 0 })}
            >
              Turn off
            </button>
          )}
          <button
            type="button"
            className="dos-link-button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Disconnect your AI? It will need to be approved again.'))
                void act({ action: 'disconnect' })
            }}
          >
            Disconnect
          </button>
        </div>
      )}
      {message && (
        <p className="dos-ai-message" role="status">
          {message}
        </p>
      )}
      {(state.connected || state.changes.length > 0) && (
        <>
          <h3>
            Changes by AI {state.since ? 'since your last Preview' : 'so far'}
            {state.changes.length > 0 && ` (${state.changes.filter((c) => !c.undone_at).length})`}
          </h3>
          {state.changes.length === 0 ? (
            <p className="dos-muted">No AI changes since your last Preview.</p>
          ) : (
            <ul className="dos-ai-changes">
              {state.changes.map((c) => {
                const href = open(c)
                const name = c.title || c.doc_id || c.global
                return (
                  <li key={c.id} className={c.undone_at ? 'is-undone' : ''}>
                    <div>
                      <strong>
                        {verbs[c.action]} {label(c.global || c.collection || '')}{' '}
                        {href && !c.undone_at ? <a href={href}>“{name}”</a> : `“${name}”`}
                      </strong>
                      <span>
                        {c.action === 'update' &&
                          c.fields.length > 0 &&
                          `${c.fields.join(', ')} · `}
                        {c.locale && `${c.locale} · `}
                        {when(c.at)}
                        {c.undone_at && ' · undone'}
                      </span>
                    </div>
                    {!c.undone_at && (
                      <button
                        type="button"
                        className="dos-link-button"
                        disabled={busy}
                        onClick={() =>
                          act({ action: 'undo', id: c.id }, (r) => {
                            const skipped = (r.skipped as string[]) || []
                            return c.action === 'update'
                              ? `Undone${skipped.length ? `, except ${skipped.join(', ')} (changed by a person since)` : ''}.`
                              : 'Removed.'
                          })
                        }
                      >
                        Undo
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
