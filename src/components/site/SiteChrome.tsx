'use client'
import Script from 'next/script'
import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { SiteLink } from './SiteLink'

const store = (key: string) => ({
  get: () => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (value: string) => {
    try {
      localStorage.setItem(key, value)
      window.dispatchEvent(new StorageEvent('storage', { key }))
    } catch {}
  },
})
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

// Site-wide notice from Site Settings → Announcement bar. Dismissal is remembered per message.
export function Announcement({
  text,
  linkLabel,
  linkURL,
  dismissible,
}: {
  text: string
  linkLabel?: string | null
  linkURL?: string | null
  dismissible?: boolean | null
}) {
  const key = `designos-announcement:${text}`
  const s = store(key)
  const dismissed = useSyncExternalStore(
    subscribe,
    () => s.get() === '1',
    () => false,
  )
  if (dismissed) return null
  return (
    <aside className="announcement" aria-label="Announcement">
      <p>
        {text} {linkLabel && linkURL && <SiteLink href={linkURL}>{linkLabel}</SiteLink>}
      </p>
      {dismissible && (
        <button type="button" onClick={() => s.set('1')} aria-label="Dismiss announcement">
          ×
        </button>
      )}
    </aside>
  )
}

type AnalyticsConfig = {
  provider: 'vercel' | 'plausible' | 'fathom' | 'umami' | 'ga4'
  siteId?: string | null
  scriptURL?: string | null
  consentMessage?: string | null
  policyURL?: string | null
}
// Loads the chosen analytics script. Cookie-free providers load straight away; Google Analytics
// only loads after the visitor accepts, and the choice can be changed from the footer link.
export function Analytics(config: AnalyticsConfig) {
  const consent = store('designos-analytics-consent')
  const choice = useSyncExternalStore(subscribe, consent.get, () => 'pending')
  const needsConsent = config.provider === 'ga4'
  const allowed = !needsConsent || choice === 'granted'
  const id = config.siteId || ''
  return (
    <>
      {allowed && config.provider === 'vercel' && (
        <Script src="/_vercel/insights/script.js" defer />
      )}
      {allowed && config.provider === 'plausible' && id && (
        <Script src="https://plausible.io/js/script.js" data-domain={id} defer />
      )}
      {allowed && config.provider === 'fathom' && id && (
        <Script src="https://cdn.usefathom.com/script.js" data-site={id} defer />
      )}
      {allowed && config.provider === 'umami' && id && config.scriptURL && (
        <Script src={config.scriptURL} data-website-id={id} defer />
      )}
      {allowed && config.provider === 'ga4' && /^G-[A-Z0-9]+$/.test(id) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} async />
          <Script id="ga4">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {needsConsent && choice !== 'granted' && choice !== 'denied' && (
        <aside className="consent" role="dialog" aria-label="Cookie choice" aria-live="polite">
          <p>
            {config.consentMessage}{' '}
            {config.policyURL && <SiteLink href={config.policyURL}>Privacy policy</SiteLink>}
          </p>
          <div>
            <button type="button" onClick={() => consent.set('granted')}>
              Accept
            </button>
            <button type="button" onClick={() => consent.set('denied')}>
              Decline
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="link-button"
      onClick={() => store('designos-analytics-consent').set('pending')}
    >
      Cookie settings
    </button>
  )
}

// Reveals sections with a motion preset as they scroll into view. Without JavaScript, or with
// reduced motion, everything is simply visible.
export function MotionObserver() {
  const path = usePathname()
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('.motion:not(.is-in)')
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      items.forEach((el) => el.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target)
          }
        }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    )
    items.forEach((el) => observer.observe(el))
    document.documentElement.classList.add('motion-ready')
    return () => observer.disconnect()
  }, [path])
  return null
}
