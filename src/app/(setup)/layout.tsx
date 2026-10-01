import '@/styles/code-preview.css'
import { CodePreviewBanner } from '@/components/site/CodePreviewBanner'
import './setup.css'

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CodePreviewBanner />
        {children}
      </body>
    </html>
  )
}
