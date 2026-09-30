import type { Payload } from 'payload'
import { starterComposition } from './starter'

// Creates the first administrator, a draft homepage and the company name for a new site. Used
// by the guided installer and by the /setup page of Deploy Button sites. Never runs twice.
export async function initializeSite(
  payload: Payload,
  owner: { name: string; email: string; password: string; company: string },
) {
  const users = await payload.count({ collection: 'users', overrideAccess: true })
  if (users.totalDocs) throw new Error('This site already has an administrator.')
  const user = await payload.create({
    collection: 'users',
    data: {
      name: owner.name || 'Administrator',
      email: owner.email,
      password: owner.password,
      role: 'admin',
    },
    overrideAccess: true,
  })
  if (!(await payload.count({ collection: 'pages' })).totalDocs)
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Welcome',
        slug: 'home',
        summary: `${owner.company || 'Your new website'} starts here. Edit this page in your website workspace.`,
        composition: starterComposition(owner.company),
        _status: 'draft',
      },
    })
  const settings = await payload.findGlobal({ slug: 'site-settings' })
  if (!settings.companyName || settings.companyName === 'Coming soon')
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { companyName: owner.company || 'Your company' },
    })
  return user
}
