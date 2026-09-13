import { PublishingPanel } from './PublishingPanel'
import { BuildGuide } from './BuildGuide'

export function WorkspaceIcon() {
  return (
    <svg className="dos-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" fill="currentColor" />
      <path
        d="M10 10h5a6 6 0 0 1 0 12h-5V10Z"
        stroke="var(--dos-on-accent, white)"
        strokeWidth="2.5"
      />
      <path d="M10 16h9" stroke="var(--dos-on-accent, white)" strokeWidth="2.5" />
    </svg>
  )
}

export function WorkspaceLogo() {
  return (
    <div className="dos-brand">
      <WorkspaceIcon />
      <div>
        <strong>Design OS</strong>
        <span>Your website workspace</span>
      </div>
    </div>
  )
}

function environment() {
  return process.env.SITE_ENV === 'production'
    ? 'Production'
    : process.env.SITE_ENV === 'preview'
      ? 'Preview'
      : 'Local'
}

export function EnvironmentBadge() {
  const label = environment()
  return (
    <span
      className={`dos-environment dos-environment--${label.toLowerCase()}`}
      title={
        label === 'Production'
          ? 'Live website. Publishing content makes it public.'
          : 'Test workspace. Content here is separate from the live website.'
      }
    >
      <span aria-hidden="true" />
      {label} workspace
    </span>
  )
}

export function WorkspaceNav() {
  return (
    <div className="dos-nav-home">
      <a href="/admin">
        Overview <span aria-hidden="true">↗</span>
      </a>
      <p>Manage your website</p>
    </div>
  )
}

export function WorkspaceHome() {
  const live = environment() === 'Production'
  return (
    <div className="dos-home">
      <header className="dos-welcome">
        <div>
          <p className="dos-eyebrow">DESIGN OS / WORKSPACE</p>
          <h1>A home for your website.</h1>
          <p>Edit your content, shape your brand, and keep everything up to date.</p>
        </div>
        <a className="dos-button dos-button--primary" href="/" target="_blank" rel="noreferrer">
          View website <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className="dos-shortcuts">
        <a href="/admin/collections/pages">
          <span className="dos-shortcut-icon" aria-hidden="true">
            Aa
          </span>
          <div>
            <strong>Edit your pages</strong>
            <span>Copy, sections and publishing</span>
          </div>
          <span aria-hidden="true">→</span>
        </a>
        <a href="/admin/collections/media">
          <span className="dos-shortcut-icon" aria-hidden="true">
            ▧
          </span>
          <div>
            <strong>Organise your assets</strong>
            <span>Images and media descriptions</span>
          </div>
          <span aria-hidden="true">→</span>
        </a>
        <a href="/admin/globals/site-settings">
          <span className="dos-shortcut-icon" aria-hidden="true">
            ◈
          </span>
          <div>
            <strong>Make it yours</strong>
            <span>Company details and brand assets</span>
          </div>
          <span aria-hidden="true">→</span>
        </a>
      </div>
      <aside className="dos-workspace-note">
        <EnvironmentBadge />
        <p>
          {live
            ? 'One editing workspace. Save to Preview, review it, then publish the whole site to Live.'
            : 'This is a test workspace. Content and uploads here stay separate from Production; deploying code does not move them.'}
        </p>
      </aside>
      <PublishingPanel />
      <BuildGuide />
    </div>
  )
}
