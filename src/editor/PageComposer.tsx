'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Puck, type Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { createPuckConfig, type EditorData } from './registry/config'
import { previewWidths } from '../design-system/tokens'
import { blockCompositionSchema, compositionSchema, type Composition } from './registry/schema'
import { defaultLocale, localeLabel } from '../lib/locales'
import type { Theme } from '../payload-types'

// Small device glyphs for the viewport switcher (its buttons are icon-sized).
function DeviceIcon({ name }: { name: string }) {
  const size =
    name === 'mobile' ? [7, 3, 10, 18] : name === 'tablet' ? [5, 3, 14, 18] : [2, 4, 20, 13]
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x={size[0]} y={size[1]} width={size[2]} height={size[3]} rx="2" />
      {name === 'desktop' && <path d="M8 21h8M12 17v4" />}
    </svg>
  )
}

export function PageComposer({
  id,
  collection = 'pages',
  locale = defaultLocale,
  languages = [defaultLocale],
  title,
  initial,
  updatedAt,
  data,
  theme,
}: {
  id: number
  collection?: 'pages' | 'blocks'
  locale?: string
  languages?: string[]
  title: string
  initial: Composition
  updatedAt: string
  data: EditorData
  theme: Theme
}) {
  const config = useMemo(() => createPuckConfig(data, theme), [data, theme])
  const [version, setVersion] = useState(updatedAt)
  const currentData = useRef<Data>(initial as Data)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<{ tone: 'info' | 'ok' | 'error'; text: string }>({
    tone: 'info',
    text: 'Changes save as drafts. Publish from Overview when the site is ready.',
  })
  const back = `/admin/collections/${collection}/${id}${locale !== defaultLocale ? `?locale=${locale}` : ''}`
  const save = useCallback(async () => {
    if (busy) return
    const schema = collection === 'blocks' ? blockCompositionSchema : compositionSchema
    const valid = schema.safeParse(currentData.current)
    if (!valid.success) {
      setStatus({
        tone: 'error',
        text: valid.error.issues[0]?.message || 'A section has an invalid setting.',
      })
      return
    }
    setBusy(true)
    setStatus({ tone: 'info', text: 'Saving draft…' })
    try {
      const res = await fetch(`/api/composition/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composition: valid.data, updatedAt: version, collection, locale }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save draft.')
      setVersion(result.updatedAt)
      setDirty(false)
      setStatus({ tone: 'ok', text: 'Draft saved.' })
    } catch (e) {
      setStatus({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save.' })
    } finally {
      setBusy(false)
    }
  }, [busy, collection, id, locale, version])
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('keydown', keys)
    window.addEventListener('beforeunload', leave)
    return () => {
      window.removeEventListener('keydown', keys)
      window.removeEventListener('beforeunload', leave)
    }
  }, [dirty, save])
  return (
    <div className="dos-composer">
      <div className="composer-bar">
        <a className="composer-back" href={back}>
          <span aria-hidden="true">←</span>{' '}
          {collection === 'blocks' ? 'Block settings' : 'Page settings'}
        </a>
        <strong className="composer-title">{title}</strong>
        {languages.length > 1 && (
          <nav className="composer-languages" aria-label="Edit language">
            {languages.map((code) => (
              <a
                key={code}
                href={`/editor/${id}?${new URLSearchParams({ ...(collection === 'blocks' ? { collection } : {}), locale: code })}`}
                aria-current={code === locale ? 'true' : undefined}
                title={localeLabel(code)}
              >
                {code.toUpperCase()}
              </a>
            ))}
          </nav>
        )}
        <span
          role="status"
          data-testid="composer-status"
          className={`composer-status tone-${dirty && status.tone !== 'error' ? 'dirty' : status.tone}`}
        >
          {dirty && status.tone !== 'error' ? 'Unsaved changes' : status.text}
        </span>
      </div>
      <Puck
        config={config}
        data={initial as Data}
        onChange={(next) => {
          currentData.current = next
          setDirty(true)
        }}
        viewports={previewWidths.map((v) => ({
          width: v.width,
          height: 'auto',
          label: v.label,
          icon: <DeviceIcon name={v.name} />,
        }))}
        headerTitle={collection === 'blocks' ? 'Reusable block' : 'Page composer'}
        headerPath={locale !== defaultLocale ? `${title} · ${localeLabel(locale)}` : title}
        overrides={{
          headerActions: () => (
            <button
              type="button"
              className="composer-save"
              disabled={busy}
              onClick={() => void save()}
              title="Save draft (Ctrl/⌘ + S)"
            >
              {busy ? 'Saving…' : 'Save draft'}
            </button>
          ),
        }}
        dictionary={{ 'header-publish': 'Save draft' }}
      />
    </div>
  )
}
