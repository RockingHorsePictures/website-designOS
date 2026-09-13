'use client'
import { useRef, useState } from 'react'
import { Puck, type Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { createPuckConfig } from './registry/config'
import { previewWidths } from '../design-system/tokens'
import type { ProjectSummary } from '../components/sections'
import { compositionSchema, type Composition } from './registry/schema'
import type { Theme } from '../payload-types'

export function PageComposer({
  id,
  title,
  initial,
  updatedAt,
  projects,
  theme,
}: {
  id: number
  title: string
  initial: Composition
  updatedAt: string
  projects: ProjectSummary[]
  theme: Theme
}) {
  const [version, setVersion] = useState(updatedAt)
  const currentData = useRef<Data>(initial as Data)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(
    'Changes are saved as drafts. Publish from the page editor.',
  )
  const save = async (data: Data) => {
    if (busy) return
    const valid = compositionSchema.safeParse(data)
    if (!valid.success) {
      setMessage('Invalid section configuration. Check the fields.')
      return
    }
    setBusy(true)
    setMessage('Saving draft…')
    try {
      const res = await fetch(`/api/composition/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composition: valid.data, updatedAt: version }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save draft.')
      setVersion(result.updatedAt)
      setMessage('Draft saved. Return to the page editor to review and publish.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="composer-bar">
        <a href={`/admin/collections/pages/${id}`}>← Back to page editor</a>
        <span>{title}</span>
        <span role="status" data-testid="composer-status">
          {message}
        </span>
      </div>
      <Puck
        config={createPuckConfig(projects, theme)}
        data={initial as Data}
        onChange={(data) => {
          currentData.current = data
        }}
        viewports={previewWidths.map((v) => ({
          width: v.width,
          height: 'auto',
          label: v.label,
          icon: <span>{v.label}</span>,
        }))}
        headerTitle="Page composer"
        headerPath={title}
        overrides={{
          headerActions: () => (
            <button type="button" disabled={busy} onClick={() => save(currentData.current)}>
              {busy ? 'Saving…' : 'Save draft'}
            </button>
          ),
        }}
        dictionary={{ 'header-publish': 'Save draft' }}
      />
    </>
  )
}
