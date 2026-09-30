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
  // A restore that would change a locked value is refused; one that only touches unlocked
  // fields succeeds and keeps the current locks (old approval records never come back).
  const lockedCanvas = (await payload.findGlobal({ slug: 'theme', depth: 0 })).canvas
  const otherCanvas = (
    await payload.findGlobalVersions({
      slug: 'theme',
      where: { 'version.canvas': { not_equals: lockedCanvas } },
      sort: '-updatedAt',
      limit: 1,
    })
  ).docs[0]
  if (otherCanvas)
    await assert.rejects(
      payload.restoreGlobalVersion({
        slug: 'theme',
        id: otherCanvas.id,
        user: aiUser,
        overrideAccess: false,
      }),
      /locked/,
    )
  const sameCanvas = (
    await payload.findGlobalVersions({
      slug: 'theme',
      where: { 'version.canvas': { equals: lockedCanvas } },
      sort: '-updatedAt',
      limit: 1,
    })
  ).docs[0]
  await payload.restoreGlobalVersion({
    slug: 'theme',
    id: sameCanvas.id,
    user: aiUser,
    overrideAccess: false,
  })
  assert.equal(
    (
      (await payload.findGlobal({ slug: 'theme', depth: 0 })).protection as Record<
        string,
        { state: string }
      >
    ).canvas.state,
    'locked',
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
  // Releases leave out page templates and form delivery settings, keep only referenced uploads,
  // and anonymous visitors can read only released files.
  const stamp = Date.now()
  const template = await payload.create({
    collection: 'pages',
    data: {
      title: 'Template test',
      slug: `template-${stamp}`,
      summary: 'A template that must never be released.',
      isTemplate: true,
      _status: 'published',
    },
  })
  const deliveryForm = await payload.create({
    collection: 'forms',
    data: {
      title: 'Release form test',
      fields: [{ label: 'Email', name: 'email', type: 'email', required: true }],
      webhookURL: 'https://hooks.example.com/x',
      notify: 'owner@example.test',
    },
    user: admin,
  })
  const unused = await payload.create({
    collection: 'media',
    data: { alt: 'Unreleased upload test' },
    file: {
      data: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
      name: `unreleased-${stamp}.png`,
      size: 68,
      mimetype: 'image/png',
    },
  })
  try {
    current = await payload.findGlobal({ slug: 'publication', depth: 0 })
    await changePublication(payload, admin, 'preview', releaseID(current.previewRelease))
    current = await payload.findGlobal({ slug: 'publication', depth: 0 })
    releases.push(releaseID(current.previewRelease)!)
    const snapshot = (
      await payload.findByID({
        collection: 'site-releases',
        id: releaseID(current.previewRelease)!,
      })
    ).snapshot as Snapshot
    assert(
      !snapshot.collections.pages.some((p) => p.id === template.id),
      'templates are not released',
    )
    const releasedForm = snapshot.collections.forms.find((f) => f.id === deliveryForm.id)
    assert(releasedForm, 'forms are released')
    for (const key of ['webhookURL', 'webhookSecret', 'notify'])
      assert(!(key in releasedForm), `${key} must not be released`)
    assert(
      !snapshot.collections.media.some((m) => m.id === unused.id),
      'unreferenced uploads are not released',
    )
    const anonymous = await payload.find({
      collection: 'media',
      overrideAccess: false,
      limit: 1000,
      depth: 0,
    })
    assert(!anonymous.docs.some((m) => m.id === unused.id), 'unreleased uploads are private')
    assert(
      anonymous.docs.every((m) => !('context' in m) || m.context === undefined),
      'internal media notes are staff-only',
    )
  } finally {
    await payload.delete({ collection: 'pages', id: template.id })
    await payload.delete({ collection: 'forms', id: deliveryForm.id })
    await payload.delete({ collection: 'media', id: unused.id }).catch(() => {})
  }
  console.log(
    'PASS: immutable releases, Preview/Live isolation, stale publication rejection, asset retention, AI permissions, enforced locks, private delivery settings and released-only uploads.',
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
