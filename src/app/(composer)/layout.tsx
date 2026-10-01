import '@/styles/proof.css'
import '@/styles/typography.css'
import '@/styles/composer.css'
import '@/styles/code-preview.css'
import { CodePreviewBanner } from '@/components/site/CodePreviewBanner'

// The page composer is an editing tool: no website header, footer, analytics or cookie notice.
export const metadata = { robots: { index: false, follow: false } }
export default function ComposerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="dos-composer-body">
        <CodePreviewBanner />
        {children}
      </body>
    </html>
  )
}
