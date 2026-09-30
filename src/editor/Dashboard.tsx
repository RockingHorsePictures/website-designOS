'use client'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Dashboard as Data } from '../lib/dashboard'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
const ago = (iso: string) => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const f = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (s < 60) return f.format(-s, 'second')
  if (s < 3600) return f.format(-Math.round(s / 60), 'minute')
  if (s < 86400) return f.format(-Math.round(s / 3600), 'hour')
  return f.format(-Math.round(s / 86400), 'day')
}
// Numbers count up once when they appear (skipped with reduced motion).
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{shown}</>
}
function Card({
  i,
  className = '',
  children,
}: {
  i: number
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`dos-card ${className}`} style={{ ['--i' as string]: i }}>
      {children}
    </section>
  )
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog ref={ref} className="dos-dialog" onClose={onClose} aria-labelledby="dos-dialog-title">
      <div className="dos-dialog-head">
        <h2 id="dos-dialog-title">{title}</h2>
        <button type="button" className="dos-icon-button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

function NewPage({ templates, onClose }: { templates: Data['templates']; onClose: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [edited, setEdited] = useState(false)
  const [template, setTemplate] = useState<string>('starter')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/pages/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug: edited ? slug : slugify(title),
        template:
          template === 'blank' ? null : template === 'starter' ? 'starter' : Number(template),
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'The page could not be created.')
      setBusy(false)
      return
    }
    router.push(`/editor/${body.id}`)
  }
  return (
    <Modal title="New page" onClose={onClose}>
      <form onSubmit={submit} className="dos-form">
        <label>
          Page title
          <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Web address
          <span className="dos-prefix">
            <span>/</span>
            <input
              value={edited ? slug : slugify(title)}
              onChange={(e) => {
                setEdited(true)
                setSlug(slugify(e.target.value))
              }}
              required
            />
          </span>
        </label>
        <fieldset className="dos-choices">
          <legend>Start from</legend>
          {[
            ['starter', 'A simple starter', 'Hero and contact sections to build on'],
            ['blank', 'A blank page', 'Add sections yourself'],
            ...templates.map((t) => [String(t.id), t.title, 'Your page template']),
          ].map(([value, label, hint]) => (
            <label key={value} className={template === value ? 'is-selected' : ''}>
              <input
                type="radio"
                name="template"
                value={value}
                checked={template === value}
                onChange={() => setTemplate(value)}
              />
              <strong>{label}</strong>
              <span>{hint}</span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="dos-error">
            {error}
          </p>
        )}
        <div className="dos-button-row">
          <button type="button" className="dos-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dos-button dos-button--primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create and open composer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
function Invite({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) setError(body.error || 'The invitation failed.')
    else setMessage(body.message)
  }
  return (
    <Modal title="Invite a teammate" onClose={onClose}>
      {message ? (
        <div className="dos-form">
          <p className="dos-success" role="status">
            {message}
          </p>
          <div className="dos-button-row">
            <button type="button" className="dos-button dos-button--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="dos-form">
          <label>
            Name
            <input name="name" required autoFocus />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="editor">
              <option value="editor">Editor: edits content and publishes</option>
              <option value="admin">Administrator: also manages people and settings</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="dos-error">
              {error}
            </p>
          )}
          <div className="dos-button-row">
            <button type="button" className="dos-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dos-button dos-button--primary" disabled={busy}>
              {busy ? 'Inviting…' : 'Send invitation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null)
  const [dialog, setDialog] = useState<'page' | 'invite' | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/dashboard', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((value) => value && setData(value))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  if (!data)
    return (
      <div className="dos-dashboard is-loading" aria-busy="true">
        <div className="dos-skeleton dos-skeleton--hero" />
        <div className="dos-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dos-skeleton dos-skeleton--stat" />
          ))}
        </div>
      </div>
    )
  const p = data.publishing
  const status = !p.live
    ? { tone: 'draft', label: 'Not published yet' }
    : p.unsavedChanges || p.previewDiffersFromLive
      ? { tone: 'pending', label: 'Live · unpublished changes' }
      : { tone: 'live', label: 'Live and up to date' }
  const done = data.checklist.filter((c) => c.done).length
  const progress = done / data.checklist.length
  return (
    <div className="dos-dashboard">
      {data.update && (
        <aside className="dos-update" role="status">
          <span className="dos-update-dot" aria-hidden="true" />
          <p>
            <strong>Design OS {data.update.version} is available.</strong> An update pull request
            opens automatically in your GitHub repository; review its preview and merge it to
            update.
          </p>
          {data.update.repo && (
            <a
              className="dos-button"
              href={`${data.update.repo}/pulls`}
              target="_blank"
              rel="noreferrer"
            >
              Review update
            </a>
          )}
        </aside>
      )}
      <header className="dos-hero">
        <div>
          <p className="dos-eyebrow">{data.company}</p>
          <h1>
            {greeting()}, {data.user.name.split(' ')[0]}
          </h1>
          <p className={`dos-status dos-status--${status.tone}`}>
            <span aria-hidden="true" />
            {status.label}
            {p.liveAt && <em> · published {ago(p.liveAt)}</em>}
          </p>
        </div>
        <div className="dos-hero-actions">
          <a className="dos-button" href="/" target="_blank" rel="noreferrer">
            View website <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className="dos-button dos-button--primary"
            onClick={() => setDialog('page')}
          >
            <span aria-hidden="true">＋</span> New page
          </button>
        </div>
      </header>

      <div className="dos-stats">
        {[
          ['Pages', data.counts.pages, '/admin/collections/pages'],
          ['Blog posts', data.counts.posts, '/admin/collections/posts'],
          ['New enquiries', data.newEnquiries ?? 0, '/admin/collections/form-submissions'],
          ['Languages', data.languages.length, '/admin/globals/site-settings'],
        ].map(([label, value, href], i) => (
          <a
            key={String(label)}
            className="dos-stat"
            href={String(href)}
            style={{ ['--i' as string]: i }}
          >
            <span className="dos-stat-value">
              <CountUp value={Number(value) || 0} />
            </span>
            <span className="dos-stat-label">{label}</span>
            {label === 'New enquiries' && Number(value) > 0 && (
              <span className="dos-badge">New</span>
            )}
          </a>
        ))}
      </div>

      <div className="dos-grid">
        <Card i={1} className="dos-checklist">
          <div className="dos-card-head">
            <h2>Getting started</h2>
            <svg
              className="dos-ring"
              viewBox="0 0 36 36"
              role="img"
              aria-label={`${done} of ${data.checklist.length} done`}
            >
              <circle cx="18" cy="18" r="15.5" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                className="dos-ring-value"
                style={{ strokeDashoffset: 97.4 * (1 - progress) }}
              />
              <text x="18" y="21.5">
                {Math.round(progress * 100)}%
              </text>
            </svg>
          </div>
          <ul>
            {data.checklist.map((item) => (
              <li key={item.id} className={item.done ? 'is-done' : ''}>
                <span className="dos-check" aria-hidden="true">
                  {item.done ? '✓' : ''}
                </span>
                <a href={item.href}>{item.label}</a>
                <span className="sr-only">{item.done ? '(done)' : '(to do)'}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card i={2} className="dos-recent">
          <div className="dos-card-head">
            <h2>Recently edited</h2>
          </div>
          {data.edits.length ? (
            <ul>
              {data.edits.map((edit) => (
                <li key={edit.href}>
                  <a href={edit.href}>
                    <span className="dos-kind">{edit.kind}</span>
                    <strong>{edit.title}</strong>
                    <time dateTime={edit.updatedAt}>{ago(edit.updatedAt)}</time>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dos-empty">Nothing yet. Create your first page to get going.</p>
          )}
        </Card>
      </div>

      <Card i={3} className="dos-actions">
        <h2>Quick actions</h2>
        <div className="dos-action-grid">
          {[
            [
              '✎',
              'Write a blog post',
              'Share news and insights',
              '/admin/collections/posts/create',
            ],
            [
              '▧',
              'Upload images',
              'Add photos with descriptions',
              '/admin/collections/media/create',
            ],
            [
              '☰',
              'Edit navigation',
              'Menus in the header and footer',
              '/admin/globals/navigation',
            ],
            ['◐', 'Brand and theme', 'Colours, fonts and logos', '/admin/globals/theme'],
            ['✉', 'Forms', 'Build forms and read enquiries', '/admin/collections/forms'],
            ['⧉', 'Reusable blocks', 'Edit once, use on many pages', '/admin/collections/blocks'],
          ].map(([icon, title, hint, href]) => (
            <a key={href} href={href} className="dos-action">
              <span className="dos-action-icon" aria-hidden="true">
                {icon}
              </span>
              <strong>{title}</strong>
              <span>{hint}</span>
            </a>
          ))}
          {data.user.role === 'admin' && (
            <button type="button" className="dos-action" onClick={() => setDialog('invite')}>
              <span className="dos-action-icon" aria-hidden="true">
                ☺
              </span>
              <strong>Invite a teammate</strong>
              <span>Editors and administrators</span>
            </button>
          )}
        </div>
      </Card>
      {dialog === 'page' && <NewPage templates={data.templates} onClose={() => setDialog(null)} />}
      {dialog === 'invite' && <Invite onClose={() => setDialog(null)} />}
    </div>
  )
}
