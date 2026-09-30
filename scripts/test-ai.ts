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
  // AI accounts never delete, verify facts or sign off factual review.
  await assert.rejects(
    payload.delete({ collection: 'pages', id: page.id, user: writeUser, overrideAccess: false }),
    /not allowed/i,
  )
  const fact = await payload.create({
    collection: 'approved-facts',
    data: {
      statement: 'AI test fact',
      category: 'other',
      sourceNote: 'test',
      verification: 'verified',
    },
    user: writeUser,
    overrideAccess: false,
  })
  assert.equal(fact.verification, 'pending')
  await payload.update({
    collection: 'approved-facts',
    id: fact.id,
    data: { verification: 'verified' },
    user: writeUser,
    overrideAccess: false,
  })
  assert.equal(
    (await payload.findByID({ collection: 'approved-facts', id: fact.id })).verification,
    'pending',
  )
  await payload.delete({ collection: 'approved-facts', id: fact.id })
  await payload.update({
    collection: 'pages',
    id: page.id,
    draft: true,
    data: { claimsReviewed: true },
    user: writeUser,
    overrideAccess: false,
  })
  assert.notEqual(
    (await payload.findByID({ collection: 'pages', id: page.id, draft: true })).claimsReviewed,
    true,
  )
  // An AI edit to a human-approved field clears the person's approval stamp.
  await payload.updateGlobal({ slug: 'theme', data: { accent: '#111111' }, user: admin })
  assert.equal(
    ((await payload.findGlobal({ slug: 'theme' })).protection as Record<string, { state: string }>)
      .accent.state,
    'approved',
  )
  await payload.updateGlobal({
    slug: 'theme',
    data: { accent: '#222222' },
    user: writeUser,
    overrideAccess: false,
  })
  assert.equal(
    ((await payload.findGlobal({ slug: 'theme' })).protection as Record<string, { state: string }>)
      .accent.state,
    'default',
  )
  // Restoring an older version works after later edits, and never reverts current locks.
  await payload.updateGlobal({ slug: 'theme', data: { muted: '#333333' }, user: admin })
  const older = (
    await payload.findGlobalVersions({
      slug: 'theme',
      where: { 'version.accent': { equals: '#111111' } },
      sort: '-updatedAt',
      limit: 1,
    })
  ).docs[0]
  await payload.restoreGlobalVersion({ slug: 'theme', id: older.id, user: admin })
  const restored = await payload.findGlobal({ slug: 'theme' })
  assert.equal(restored.accent, '#111111')
  assert.equal(
    (restored.protection as Record<string, { state: string }>).canvas.state,
    'locked',
    'restore must keep the current lock',
  )
  // Renaming a published page back to its old URL must not create a redirect loop.
  const stamp = Date.now()
  const moving = await payload.create({
    collection: 'pages',
    data: {
      title: 'Rename test',
      slug: `rename-a-${stamp}`,
      summary: 'Rename test page.',
      _status: 'published',
    },
  })
  await payload.update({ collection: 'pages', id: moving.id, data: { slug: `rename-b-${stamp}` } })
  await payload.update({ collection: 'pages', id: moving.id, data: { slug: `rename-a-${stamp}` } })
  const hops = (
    await payload.find({
      collection: 'redirects',
      where: { from: { in: [`/rename-a-${stamp}`, `/rename-b-${stamp}`] } },
    })
  ).docs
  assert.deepEqual(
    hops.map((r) => [r.from, r.to]),
    [[`/rename-b-${stamp}`, `/rename-a-${stamp}`]],
  )
  for (const r of hops) await payload.delete({ collection: 'redirects', id: r.id })
  await payload.delete({ collection: 'pages', id: moving.id })

  // Where visitor data goes is human-only: AI can build forms but not route their submissions.
  const aiForm = await payload.create({
    collection: 'forms',
    data: {
      title: 'AI form test',
      fields: [{ label: 'Email', name: 'email', type: 'email', required: true }],
      webhookURL: 'https://attacker.example/hook',
      notify: 'attacker@example.test',
      redirect: '/elsewhere',
      webhookSecret: 'chosen-by-ai',
    },
    user: writeUser,
    overrideAccess: false,
  })
  assert.equal(aiForm.webhookURL ?? null, null)
  assert.equal(aiForm.notify ?? null, null)
  assert.equal(aiForm.redirect ?? null, null)
  const storedForm = await payload.findByID({ collection: 'forms', id: aiForm.id })
  assert.notEqual(storedForm.webhookSecret, 'chosen-by-ai')
  assert.ok(String(storedForm.webhookSecret).length >= 24)
  await payload.delete({ collection: 'forms', id: aiForm.id })
  const settingsBefore = await payload.findGlobal({ slug: 'site-settings' })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      analytics: { provider: 'ga4', siteId: 'G-ATTACKER' },
      verification: { google: 'attacker-code' },
    },
    user: writeUser,
    overrideAccess: false,
  })
  const settingsAfter = await payload.findGlobal({ slug: 'site-settings' })
  assert.equal(settingsAfter.analytics?.siteId ?? null, settingsBefore.analytics?.siteId ?? null)
  assert.equal(
    settingsAfter.verification?.google ?? null,
    settingsBefore.verification?.google ?? null,
  )
  // AI accounts cannot change their own login details.
  await assert.rejects(
    payload.update({
      collection: 'users',
      id: writer.id,
      data: { email: `changed-${Date.now()}@example.test` },
      user: writeUser,
      overrideAccess: false,
    }),
    /not allowed/i,
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
