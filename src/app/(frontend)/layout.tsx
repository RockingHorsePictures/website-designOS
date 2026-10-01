import { CodePreviewBanner } from '@/components/site/CodePreviewBanner'
import '@/styles/code-preview.css'
import { SiteLink } from '@/components/site/SiteLink'
import { siteCMS, siteView, siteSnapshot, siteLocale, siteLocales } from '@/lib/site'
import '@/styles/proof.css'
import '@/styles/typography.css'
import { previewUser } from '@/lib/cms'
import { tokenStyle } from '@/design-system/tokens'
import { typographyStyle } from '@/design-system/typography'
import { CustomFonts } from '@/design-system/CustomFonts'
import Image from 'next/image'
import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LiveRefresh } from '@/editor/LiveRefresh'
import { imageSrc, siteOrigin } from '@/lib/urls'
import { localeLabel, localePath, rtlLocales, defaultLocale } from '@/lib/locales'
import {
  Analytics,
  Announcement,
  CookieSettingsLink,
  MotionObserver,
} from '@/components/site/SiteChrome'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const icon = settings.siteIcon && typeof settings.siteIcon === 'object' ? settings.siteIcon : null
  const verification = (settings as { verification?: { google?: string; bing?: string } })
    .verification
  const bing = verification?.bing || process.env.BING_SITE_VERIFICATION
  return {
    robots: {
      index: (await siteView()) === 'live' && Boolean(await siteSnapshot()),
      follow: (await siteView()) === 'live',
    },
    ...(icon?.url ? { icons: { icon: imageSrc(icon.url), apple: imageSrc(icon.url) } } : {}),
    verification: {
      google: verification?.google || process.env.GOOGLE_SITE_VERIFICATION,
      other: bing ? { 'msvalidate.01': bing } : undefined,
    },
  }
}
async function exitPreview() {
  'use server'
  ;(await draftMode()).disable()
  redirect('/')
}
export default async function Layout({ children }: { children: React.ReactNode }) {
  const view = await siteView()
  if (view !== 'workspace' && !(await siteSnapshot()))
    return (
      <html lang="en">
        <body>
          <CodePreviewBanner />
          <main
            id="main"
            style={{
              minHeight: '100vh',
              display: 'grid',
              placeContent: 'center',
              textAlign: 'center',
              padding: 32,
              background: '#fafafa',
              color: '#18181b',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <h1>Coming soon</h1>
            <p>We’re preparing something new. Please check back soon.</p>
          </main>
        </body>
      </html>
    )
  const payload = await siteCMS()
  const [settings, navigation, theme, user, locale, locales, path] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    payload.findGlobal({ slug: 'navigation' }),
    payload.findGlobal({ slug: 'theme' }),
    previewUser(),
    siteLocale(),
    siteLocales(),
    headers().then((h) => h.get('x-designos-path') || '/'),
  ])
  const logo = settings.logo && typeof settings.logo === 'object' ? settings.logo : null
  const channel = view === 'preview' ? '/preview' : view === 'workspace' ? '/workspace-preview' : ''
  const announcement = settings.announcement
  const analytics = settings.analytics
  return (
    <html
      lang={locale === defaultLocale ? settings.language || locale : locale}
      dir={rtlLocales.includes(locale) ? 'rtl' : 'ltr'}
    >
      <body className="site-typography" style={{ ...tokenStyle(theme), ...typographyStyle(theme) }}>
        <CustomFonts theme={theme} />
        <CodePreviewBanner />
        {view === 'preview' && (
          <aside className="notice">
            Site Preview — these changes are not Live. <a href="/admin">Return to editor</a>
          </aside>
        )}
        {user && <LiveRefresh serverURL={siteOrigin()} />}
        <a className="skip" href="#main">
          Skip to content
        </a>
        {announcement?.enabled && announcement.text && (
          <Announcement
            text={announcement.text}
            linkLabel={announcement.linkLabel}
            linkURL={announcement.linkURL}
            dismissible={announcement.dismissible}
          />
        )}
        <header className="site-header">
          <SiteLink href="/" className="site-logo">
            {logo?.url ? (
              <Image
                src={imageSrc(logo.url)}
                alt={settings.companyName}
                width={logo.width || 240}
                height={logo.height || 80}
                unoptimized
                style={{ maxWidth: 240, maxHeight: 64, width: 'auto', height: 'auto' }}
              />
            ) : (
              settings.companyName
            )}
          </SiteLink>
          <nav aria-label="Main navigation">
            {navigation.primary?.map((l) => (
              <SiteLink key={l.id} href={l.url}>
                {l.label}
              </SiteLink>
            ))}
          </nav>
          {locales.length > 1 && (
            <nav aria-label="Language" className="language-switcher">
              {locales.map((code) => (
                <a
                  key={code}
                  href={`${channel}${localePath(path, code)}` || '/'}
                  hrefLang={code}
                  lang={code}
                  aria-current={code === locale ? 'true' : undefined}
                >
                  {localeLabel(code)}
                </a>
              ))}
            </nav>
          )}
        </header>
        {user && (
          <aside className="notice">
            Authenticated draft preview
            <form action={exitPreview}>
              <button>Exit preview</button>
            </form>
          </aside>
        )}
        <main id="main">{children}</main>
        <footer className="site-footer">
          <p>{settings.footerText}</p>
          <nav aria-label="Footer navigation">
            {navigation.footer?.map((l) => (
              <SiteLink href={l.url} key={l.id}>
                {l.label}
              </SiteLink>
            ))}
            {analytics?.provider === 'ga4' && <CookieSettingsLink />}
          </nav>
        </footer>
        <MotionObserver />
        {view === 'live' && analytics?.provider && analytics.provider !== 'none' && (
          <Analytics
            provider={analytics.provider}
            siteId={analytics.siteId}
            scriptURL={analytics.scriptURL}
            consentMessage={settings.consent?.message}
            policyURL={settings.consent?.policyURL}
          />
        )}
      </body>
    </html>
  )
}
