import { SiteLink } from '@/components/site/SiteLink'
import { siteCMS, siteView, siteSnapshot } from '@/lib/site'
import '@/styles/proof.css'
import '@/styles/typography.css'
import { previewUser } from '@/lib/cms'
import { tokenStyle } from '@/design-system/tokens'
import { typographyStyle } from '@/design-system/typography'
import { CustomFonts } from '@/design-system/CustomFonts'
import Image from 'next/image'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { LiveRefresh } from '@/editor/LiveRefresh'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const icon = settings.siteIcon && typeof settings.siteIcon === 'object' ? settings.siteIcon : null
  return {
    robots: {
      index: (await siteView()) === 'live' && Boolean(await siteSnapshot()),
      follow: (await siteView()) === 'live',
    },
    ...(icon?.url ? { icons: { icon: icon.url, apple: icon.url } } : {}),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: process.env.BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
        : undefined,
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
            }}
          >
            <h1>Coming soon</h1>
            <p>We’re preparing something new. Please check back soon.</p>
            <a href="/admin">Open editor</a>
          </main>
        </body>
      </html>
    )
  const payload = await siteCMS()
  const [settings, navigation, theme, user] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    payload.findGlobal({ slug: 'navigation' }),
    payload.findGlobal({ slug: 'theme' }),
    previewUser(),
  ])
  const logo = settings.logo && typeof settings.logo === 'object' ? settings.logo : null
  return (
    <html lang="en">
      <body className="site-typography" style={{ ...tokenStyle(theme), ...typographyStyle(theme) }}>
        <CustomFonts theme={theme} />
        {view === 'preview' && (
          <aside className="notice">
            Site Preview — these changes are not Live. <a href="/admin">Return to editor</a>
          </aside>
        )}
        {user && <LiveRefresh />}
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <SiteLink href="/">
            {logo?.url ? (
              <Image
                src={logo.url}
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
            <a href="/admin">Open editor</a>
          </nav>
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
          </nav>
        </footer>
      </body>
    </html>
  )
}
