import { redirect } from 'next/navigation'
import { cms } from '@/lib/cms'
import { googleEnabled } from '@/lib/auth/google'
import { SetupForm } from './SetupForm'
import { setupCodeRequired } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Set up your website', robots: { index: false, follow: false } }

export default async function Setup() {
  const payload = await cms()
  if ((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs)
    redirect('/admin')
  const needsCode = await setupCodeRequired()
  const configured = !needsCode || (process.env.DESIGNOS_SETUP_CODE || '').length >= 8
  return (
    <main className="setup">
      <div className="setup-card">
        <div className="setup-mark" aria-hidden="true">
          D
        </div>
        <h1>Welcome to your new website</h1>
        <p className="setup-lead">
          Create the administrator account for this site. You can invite your team afterwards.
        </p>
        {configured ? (
          <SetupForm needsCode={needsCode} google={googleEnabled()} />
        ) : (
          <div className="setup-help">
            <p>
              <strong>One step first:</strong> add an environment variable named{' '}
              <code>DESIGNOS_SETUP_CODE</code> (any phrase of 8+ characters that only you know) in
              your Vercel project → Settings → Environment Variables, then redeploy. It stops anyone
              else claiming this site before you do.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
