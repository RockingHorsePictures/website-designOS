import '@/styles/proof.css'
import { cms, previewUser } from '@/lib/cms'
import { tokenStyle } from '@/design-system/tokens'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { LiveRefresh } from '@/editor/LiveRefresh'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return {
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
  return (
    <html lang="en">
      <body style={tokenStyle(theme)}>
        {user && <LiveRefresh />}
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <a href="/">{settings.companyName}</a>
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
