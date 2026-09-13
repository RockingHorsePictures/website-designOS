'use client'
import { useState } from 'react'
import { useDocumentInfo, useForm } from '@payloadcms/ui'
export function MediaActions() {
  const { id } = useDocumentInfo()
  const { dispatchFields } = useForm()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div>
      <p>Manual image descriptions always work. AI suggestions need human review.</p>
      <button
        type="button"
        disabled={!id || busy}
        onClick={async () => {
          setBusy(true)
          try {
            const res = await fetch(`/api/media-alt/${id}`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            if (data.text) {
              dispatchFields({ type: 'UPDATE', path: 'alt', value: data.text })
              setMessage('Suggestion loaded. Review it, then save to apply.')
            } else setMessage(data.reason || 'Add a description manually.')
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Could not generate description.')
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Generating…' : 'Regenerate alt text suggestion'}
      </button>
      <p role="status">{message}</p>
    </div>
  )
}
