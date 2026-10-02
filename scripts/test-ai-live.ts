import nextEnv from '@next/env'
import assert from 'node:assert/strict'
nextEnv.loadEnvConfig(process.cwd())
if (process.env.SITE_ENV !== 'local') throw new Error('Disposable local database only.')
const { getPayload, createLocalReq } = await import('payload')
const { default: config } = await import('../payload.config')
const { readOnlyAI } = await import('../src/cms/access')
const { policyApproval } = await import('../src/cms/protection')
const live = await import('../src/lib/ai-live/connect')
const { runAIRequest } = await import('../src/lib/ai-live/request')
const { listAIChanges, undoAIChange } = await import('../src/lib/ai-live/changes')
const { changePublication, releaseID } = await import('../src/lib/releases')
const payload = await getPayload({ config })
const admin = {
  ...(await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 }))
    .docs[0],
  collection: 'users' as const,
}
const stamp = `live${Date.now()}`
const created: [string, number][] = []
const asAI = async (key: string) => {
  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `users API-Key ${key}` }),
  })
  return user ? ({ ...user, collection: 'users' } as never) : null
}
const write = (user: never, input: Parameters<typeof runAIRequest>[2]) =>
  runAIRequest(payload, user, input, { readOnly: readOnlyAI(user), live: true })
const existingLive = await live.liveAIUser(payload)
try {
  // 1. Connecting: the owner approves a code; the key is handed over exactly once.
  const started = await live.startConnection(payload, 'Test tool')
  assert.match(started.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  assert.equal((await live.pendingConnection(payload, started.code))?.label, 'Test tool')
  assert.equal(
    (await live.collectConnection(payload, started.code, started.secret)).status,
    'pending',
  )
  await live.decideConnection(payload, started.code, true)
  assert.equal((await live.collectConnection(payload, started.code, 'wrong')).status, 'expired')
  const collected = await live.collectConnection(payload, started.code, started.secret)
  assert.equal(collected.status, 'approved')
  const key = (collected as { key: string }).key
  assert.equal(
    (await live.collectConnection(payload, started.code, started.secret)).status,
    'expired',
    'the key is handed over once',
  )
  const declined = await live.startConnection(payload, 'Other tool')
  await live.decideConnection(payload, declined.code, false)
  assert.equal(
    (await live.collectConnection(payload, declined.code, declined.secret)).status,
    'denied',
  )

  let ai = await asAI(key)
  assert(ai, 'the key signs in as the live AI account')
  assert.equal((ai as { role: string }).role, 'ai')

  const service = await payload.create({
    collection: 'services',
    data: {
      title: `Service ${stamp}`,
      slug: `service-${stamp}`,
      summary: 'Before.',
      _status: 'published',
    } as never,
  })
  created.push(['services', service.id])
  const read = async () =>
    (await write(ai!, { action: 'read', collection: 'services', id: service.id })) as {
      updatedAt: string
    }

  // 2. Off by default: reading works, writing does not.
  assert(readOnlyAI(ai as never))
  await assert.rejects(
    write(ai!, {
      action: 'update',
      collection: 'services',
      id: service.id,
      data: { summary: 'x' },
      expectedUpdatedAt: (await read()).updatedAt,
    }),
    /switched off/,
  )

  // 3. Allowed for a day: drafts are saved, but only from a fresh read.
  await live.setAIEditing(payload, new Date(Date.now() + 86_400_000))
  ai = await asAI(key)
  assert(!readOnlyAI(ai as never))
  await assert.rejects(
    write(ai!, {
      action: 'update',
      collection: 'services',
      id: service.id,
      data: { summary: 'x' },
    }),
    /expectedUpdatedAt/,
  )
  await assert.rejects(
    write(ai!, {
      action: 'update',
      collection: 'services',
      id: service.id,
      data: { summary: 'x' },
      expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
    }),
    /changed since you read it/,
  )
  const fresh = (await read()).updatedAt
  await write(ai!, {
    action: 'update',
    collection: 'services',
    id: service.id,
    data: { title: `AI title ${stamp}`, summary: 'AI summary.' },
    expectedUpdatedAt: fresh,
  })
  // The AI can organise media folders (creating and renaming them, never deleting).
  const folder = (await write(ai!, {
    action: 'create',
    collection: 'payload-folders',
    data: { name: `AI folder ${stamp}`, folderType: ['media'] },
  })) as { id: number; updatedAt: string }
  created.push(['payload-folders', folder.id])
  await write(ai!, {
    action: 'update',
    collection: 'payload-folders',
    id: folder.id,
    data: { name: `Renamed ${stamp}` },
    expectedUpdatedAt: folder.updatedAt,
  })
  assert.equal(
    (await payload.findByID({ collection: 'payload-folders', id: folder.id })).name,
    `Renamed ${stamp}`,
  )
  // A person edits the summary afterwards.
  const human = await createLocalReq({ user: admin }, payload)
  await payload.update({
    collection: 'services',
    id: service.id,
    data: { summary: 'Person summary.' },
    draft: true,
    req: human,
  })

  // 4. Changes are listed, and Undo keeps the person's later edit.
  const changes = await listAIChanges(payload, null, 20)
  const mine = changes.find((c) => c.collection === 'services' && c.doc_id === String(service.id))
  assert(mine, 'the AI change is listed')
  assert.deepEqual(mine!.fields.sort(), ['summary', 'title'])
  const undo = await undoAIChange(payload, admin as never, mine!.id)
  assert.deepEqual(undo, { restored: ['title'], skipped: ['summary'] })
  const after = await payload.findByID({ collection: 'services', id: service.id, draft: true })
  assert.equal(after.title, `Service ${stamp}`, 'the AI change is undone')
  assert.equal(after.summary, 'Person summary.', 'the person’s later edit is kept')
  await assert.rejects(undoAIChange(payload, admin as never, mine!.id), /already undone/)
  await assert.rejects(undoAIChange(payload, ai!, mine!.id), /Only a person/)

  // 5. Locked fields stay locked; additions can be undone; AI never publishes.
  const approvals = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
  await payload.update({
    collection: 'services',
    id: service.id,
    data: { protection: { title: { state: 'locked' } } },
    req: approvals,
  })
  await assert.rejects(
    write(ai!, {
      action: 'update',
      collection: 'services',
      id: service.id,
      data: { title: 'Locked?' },
      expectedUpdatedAt: (await read()).updatedAt,
    }),
    /locked/,
  )
  const added = (await write(ai!, {
    action: 'create',
    collection: 'clients',
    data: { name: `AI client ${stamp}` },
  })) as { id: number }
  const addition = (await listAIChanges(payload, null, 5)).find((c) => c.action === 'create')!
  assert.equal(addition.doc_id, String(added.id))
  await undoAIChange(payload, admin as never, addition.id)
  assert.equal(
    (await payload.find({ collection: 'clients', where: { id: { equals: added.id } } })).totalDocs,
    0,
    'undoing an addition removes it',
  )
  const state = await payload.findGlobal({ slug: 'publication', depth: 0 })
  await assert.rejects(
    changePublication(payload, ai!, 'preview', releaseID(state.previewRelease)),
    /Only a person/,
  )

  // 6. Code previews stay read-only; the time limit and Disconnect end write access.
  const saved = process.env.VERCEL_ENV
  process.env.VERCEL_ENV = 'preview'
  try {
    await assert.rejects(
      payload.update({
        collection: 'clients',
        id: 1,
        data: {},
        user: ai!,
        overrideAccess: false,
      } as never),
      /code preview/i,
    )
  } finally {
    if (saved === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = saved
  }
  await live.setAIEditing(payload, new Date(Date.now() - 1000))
  assert(readOnlyAI((await asAI(key)) as never), 'edits stop when the time runs out')
  await live.disconnectAI(payload)
  assert.equal(await asAI(key), null, 'Disconnect revokes the key')
  console.log(
    'PASS: approved connection (one-time key, decline), read-only by default, time-limited drafts, stale-write refusal, locks, change log, undo that keeps later human edits, undo of additions, no publishing, read-only code previews, expiry and disconnect.',
  )
} finally {
  const approvals = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
  for (const [collection, id] of created) {
    await payload
      .update({
        collection: collection as 'services',
        id,
        data: { protection: {} },
        req: approvals,
      })
      .catch(() => {})
    await payload.delete({ collection: collection as 'services', id }).catch(() => {})
  }
  const user = await live.liveAIUser(payload)
  if (user && !existingLive)
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
  const pg = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } })
    .drizzle
  const { sql } = await import('@payloadcms/db-postgres')
  await pg.execute(sql`DELETE FROM designos_ai_changes WHERE title LIKE ${`%${stamp}%`}`)
  await payload.destroy()
}
process.exit(0)
