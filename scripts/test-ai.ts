import assert from 'node:assert/strict'
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())
if (process.env.SITE_ENV !== 'local') throw new Error('Disposable local database only.')
const { getPayload, createLocalReq } = await import('payload')
const { default: config } = await import('../payload.config')
const { aiContext } = await import('../src/lib/ai-context')
const { policyApproval } = await import('../src/cms/protection')
const { changePublication } = await import('../src/lib/releases')
const payload = await getPayload({ config })
const original = await payload.findGlobal({ slug: 'theme', depth: 0 })
const admin = {
  ...(await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 }))
    .docs[0],
  collection: 'users' as const,
}
const password = 'test-only-secret-should-not-appear-in-export'
const reader = await payload.create({
  collection: 'users',
  data: {
    name: 'AI reader test',
    email: `reader-${Date.now()}@example.test`,
    password,
    role: 'ai',
    aiReadOnly: true,
  },
})
const writer = await payload.create({
  collection: 'users',
  data: {
    name: 'AI writer test',
    email: `writer-${Date.now()}@example.test`,
    password,
    role: 'ai',
  },
})
const readUser = { ...reader, collection: 'users' as const }
const writeUser = { ...writer, collection: 'users' as const }
const page = await payload.create({
  collection: 'pages',
  draft: true,
  data: { title: 'AI access test', slug: `ai-${Date.now()}`, _status: 'draft' },
})
const req = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
try {
  await payload.updateGlobal({ slug: 'theme', data: { protection: {} }, req })
  for (const overrideAccess of [false, true]) {
    await assert.rejects(
      payload.updateGlobal({
        slug: 'theme',
        data: { canvas: '#123456' },
        user: readUser,
        overrideAccess,
      }),
      /read-only|not allowed/i,
    )
    await assert.rejects(
      payload.update({
        collection: 'pages',
        id: page.id,
        data: { title: 'Reader wrote' },
        user: readUser,
        overrideAccess,
      }),
      /read-only|not allowed/i,
    )
    await assert.rejects(
      payload.delete({ collection: 'pages', id: page.id, user: readUser, overrideAccess }),
      /read-only|not allowed/i,
    )
    await assert.rejects(
      payload.create({
        collection: 'pages',
        draft: true,
        data: { title: 'Reader created', slug: 'reader-created' },
        user: readUser,
        overrideAccess,
      }),
      /read-only|not allowed/i,
    )
    const version = (await payload.findGlobalVersions({ slug: 'theme', limit: 1 })).docs[0]
    await assert.rejects(
      payload.restoreGlobalVersion({
        slug: 'theme',
        id: version.id,
        user: readUser,
        overrideAccess,
      }),
      /read-only|not allowed/i,
    )
  }
  await assert.rejects(
    payload.update({
      collection: 'users',
      id: reader.id,
      data: { aiReadOnly: false },
      user: readUser,
      overrideAccess: false,
    }),
    /not allowed/i,
  )
  await payload.updateGlobal({
    slug: 'theme',
    data: { canvas: '#123456' },
    user: writeUser,
    overrideAccess: false,
  })
  await payload.updateGlobal({
    slug: 'theme',
    data: { protection: { canvas: { state: 'locked', by: admin.email } } },
    req,
  })
  await assert.rejects(
    payload.updateGlobal({
      slug: 'theme',
      data: { canvas: '#654321' },
      user: writeUser,
      overrideAccess: false,
    }),
    /locked/,
  )
  await assert.rejects(
    payload.updateGlobal({
      slug: 'theme',
      data: { protection: {} },
      user: writeUser,
      overrideAccess: false,
    }),
    /approval controls/,
  )
  await assert.rejects(
    changePublication(payload, writeUser, 'preview', null),
    /Only|publish|person|editor/i,
  )
  const snapshot = await aiContext(payload, readUser)
  const theme = snapshot.globals.find((item) => item.slug === 'theme')!
  assert.equal((theme.document as typeof original).canvas, '#123456')
  assert.equal(
    ((theme.document as typeof original).protection as Record<string, { state: string }>).canvas
      .state,
    'locked',
  )
  assert(!JSON.stringify(snapshot).includes(password))
  assert(
    !snapshot.collections.some((item) =>
      ['users', 'ai-usage', 'site-releases'].includes(item.slug),
    ),
  )
  assert.equal((await payload.findGlobal({ slug: 'theme' })).canvas, '#123456')
  console.log(
    'AI access: reader cannot mutate/restore, writer respects locks and cannot publish, context contains current approvals without credentials.',
  )
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await payload.updateGlobal({ slug: 'theme', data: { protection: {} }, req })
  await payload.updateGlobal({ slug: 'theme', data: original, req })
  await payload.delete({ collection: 'pages', id: page.id })
  await payload.delete({ collection: 'users', id: reader.id })
  await payload.delete({ collection: 'users', id: writer.id })
  await payload.destroy()
  process.exit(process.exitCode || 0)
}
