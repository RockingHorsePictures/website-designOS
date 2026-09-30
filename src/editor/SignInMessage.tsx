'use client'
import { useSyncExternalStore } from 'react'

const read = () => new URLSearchParams(window.location.search).get('sso')
// Explains why Google sign-in did not complete (passed back as ?sso=…).
export function SignInMessage() {
  const message = useSyncExternalStore(
    () => () => {},
    read,
    () => null,
  )
  if (!message) return null
  return (
    <p role="alert" className="dos-signin-error">
      {message.slice(0, 200)}
    </p>
  )
}
