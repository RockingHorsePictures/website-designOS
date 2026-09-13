'use client'
import { useCallback, useEffect, useState } from 'react'
type State = {
  preview: number | null
  live: number | null
  canPublish: boolean
  liveChangedAt?: string
}
export function PublishingPanel() {
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<'publish' | 'unpublish' | null>(null)
  const refresh = useCallback(async () => {
    const result = await fetch('/api/publication')
    if (result.ok) setState(await result.json())
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/publication', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (value) setState(value)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  async function run(action: string) {
    setBusy(true)
    setMessage('')
    try {
      const result = await fetch('/api/publication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          expected: action === 'unpublish' ? state?.live : state?.preview,
        }),
      })
      const body = await result.json()
      if (!result.ok) throw new Error(body.error)
      await refresh()
      setMessage(
        action === 'preview'
          ? 'Preview saved. Review it before publishing.'
          : action === 'publish'
            ? 'The reviewed version is now Live.'
            : 'The site now shows the Coming soon page.',
      )
      setConfirm(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="dos-publishing" aria-label="Site publishing">
      <div>
        <h2>Your site, ready when you are.</h2>
        <p>
          {state?.live
            ? `Live version ${state.live}. Further edits stay in your workspace.`
            : 'Your live URL shows Coming soon until you publish.'}
        </p>
        <p>
          Save your page and settings forms first. Save to Preview captures the whole workspace,
          including saved drafts. Publish sends that reviewed version to Live.
        </p>
      </div>
      <div className="dos-publish-actions">
        <button
          className="dos-button"
          disabled={busy || !state?.canPublish}
          onClick={() => void run('preview')}
        >
          Save to Preview
        </button>
        <a className="dos-button" href="/preview" target="_blank" rel="noreferrer">
          View Preview ↗
        </a>
        <button
          className="dos-button dos-button--primary"
          disabled={busy || !state?.preview || !state.canPublish}
          onClick={() => setConfirm('publish')}
        >
          Publish to Live
        </button>
        {state?.live && (
          <button
            className="dos-button"
            disabled={busy || !state.canPublish}
            onClick={() => setConfirm('unpublish')}
          >
            Unpublish site
          </button>
        )}
      </div>
      {confirm && (
        <div className="dos-publish-confirm">
          <p>
            {confirm === 'publish'
              ? `Publish Preview version ${state?.preview} as the entire live site? Unsaved edits are excluded.`
              : 'Replace the live site with Coming soon? Content and previous releases are retained.'}
          </p>
          <button
            className="dos-button dos-button--primary"
            disabled={busy}
            onClick={() => void run(confirm)}
          >
            {confirm === 'publish' ? 'Confirm publication' : 'Confirm unpublish'}
          </button>
          <button className="dos-button" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  )
}
