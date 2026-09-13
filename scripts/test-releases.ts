import nextEnv from '@next/env'
import assert from 'node:assert/strict'
import { changePublication, releaseID, type Snapshot } from '../src/lib/releases'
import { policyApproval } from '../src/cms/protection'
nextEnv.loadEnvConfig(process.cwd())
if (process.env.SITE_ENV !== 'local') throw new Error('Disposable local database only.')
const { getPayload, createLocalReq } = await import('payload')
const { default: config } = await import('../payload.config')
const payload = await getPayload({ config })
const admin = {
  ...(await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 }))
    .docs[0],
  collection: 'users' as const,
}
const original = await payload.findGlobal({ slug: 'theme', depth: 0 })
const originalSettings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
const state = await payload.findGlobal({ slug: 'publication', depth: 0 })
const ai = await payload.create({
  collection: 'users',
  data: {
    name: 'Test AI',
    email: `ai-${Date.now()}@example.test`,
    password: 'temporary-test-password-1234',
    role: 'ai',
  },
})
const aiUser = { ...ai, collection: 'users' as const }
const releases: number[] = []
try {
  const previous = await payload.findGlobalVersions({ slug: 'theme', limit: 1, sort: '-updatedAt' })
  const req = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
  const asset = (await payload.find({ collection: 'media', limit: 1 })).docs[0]
  if (asset) {
    await payload.updateGlobal({ slug: 'site-settings', data: { logo: asset.id }, req })
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { protection: { logo: { state: 'locked' } } },
      req,
    })
    await assert.rejects(
      payload.update({
        collection: 'media',
        id: asset.id,
        data: { alt: 'Changed linked logo' },
        user: aiUser,
        overrideAccess: false,
      }),
      /locked brand field/,
    )
    await payload.updateGlobal({ slug: 'site-settings', data: { protection: {} }, req })
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { logo: originalSettings.logo || null, protection: originalSettings.protection || {} },
      req,
    })
  }
  await payload.updateGlobal({
    slug: 'theme',
    data: { protection: { canvas: { state: 'locked', by: admin.email } } },
    req,
  })
  await assert.rejects(
    payload.updateGlobal({
      slug: 'theme',
      data: { canvas: '#112233' },
      user: aiUser,
      overrideAccess: false,
    }),
    /locked/,
  )
  await assert.rejects(
    payload.updateGlobal({
      slug: 'theme',
      data: { protection: {} },
      user: aiUser,
      overrideAccess: false,
    }),
    /approval controls/,
  )
  if (previous.docs[0])
    await assert.rejects(
      payload.restoreGlobalVersion({
        slug: 'theme',
        id: previous.docs[0].id,
        user: aiUser,
        overrideAccess: false,
      }),
      /approval controls|locked/,
    )
  await payload.updateGlobal({
    slug: 'theme',
    data: { accent: '#123456' },
    user: aiUser,
    overrideAccess: false,
  })
  await assert.rejects(
    changePublication(payload, aiUser, 'preview', releaseID(state.previewRelease)),
    /Only a person/,
  )
  await changePublication(payload, admin, 'preview', releaseID(state.previewRelease))
  let current = await payload.findGlobal({ slug: 'publication', depth: 0 })
  const preview = releaseID(current.previewRelease)!
  releases.push(preview)
  await changePublication(payload, admin, 'publish', preview)
  await payload.updateGlobal({
    slug: 'theme',
    data: { accent: '#654321' },
    user: aiUser,
    overrideAccess: false,
  })
  const frozen = await payload.findByID({ collection: 'site-releases', id: preview })
  assert.equal(
    (frozen.snapshot as Snapshot).globals.theme.accent,
    '#123456',
    'Live snapshot must not change after edits',
  )
  await changePublication(payload, admin, 'preview', preview)
  current = await payload.findGlobal({ slug: 'publication', depth: 0 })
  releases.push(releaseID(current.previewRelease)!)
  assert.equal(releaseID(current.liveRelease), preview, 'Saving Preview must not change Live')
  await assert.rejects(changePublication(payload, admin, 'publish', preview), /Preview changed/)
  const media = (frozen.snapshot as Snapshot).collections.media[0]
  if (media)
    await assert.rejects(
      payload.delete({
        collection: 'media',
        id: Number(media.id),
        user: admin,
        overrideAccess: false,
      }),
      /retained/,
    )
  await assert.rejects(
    payload.update({
      collection: 'site-releases',
      id: preview,
      data: { label: 'mutated' },
      user: aiUser,
      overrideAccess: false,
    }),
  )
  await changePublication(payload, admin, 'unpublish', preview)
  assert.equal(
    releaseID((await payload.findGlobal({ slug: 'publication', depth: 0 })).liveRelease),
    null,
  )
  await payload.updateGlobal({
    slug: 'theme',
    data: { protection: { canvas: { state: 'approved' } } },
    req,
  })
  await payload.updateGlobal({
    slug: 'theme',
    data: { canvas: '#112233' },
    user: admin,
    overrideAccess: false,
  })
  console.log(
    'PASS: immutable releases, Preview/Live isolation, stale publication rejection, asset retention, AI permissions and enforced locks.',
  )
} finally {
  const req = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
  await payload.updateGlobal({ slug: 'site-settings', data: { protection: {} }, req })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: { logo: originalSettings.logo || null, protection: originalSettings.protection || {} },
    req,
  })
  await payload.updateGlobal({
    slug: 'theme',
    data: { protection: { canvas: { state: 'default' } } },
    req,
  })
  await payload.updateGlobal({
    slug: 'theme',
    data: { canvas: original.canvas, accent: original.accent },
    req,
  })
  await payload.updateGlobal({
    slug: 'theme',
    data: { protection: original.protection || {} },
    req,
  })
  await payload.updateGlobal({
    slug: 'publication',
    data: {
      previewRelease: releaseID(state.previewRelease),
      liveRelease: releaseID(state.liveRelease),
    },
  })
  for (const id of releases) await payload.delete({ collection: 'site-releases', id })
  await payload.delete({ collection: 'users', id: ai.id })
  await payload.destroy()
}
process.exit(0)
