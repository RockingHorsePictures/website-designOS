import { PublishingPanel } from './PublishingPanel'
import { BuildGuide } from './BuildGuide'
import { SiteHealth } from './SiteHealth'
import { Dashboard } from './Dashboard'

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
  return (
    <div className="dos-home">
      <Dashboard />
      <div id="publishing" className="dos-reveal" style={{ ['--i' as string]: 4 }}>
        <PublishingPanel />
      </div>
      <div className="dos-reveal" style={{ ['--i' as string]: 5 }}>
        <SiteHealth />
      </div>
      <div className="dos-reveal" style={{ ['--i' as string]: 6 }}>
        <BuildGuide />
      </div>
    </div>
  )
}
