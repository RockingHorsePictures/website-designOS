import { getPayload } from 'payload'
import config from '../payload.config'
import { initializeSite } from '../src/lib/setup'
if (!['production', 'preview'].includes(process.env.SITE_ENV || ''))
  throw new Error('Installer initialization is for a newly provisioned hosted environment.')
if (
  !process.env.BOOTSTRAP_EMAIL ||
  !process.env.BOOTSTRAP_PASSWORD ||
  process.env.BOOTSTRAP_PASSWORD.length < 16
)
  throw new Error('Administrator credentials are required.')
const payload = await getPayload({ config })
const users = await payload.find({ collection: 'users', limit: 2 })
if (
  users.totalDocs &&
  (users.totalDocs !== 1 || users.docs[0].email !== process.env.BOOTSTRAP_EMAIL)
)
  throw new Error('This database already belongs to an existing site. Initialization stopped.')
if (!users.totalDocs)
  await initializeSite(payload, {
    name: 'Administrator',
    email: process.env.BOOTSTRAP_EMAIL,
    password: process.env.BOOTSTRAP_PASSWORD,
    company: process.env.SETUP_SITE_NAME || 'Your company',
  })
console.log('Administrator and starting page are ready. No site release has been published.')
await payload.destroy()
process.exit(0)
