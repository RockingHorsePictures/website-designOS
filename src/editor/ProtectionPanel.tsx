'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState, useCallback } from 'react'
type Info = {
  fields: { name: string; label: string; value: unknown; defaultValue?: unknown }[]
  policies: Record<string, { state: string; by?: string; at?: string }>
  canApprove: boolean
  updatedAt: string
}
export function ProtectionPanel() {
  const { id, collectionSlug, globalSlug } = useDocumentInfo()
  const [info, setInfo] = useState<Info | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const query = new URLSearchParams(
    collectionSlug ? { collection: collectionSlug, id: String(id) } : { global: globalSlug || '' },
  ).toString()
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/protection?${query}`)
    if (response.ok) setInfo(await response.json())
  }, [query])
  useEffect(() => {
    const controller = new AbortController()
    if (id || globalSlug)
      fetch(`/api/protection?${query}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((value) => {
          if (value) setInfo(value)
        })
        .catch(() => {})
    return () => controller.abort()
  }, [id, globalSlug, query])
  if (!info) return <p>Save this record to manage approvals and locks.</p>
  async function change(field: string, state: string) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/protection?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, state, updatedAt: info?.updatedAt }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      await refresh()
      setMessage('Approval saved. Reload this record before making further edits.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save approval.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="dos-protection">
      <summary>Approvals & locks</summary>
      <p>
        Defaults are editable starting points. Approved values remain editable. Locked values cannot
        change until a person unlocks them. Save your form before changing approvals.
      </p>
      <div role="status">{message}</div>
      <div className="dos-policy-list">
        {info.fields.map((field) => {
          const policy = info.policies[field.name]
          const state = policy?.state || 'default'
          return (
            <div className="dos-policy" key={field.name}>
              <div>
                <strong>{field.label}</strong>
                <span>
                  {state === 'default'
                    ? 'Editable starting point'
                    : state === 'locked'
                      ? 'Locked — approval required'
                      : 'Approved — editable'}
                </span>
                {policy?.by && <small>By {policy.by}</small>}
              </div>
              <select
                aria-label={`${field.label} approval`}
                value={state}
                disabled={busy || !info.canApprove}
                onChange={(event) => void change(field.name, event.target.value)}
              >
                <option value="default">Editable default</option>
                <option value="approved">Approved</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          )
        })}
      </div>
    </details>
  )
}
