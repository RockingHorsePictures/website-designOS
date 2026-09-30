'use client'
import { useActionState, useState } from 'react'
import { createOwner, type SetupState } from './actions'

export function SetupForm({ needsCode, google }: { needsCode: boolean; google: boolean }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(createOwner, {})
  const [method, setMethod] = useState<'password' | 'google'>(google ? 'google' : 'password')
  return (
    <form action={action} className="setup-form">
      {needsCode && (
        <label>
          Setup code
          <input name="code" type="password" required autoComplete="off" />
          <small>The code you chose when deploying (DESIGNOS_SETUP_CODE).</small>
        </label>
      )}
      <label>
        Company or website name
        <input name="company" required maxLength={120} autoComplete="organization" />
      </label>
      <label>
        Your name
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        Your email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {google && (
        <fieldset className="setup-method">
          <legend>How will you sign in?</legend>
          <label>
            <input
              type="radio"
              name="method"
              value="google"
              checked={method === 'google'}
              onChange={() => setMethod('google')}
            />
            With my Google account
          </label>
          <label>
            <input
              type="radio"
              name="method"
              value="password"
              checked={method === 'password'}
              onChange={() => setMethod('password')}
            />
            With a password
          </label>
        </fieldset>
      )}
      {method === 'password' && (
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
          <small>At least 12 characters. Keep it in a password manager.</small>
        </label>
      )}
      {state.error && (
        <p role="alert" className="setup-error">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending
          ? 'Setting up…'
          : method === 'google'
            ? 'Continue with Google'
            : 'Create my workspace'}
      </button>
    </form>
  )
}
