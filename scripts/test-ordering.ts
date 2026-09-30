import nextEnv from '@next/env'
import assert from 'node:assert/strict'
import { policyApproval } from '../src/cms/protection'
import { changePublication, releaseID, type Snapshot } from '../src/lib/releases'
import { sortDocs } from '../src/lib/ordering'
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
const state = await payload.findGlobal({ slug: 'publication', depth: 0 })
const stamp = Date.now()
const created: number[] = []
let release: number | null = null
const orderOf = async () =>
  (
    await payload.find({
      collection: 'services',
      sort: '_order',
      limit: 500,
      depth: 0,
      draft: true,
      select: { title: true } as never,
    })
  ).docs.map((d) => (d as { id: number }).id)
const positionOf = async (id: number) =>
  (
    (await payload.findByID({ collection: 'services', id, depth: 0, draft: true })) as {
      position?: number
    }
  ).position
try {
  const req = await createLocalReq({ user: admin }, payload)
  for (const name of ['A', 'B', 'C'])
    created.push(
      (
        await payload.create({
          collection: 'services',
          data: {
            title: `Order test ${name} ${stamp}`,
            slug: `order-test-${name.toLowerCase()}-${stamp}`,
            summary: 'Temporary ordering test record.',
            _status: 'published',
          },
          req,
        })
      ).id,
    )
  const [a, b, c] = created
  let order = await orderOf()
  assert.deepEqual(order.slice(-3), created, 'new records join the end of the custom order')
  assert.equal(await positionOf(c), order.length, 'Position shows the place in the order')

  await payload.update({ collection: 'services', id: c, data: { position: 1 } as never, req })
  order = await orderOf()
  assert.equal(order[0], c, 'typing Position 1 moves a record to the front')
  assert.equal(await positionOf(c), 1)

  await payload.update({ collection: 'services', id: a, data: { position: 999 } as never, req })
  order = await orderOf()
  assert.equal(order.at(-1), a, 'a Position past the end moves a record to the end')

  await payload.update({ collection: 'services', id: a, data: { position: 2 } as never, req })
  order = await orderOf()
  assert.deepEqual(order.slice(0, 2), [c, a], 'a record moves between two others')

  const before = await orderOf()
  await payload.update({
    collection: 'services',
    id: b,
    data: { summary: 'Edited without moving.', position: await positionOf(b) } as never,
    req,
  })
  assert.deepEqual(await orderOf(), before, 'saving with an unchanged Position keeps the order')

  // A locked field does not stop the record being moved.
  const approvals = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
  await payload.update({
    collection: 'services',
    id: b,
    data: { protection: { title: { state: 'locked' } } },
    req: approvals,
  })
  await payload.update({ collection: 'services', id: b, data: { position: 1 } as never, req })
  assert.equal((await orderOf())[0], b, 'records with locked fields can still be reordered')

  // Releases carry the custom key (never the computed Position), and sort by it.
  await changePublication(payload, admin, 'preview', releaseID(state.previewRelease))
  release = releaseID((await payload.findGlobal({ slug: 'publication', depth: 0 })).previewRelease)
  const snapshot = (
    (await payload.findByID({ collection: 'site-releases', id: release!, depth: 0 })) as unknown as {
      snapshot: Snapshot
    }
  ).snapshot
  const released = snapshot.collections.services as Record<string, unknown>[]
  assert(released.every((doc) => typeof doc._order === 'string' && !('position' in doc)))
  assert.deepEqual(
    sortDocs(released, 'services', 'custom')
      .map((doc) => doc.id)
      .filter((id) => created.includes(id as number)),
    [b, c, a],
    'a release lists records in the custom order',
  )
  console.log(
    'PASS: new records join the end, Position moves records (front, end, between, unchanged), locked records reorder, releases keep the custom order.',
  )
} finally {
  await payload.updateGlobal({
    slug: 'publication',
    data: {
      previewRelease: releaseID(state.previewRelease),
      liveRelease: releaseID(state.liveRelease),
    },
  })
  if (release) await payload.delete({ collection: 'site-releases', id: release })
  const approvals = await createLocalReq({ user: admin, context: { policyApproval } }, payload)
  for (const id of created) {
    await payload.update({ collection: 'services', id, data: { protection: {} }, req: approvals })
    await payload.delete({ collection: 'services', id })
  }
  await payload.destroy()
}
process.exit(0)
