'use client'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { prefixed } from '@/components/site/SiteLink'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import type { PublicForm } from '@/lib/form-definitions'

const noSubscription = () => () => {}
// After a no-JavaScript submission the route redirects back with ?sent=contact.
const redirectedAfterSending = () =>
  new URLSearchParams(window.location.search).get('sent') === 'contact'

// Renders a Contact or Form-builder form. Works without JavaScript (a normal POST that redirects
// back); with JavaScript it submits in place. The hidden "website" field is a spam trap and
// `started` lets the server reject instant bot posts. Turnstile appears when configured.
export function SiteForm({
  form,
  disabled,
  pagePath = '/',
  locale,
  turnstileSiteKey,
}: {
  form: PublicForm
  disabled?: boolean
  pagePath?: string
  locale?: string
  turnstileSiteKey?: string | null
}) {
  const uid = useId()
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const started = useRef(0)
  useEffect(() => {
    started.current = Date.now()
  }, [])
  const redirected = useSyncExternalStore(noSubscription, redirectedAfterSending, () => false)
  const action = `/api/forms/${form.id}`
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    setState('sending')
    try {
      const body = new FormData(event.currentTarget)
      body.set('started', String(started.current))
      const res = await fetch(action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Your message could not be sent.')
      if (result.redirect) router.push(prefixed(result.redirect, window.location.pathname))
      else setState('sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your message could not be sent.')
      setState('error')
    }
  }
  if (state === 'sent' || redirected)
    return (
      <p role="status" className="form-status form-sent">
        {form.successMessage}
      </p>
    )
  return (
    <form className="site-form" method="post" action={action} onSubmit={submit} noValidate={false}>
      <input type="hidden" name="page" value={pagePath} />
      {locale && <input type="hidden" name="locale" value={locale} />}
      <p className="trap" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <div className="form-fields">
        {form.fields.map((field) => {
          const id = `${uid}-${field.name}`
          const help = field.help ? `${id}-help` : undefined
          const common = {
            id,
            name: field.name,
            required: Boolean(field.required),
            'aria-describedby': help,
          }
          const autoComplete =
            field.name === 'name'
              ? 'name'
              : field.type === 'email'
                ? 'email'
                : field.type === 'tel'
                  ? 'tel'
                  : undefined
          return (
            <p
              key={field.name}
              className={`field field-${field.type} width-${field.width || 'full'}`}
            >
              {field.type === 'checkbox' ? (
                <label htmlFor={id} className="checkbox">
                  <input type="checkbox" {...common} />
                  {field.label}
                </label>
              ) : (
                <>
                  <label htmlFor={id}>
                    {field.label}
                    {field.required ? null : <span className="optional"> (optional)</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      {...common}
                      rows={6}
                      maxLength={5000}
                      placeholder={field.placeholder || undefined}
                    />
                  ) : field.type === 'select' ? (
                    <select {...common} defaultValue="">
                      <option value="" disabled>
                        {field.placeholder || 'Choose…'}
                      </option>
                      {(field.options || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...common}
                      type={field.type}
                      autoComplete={autoComplete}
                      placeholder={field.placeholder || undefined}
                    />
                  )}
                </>
              )}
              {help && (
                <small id={help} className="help">
                  {field.help}
                </small>
              )}
            </p>
          )
        })}
      </div>
      {turnstileSiteKey && !disabled && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      )}
      {state === 'error' && (
        <p role="alert" className="form-status">
          {error}
        </p>
      )}
      <button type="submit" disabled={disabled || state === 'sending'}>
        {state === 'sending' ? 'Sending…' : form.submitLabel}
      </button>
      {disabled && <p className="form-status">The form is disabled in the composer.</p>}
    </form>
  )
}
// Kept for sites that import the original component.
export { SiteForm as ContactForm }
