import '@/styles/proof.css'
import '@/styles/typography.css'
import { cms, previewUser } from '@/lib/cms'
import { tokenStyle } from '@/design-system/tokens'
import { typographyStyle } from '@/design-system/typography'
import { CustomFonts } from '@/design-system/CustomFonts'
import Image from 'next/image'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { LiveRefresh } from '@/editor/LiveRefresh'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const settings = await (await cms()).findGlobal({ slug: 'site-settings' })
  const icon = settings.siteIcon && typeof settings.siteIcon === 'object' ? settings.siteIcon : null
  return {
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
  const payload = await cms()
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
        {user && <LiveRefresh />}
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <a href="/">
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
          </a>
          <nav aria-label="Main navigation">
            {navigation.primary?.map((l) => (
              <a key={l.id} href={l.url}>
                {l.label}
              </a>
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
              <a href={l.url} key={l.id}>
                {l.label}
              </a>
            ))}
          </nav>
        </footer>
      </body>
    </html>
  )
}
