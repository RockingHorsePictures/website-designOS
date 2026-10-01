import { cms, currentUser } from '@/lib/cms'
import { codePreview, codePreviewMessage } from '@/lib/code-preview'
import { pendingConnection } from '@/lib/ai-live/connect'
import { ConnectDecision } from './ConnectDecision'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Connect your AI', robots: { index: false, follow: false } }

// Opened from the link `npm run ai:connect -- live <site>` prints. An administrator approves (or
// declines) the AI tool's connection request.
export default async function ConnectAI({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code = '' } = await searchParams
  const card = (children: React.ReactNode) => (
    <main className="setup">
      <div className="setup-card">
        <div className="setup-mark" aria-hidden="true">
          D
        </div>
        {children}
      </div>
    </main>
  )
  if (codePreview())
    return card(
      <>
        <h1>Connect your AI on the live address</h1>
        <p className="setup-lead">{codePreviewMessage()}</p>
      </>,
    )
  const user = await currentUser()
  if (!user)
    return card(
      <>
        <h1>Connect your AI</h1>
        <p className="setup-lead">Sign in as an administrator first, then open this link again.</p>
        <p>
          <a href={`/admin/login?redirect=${encodeURIComponent(`/connect-ai?code=${code}`)}`}>
            Sign in
          </a>
        </p>
      </>,
    )
  if (user.role !== 'admin')
    return card(
      <>
        <h1>Connect your AI</h1>
        <p className="setup-lead">Only an administrator can connect an AI tool to this website.</p>
      </>,
    )
  const pending = code ? await pendingConnection(await cms(), code) : null
  if (!pending)
    return card(
      <>
        <h1>This request has expired</h1>
        <p className="setup-lead">
          Connection requests last 15 minutes. Ask your AI to run{' '}
          <code>npm run ai:connect -- live</code> again.
        </p>
      </>,
    )
  return card(
    <>
      <h1>Connect your AI?</h1>
      <p className="setup-lead">
        <strong>{pending.label}</strong> wants to connect to this website with the code{' '}
        <code>{pending.code}</code>. Check it matches what your AI tool shows.
      </p>
      <ul className="setup-list">
        <li>It can read your workspace: pages, records, settings and their approvals.</li>
        <li>
          It can save drafts only while you allow AI edits (Overview → AI editing). Every change is
          listed there with Undo.
        </li>
        <li>
          It can never save a Preview, publish, approve, unlock, change locked fields or delete.
        </li>
      </ul>
      <ConnectDecision code={pending.code} />
    </>,
  )
}
