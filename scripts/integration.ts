import nextEnv from '@next/env'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
if (process.env.SITE_ENV !== 'local')
  throw new Error('Integration tests require a local disposable database.')
const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')
const payload = await getPayload({ config })
const suffix = Date.now()
const users = await payload.find({ collection: 'users', limit: 1 })
const admin = users.docs[0]
assert(admin, 'Seed an administrator first')
const testUser = await payload.create({
  collection: 'users',
  data: {
    name: 'Integration editor',
    email: `test-${suffix}@example.test`,
    password: `Test-only-${suffix}-complex`,
    role: 'editor',
  },
})
const editor = { ...testUser, collection: 'users' as const }
const page = await payload.create({
  collection: 'pages',
  data: {
    title: 'Published original',
    slug: `integration-${suffix}`,
    summary:
      'Integration fixture for validating publication, access controls and scheduled operations.',
    _status: 'published',
    demo: true,
  },
  user: editor,
  overrideAccess: false,
})
try {
  await payload.update({
    collection: 'pages',
    id: page.id,
    draft: true,
    data: { title: 'Private revision', _status: 'draft' },
    overrideAccess: false,
    user: editor,
  })
  assert.equal(
    (
      await payload.findByID({
        collection: 'pages',
        id: page.id,
        draft: false,
        overrideAccess: false,
      })
    ).title,
    'Published original',
  )
  assert.equal(
    (
      await payload.findByID({
        collection: 'pages',
        id: page.id,
        draft: true,
        overrideAccess: false,
        user: editor,
      })
    ).title,
    'Private revision',
  )
  const anonymousDraft = await payload
    .findByID({ collection: 'pages', id: page.id, draft: true, overrideAccess: false })
    .catch(() => null)
  assert(
    !anonymousDraft || anonymousDraft.title !== 'Private revision',
    'Anonymous requests must not obtain the draft revision',
  )
  await assert.rejects(
    payload.create({
      collection: 'users',
      data: {
        name: 'Denied',
        email: `denied-${suffix}@example.test`,
        password: 'This-must-not-work',
        role: 'admin',
      },
      overrideAccess: false,
      user: editor,
    }),
  )
  await payload
    .update({
      collection: 'users',
      id: editor.id,
      data: { role: 'admin' },
      overrideAccess: false,
      user: editor,
    })
    .catch(() => null)
  assert.equal(
    (await payload.findByID({ collection: 'users', id: editor.id })).role,
    'editor',
    'Editors cannot promote themselves',
  )
  const unpublished = await payload.update({
    collection: 'pages',
    id: page.id,
    data: { _status: 'draft' },
    overrideAccess: false,
    user: editor,
  })
  assert.equal(unpublished._status, 'draft')
  await assert.rejects(
    payload.findByID({ collection: 'pages', id: page.id, overrideAccess: false }),
  )
  await payload.jobs.queue({
    task: 'schedulePublish',
    input: { type: 'publish', doc: { relationTo: 'pages', value: page.id }, user: admin.id },
  })
  await payload.jobs.run({ allQueues: true })
  assert.equal(
    (await payload.findByID({ collection: 'pages', id: page.id, overrideAccess: false }))._status,
    'published',
  )
  await payload.jobs.queue({
    task: 'schedulePublish',
    input: { type: 'unpublish', doc: { relationTo: 'pages', value: page.id }, user: admin.id },
  })
  await payload.jobs.run({ allQueues: true })
  await assert.rejects(
    payload.findByID({ collection: 'pages', id: page.id, overrideAccess: false }),
  )
  console.log(
    'PASS: public/draft isolation, role protection, unpublish, scheduled publish and scheduled unpublish.',
  )
} finally {
  await payload.delete({ collection: 'pages', id: page.id })
  await payload.delete({ collection: 'users', id: testUser.id })
  await payload.destroy()
}
process.exit(0)
