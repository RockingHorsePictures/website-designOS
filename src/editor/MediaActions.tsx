'use client'
import { useRef, useState } from 'react'
import { useDocumentInfo, useForm } from '@payloadcms/ui'

// Image tools on the media edit screen: replace the file everywhere it's used, and suggest alt text.
export function MediaActions() {
  const { id } = useDocumentInfo()
  const { dispatchFields } = useForm()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [replacing, setReplacing] = useState('')
  const input = useRef<HTMLInputElement>(null)

  async function replace(file: File) {
    setReplacing('Uploading the new image…')
    const form = new FormData()
    form.set('file', file)
    form.set('_payload', JSON.stringify({}))
    const res = await fetch(`/api/media/${id}?depth=0`, {
      method: 'PATCH',
      body: form,
      credentials: 'include',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setReplacing(
        body?.errors?.[0]?.message ||
          'The image could not be replaced. Check it is a JPEG, PNG, WebP or AVIF.',
      )
      return
    }
    setReplacing('Replaced. Reloading…')
    window.location.reload()
  }

  return (
    <div className="dos-media-actions">
      {id && (
        <div className="dos-media-replace">
          <p>
            <strong>Replace image</strong>
          </p>
          <p>
            Every page, case study and setting that uses this image shows the new one after your
            next Save to Preview. Previews and Live versions you&rsquo;ve already saved keep the
            current image until then.
          </p>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void replace(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small"
            disabled={Boolean(replacing) && !replacing.startsWith('The image')}
            onClick={() => input.current?.click()}
          >
            Choose a new image…
          </button>
          {replacing && <p role="status">{replacing}</p>}
        </div>
      )}
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
