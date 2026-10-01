'use client'
import { useState } from 'react'

export function ConnectDecision({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'allowed' | 'declined'>('idle')
  const [error, setError] = useState('')
  async function decide(allow: boolean) {
    setState('busy')
    setError('')
    const res = await fetch('/api/ai/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decide', code, allow }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'That did not work. Try again.')
      setState('idle')
      return
    }
    setState(allow ? 'allowed' : 'declined')
  }
  if (state === 'allowed')
    return (
      <p className="setup-success" role="status">
        Connected. Your AI tool will finish setting up in a few seconds. AI edits are off until you
        allow them on <a href="/admin">Overview → AI editing</a>.
      </p>
    )
  if (state === 'declined')
    return (
      <p className="setup-success" role="status">
        Declined. Nothing was connected.
      </p>
    )
  return (
    <div className="setup-form">
      {error && (
        <p role="alert" className="setup-error">
          {error}
        </p>
      )}
      <button type="button" onClick={() => decide(true)} disabled={state === 'busy'}>
        Connect
      </button>
      <button
        type="button"
        className="setup-secondary"
        onClick={() => decide(false)}
        disabled={state === 'busy'}
      >
        Decline
      </button>
    </div>
  )
}
