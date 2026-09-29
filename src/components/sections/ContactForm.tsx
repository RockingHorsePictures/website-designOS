'use client'
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'

const noSubscription = () => () => {}
// After a no-JavaScript submission the route redirects back with ?sent=contact.
const redirectedAfterSending = () =>
  new URLSearchParams(window.location.search).get('sent') === 'contact'

// Works without JavaScript (a normal POST that redirects back); with JavaScript it submits in place.
// The hidden "website" field is a spam trap; `started` lets the server reject instant bot posts.
export function ContactForm({
  submitLabel,
  successMessage,
  disabled,
  pagePath = '/',
}: {
  submitLabel: string
  successMessage: string
  disabled?: boolean
  pagePath?: string
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const started = useRef(0)
  useEffect(() => {
    started.current = Date.now()
  }, [])
  const redirected = useSyncExternalStore(noSubscription, redirectedAfterSending, () => false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    setState('sending')
    try {
      const res = await fetch('/api/forms/contact', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: (() => {
          const form = new FormData(event.currentTarget)
          form.set('started', String(started.current))
          return form
        })(),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Your message could not be sent.')
      setState('sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your message could not be sent.')
      setState('error')
    }
  }
  if (state === 'sent' || redirected)
    return (
      <p role="status" className="form-status">
        {successMessage}
      </p>
    )
  return (
    <form className="contact-form" method="post" action="/api/forms/contact" onSubmit={submit}>
      <input type="hidden" name="page" value={pagePath} />
      <p className="trap" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <p>
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" name="name" required maxLength={200} autoComplete="name" />
      </p>
      <p>
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={320}
          autoComplete="email"
        />
      </p>
      <p>
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" required maxLength={5000} rows={6} />
      </p>
      {state === 'error' && (
        <p role="alert" className="form-status">
          {error}
        </p>
      )}
      <button type="submit" disabled={disabled || state === 'sending'}>
        {state === 'sending' ? 'Sending…' : submitLabel}
      </button>
      {disabled && <p className="form-status">The form is disabled in the composer.</p>}
    </form>
  )
}
