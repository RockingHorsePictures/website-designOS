import nextEnv from '@next/env'
import assert from 'node:assert/strict'
import sharp from 'sharp'
nextEnv.loadEnvConfig(process.cwd())
if (process.env.SITE_ENV !== 'local') throw new Error('Disposable local database only.')
const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')
const { exportContent } = await import('../src/lib/content-transfer/export')
const { readBundle, writeBundle } = await import('../src/lib/content-transfer/bundle')
const { plan, runImport } = await import('../src/lib/content-transfer/driver')
const { transferOperation } = await import('../src/lib/content-transfer/server')
const { changePublication, releaseID } = await import('../src/lib/releases')
let savedRelease: number | null = null
let previousPreview: number | null = null
const payload = await getPayload({ config })
// Loosely typed: sites add their own required fields, and this test must still compile there.
const create = (args: Record<string, unknown>) =>
  payload.create(args as never) as Promise<{ id: number }>
const admin = {
  ...(await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 }))
    .docs[0],
  collection: 'users' as const,
}
const stamp = `xfer${Date.now()}`
const mine = (slug: string, doc: Record<string, unknown>) =>
  [doc.slug, doc.name, doc.filename, doc.title].some((v) => String(v ?? '').includes(stamp))
const rich = (children: unknown[]) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        children,
      },
    ],
  },
})
type Ids = Record<string, number>
const created: [string, number][] = []
const remove = async () => {
  for (const [collection, id] of created.reverse())
    await payload.delete({ collection: collection as 'pages', id }).catch(() => {})
  created.length = 0
}
const exec = (op: Parameters<typeof transferOperation>[2]) =>
  transferOperation(
    payload,
    admin,
    op,
    op.op === 'file' ? { data: Buffer.from(op.file.data), name: op.file.name } : undefined,
  )
try {
  // A small linked site: image → client → service → case study → page sections and rich text.
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: '#336699' },
  })
    .png()
    .toBuffer()
  const source: Ids = {}
  // Media folders travel too, nested, with each image in its folder.
  source.folder = (
    await create({
      collection: 'payload-folders',
      data: { name: `Folder ${stamp}`, folderType: ['media'] },
    })
  ).id
  source.subfolder = (
    await create({
      collection: 'payload-folders',
      data: { name: `Subfolder ${stamp}`, folderType: ['media'], folder: source.folder },
    })
  ).id
  source.media = (
    await create({
      collection: 'media',
      data: { alt: `Transfer test image ${stamp}`, folder: source.subfolder },
      file: { data: png, name: `${stamp}.png`, mimetype: 'image/png', size: png.byteLength },
    })
  ).id
  source.client = (
    await create({
      collection: 'clients',
      data: { name: `Client ${stamp}`, logo: source.media },
    })
  ).id
  source.service = (
    await create({
      collection: 'services',
      data: {
        title: `Service ${stamp}`,
        slug: `service-${stamp}`,
        summary: 'Transfer test.',
        heroMedia: { image: source.media },
        _status: 'published',
      },
    })
  ).id
  source.project = (
    await create({
      collection: 'case-studies',
      data: {
        title: `Project ${stamp}`,
        slug: `project-${stamp}`,
        summary: 'Transfer test.',
        client: source.client,
        services: [source.service],
        narrative: rich([
          {
            type: 'text',
            text: 'See ',
            version: 1,
            format: 0,
            mode: 'normal',
            style: '',
            detail: 0,
          },
          {
            type: 'link',
            version: 3,
            direction: null,
            format: '',
            indent: 0,
            fields: {
              linkType: 'internal',
              newTab: false,
              doc: { relationTo: 'services', value: source.service },
            },
            children: [
              {
                type: 'text',
                text: 'the service',
                version: 1,
                format: 0,
                mode: 'normal',
                style: '',
                detail: 0,
              },
            ],
          },
        ]) as never,
        _status: 'published',
      },
    })
  ).id
  // A French translation travels with it.
  await payload.update({
    collection: 'services',
    id: source.service,
    locale: 'fr',
    data: { title: `Service FR ${stamp}`, summary: 'Test de transfert.' },
  })
  // A cycle: the service points back at the case study (created after it).
  await payload.update({
    collection: 'services',
    id: source.service,
    data: { caseStudies: [source.project] },
  })
  source.page = (
    await create({
      collection: 'pages',
      data: {
        title: `Page ${stamp}`,
        slug: `page-${stamp}`,
        summary: 'Transfer test.',
        composition: {
          root: { props: {} },
          content: [
            {
              type: 'Services',
              props: {
                id: 's1',
                heading: 'H',
                mode: 'manual',
                order: 'default',
                serviceIds: [source.service],
                limit: 3,
              },
            },
            {
              type: 'SelectedProjects',
              props: {
                id: 'p1',
                heading: 'H',
                mode: 'manual',
                order: 'default',
                projectIds: [source.project],
                limit: 3,
              },
            },
            {
              type: 'Hero',
              props: {
                id: 'h1',
                eyebrow: '',
                heading: 'H',
                body: '',
                media: { image: source.media, alt: '', decorative: true },
                primary: { label: '', href: '' },
                secondary: { label: '', href: '' },
                layout: 'stacked',
              },
            },
          ],
        },
        _status: 'published',
      },
    })
  ).id
  // Two records with the same name (like many images called vimeo.jpg) stay two on re-import.
  for (let twin = 0; twin < 2; twin++)
    created.push([
      'clients',
      (await create({ collection: 'clients', data: { name: `Twin ${stamp}` } })).id,
    ])
  created.push(
    ['payload-folders', source.folder],
    ['payload-folders', source.subfolder],
    ['media', source.media],
    ['clients', source.client],
    ['services', source.service],
    ['case-studies', source.project],
    ['pages', source.page],
  )

  // Export (through a real zip), then remove the originals as if this were another site.
  const bundle = readBundle(
    writeBundle(
      await exportContent(payload, { includeDemo: true, only: mine, locales: ['en', 'fr'] }),
    ),
  )
  assert.deepEqual(Object.keys(bundle.manifest.collections).sort(), [
    'case-studies',
    'clients',
    'media',
    'pages',
    'payload-folders',
    'services',
  ])
  assert(!('protection' in bundle.records.services.en[0]), 'approvals are not exported')
  assert(!bundle.globals.publication, 'the Live/Preview release pointer never moves')
  await assert.rejects(
    exec({ op: 'global', slug: 'publication', data: {}, idMap: {} }),
    /no “publication” settings/,
  )
  await remove()

  const planned = await plan(bundle, exec)
  assert.equal(
    Object.values(planned.matches).flatMap(Object.values).length,
    0,
    'nothing matches yet',
  )
  assert(planned.order.indexOf('media') < planned.order.indexOf('clients'), 'files come first')
  const report = await runImport(bundle, planned, exec, { globals: false, removeDemo: false })
  assert.deepEqual(report.errors, [], 'no errors')
  assert.deepEqual(report.unresolved, [], 'every reference resolved')
  assert.deepEqual(report.created, {
    media: 1,
    clients: 3,
    services: 1,
    'case-studies': 1,
    pages: 1,
    'payload-folders': 2,
  })

  const one = async (collection: string, slugOrName: Record<string, unknown>) =>
    (
      await payload.find({
        collection: collection as 'pages',
        where: slugOrName as never,
        draft: true,
        depth: 0,
        limit: 10,
      })
    ).docs
  const [media] = await one('media', { filename: { equals: `${stamp}.png` } })
  const [client] = await one('clients', { name: { equals: `Client ${stamp}` } })
  for (const twin of await one('clients', { name: { equals: `Twin ${stamp}` } }))
    created.push(['clients', (twin as { id: number }).id])
  const [service] = await one('services', { slug: { equals: `service-${stamp}` } })
  const [project] = await one('case-studies', { slug: { equals: `project-${stamp}` } })
  const [page] = await one('pages', { slug: { equals: `page-${stamp}` } })
  const [folder] = await one('payload-folders', { name: { equals: `Folder ${stamp}` } })
  const [subfolder] = await one('payload-folders', { name: { equals: `Subfolder ${stamp}` } })
  created.push(['payload-folders', folder.id], ['payload-folders', subfolder.id])
  assert.equal((subfolder as { folder?: number }).folder, folder.id, 'folders stay nested')
  assert.equal((media as { folder?: number }).folder, subfolder.id, 'images stay in their folder')
  for (const [c, d] of [
    ['media', media],
    ['clients', client],
    ['services', service],
    ['case-studies', project],
    ['pages', page],
  ] as const)
    created.push([c, (d as { id: number }).id])
  const p = project as unknown as Record<string, unknown>
  const s = service as unknown as Record<string, unknown>
  assert.notEqual(media.id, source.media, 'a new record was created')
  assert.equal((client as { logo?: number }).logo, media.id, 'upload fields point at the new file')
  assert.equal(p.client, client.id)
  assert.deepEqual(p.services, [service.id])
  assert.deepEqual(s.caseStudies, [project.id], 'cyclic references are linked afterwards')
  assert.equal((s.heroMedia as { image: number }).image, media.id, 'group fields are remapped')
  const link = JSON.stringify(p.narrative)
  assert(
    link.includes(`"value":${service.id}`) && !link.includes(`"value":${source.service}`),
    'rich text links are remapped',
  )
  const sections = (
    page as unknown as { composition: { content: { props: Record<string, unknown> }[] } }
  ).composition.content
  assert.deepEqual(sections[0].props.serviceIds, [service.id], 'section references are remapped')
  assert.deepEqual(sections[1].props.projectIds, [project.id])
  assert.equal(
    (sections[2].props.media as { image: number }).image,
    media.id,
    'section media is remapped',
  )
  assert(
    !('protection' in s) || Object.keys((s.protection as object) || {}).length === 0,
    'nothing is pre-approved',
  )

  const french = await payload.findByID({
    collection: 'services',
    id: service.id,
    locale: 'fr',
    fallbackLocale: false as never,
    draft: true,
  })
  assert.equal(french.title, `Service FR ${stamp}`, 'translations are imported')
  // Imported records come first in the custom order.
  const firstService = (
    await payload.find({ collection: 'services', sort: '_order', limit: 1, draft: true })
  ).docs[0]
  assert.equal(firstService.id, service.id, 'imported records keep their place at the front')

  // Running it again updates instead of duplicating, and reuses the file.
  const again = await runImport(bundle, await plan(bundle, exec), exec, {
    globals: false,
    removeDemo: false,
  })
  assert.deepEqual(again.created, {}, 'a second run creates nothing')
  assert.equal(again.reusedFiles, 1, 'the file is reused')
  assert.equal((await one('services', { slug: { equals: `service-${stamp}` } })).length, 1)
  assert.equal(
    (await one('clients', { name: { equals: `Twin ${stamp}` } })).length,
    2,
    'same-named records are not duplicated',
  )

  // A file record whose stored file went missing is repaired by importing again, even when a
  // saved Preview release retains it (the same file goes back under the same name).
  const { rmSync, existsSync } = await import('node:fs')
  const before = await payload.findGlobal({ slug: 'publication', depth: 0 })
  await changePublication(payload, admin, 'preview', releaseID(before.previewRelease))
  savedRelease = releaseID(
    (await payload.findGlobal({ slug: 'publication', depth: 0 })).previewRelease,
  )
  previousPreview = releaseID(before.previewRelease)
  const stored = `media/${(media as { filename?: string }).filename}`
  rmSync(stored, { force: true })
  const replanned = await plan(bundle, exec)
  assert.deepEqual(
    replanned.missingFiles,
    { media: [String(source.media)] },
    'missing files are found',
  )
  const repaired = await runImport(bundle, replanned, exec, { globals: false, removeDemo: false })
  assert.equal(repaired.repairedFiles, 1, 'the missing file is uploaded again')
  assert.deepEqual(repaired.created, {}, 'no duplicate record')
  const fixed = await payload.findByID({ collection: 'media', id: media.id, depth: 0 })
  assert.equal(
    fixed.filename,
    (media as { filename?: string }).filename,
    'restored under the same name',
  )
  assert(existsSync(`media/${fixed.filename}`), 'the file is back in storage')

  // Keeping existing records: an edit made on the site survives, and missing files are still repaired.
  await payload.update({
    collection: 'services',
    id: service.id,
    data: { summary: 'Edited on the site.' } as never,
    draft: true,
  })
  rmSync(`media/${(fixed as { filename?: string }).filename}`, { force: true })
  const careful = await runImport(bundle, await plan(bundle, exec), exec, {
    globals: false,
    removeDemo: false,
    updateExisting: false,
  })
  assert.equal(careful.repairedFiles, 1, 'missing files are repaired without updating records')
  assert(careful.kept > 0, 'existing records are left alone')
  assert.equal(
    (await payload.findByID({ collection: 'services', id: service.id, draft: true })).summary,
    'Edited on the site.',
    'an edit made on the site is kept',
  )

  // Removing demo content only removes demo records the bundle did not bring.
  const demo = await create({
    collection: 'clients',
    data: { name: `Demo client ${stamp}`, demo: true },
  })
  const keep: Record<string, Record<string, number>> = {}
  for (const slug of [
    'pages',
    'services',
    'case-studies',
    'team-members',
    'clients',
    'media',
    'posts',
  ]) {
    const { docs } = await payload.find({
      collection: slug as 'pages',
      where: { demo: { equals: true } },
      pagination: false,
      draft: true,
      depth: 0,
    })
    keep[slug] = Object.fromEntries(
      docs.filter((d) => d.id !== demo.id).map((d) => [`k${d.id}`, d.id]),
    )
  }
  const removal = await exec({ op: 'removeDemo', keep })
  assert.deepEqual(
    removal.removed,
    [`clients “Demo client ${stamp}”`],
    'only the unreplaced demo record is removed',
  )
  console.log(
    'PASS: export → zip → import recreates linked records with new IDs (upload, relationship, group, rich text, section and cyclic references), keeps order, never pre-approves, reruns without duplicates, repairs missing files, and removes only unreplaced demo records.',
  )
} finally {
  if (savedRelease) {
    await payload.updateGlobal({ slug: 'publication', data: { previewRelease: previousPreview } })
    await payload.delete({ collection: 'site-releases', id: savedRelease }).catch(() => {})
  }
  await remove()
  for (const slug of ['media', 'clients', 'services', 'case-studies', 'pages'] as const) {
    const { docs } = await payload.find({
      collection: slug,
      pagination: false,
      draft: true,
      depth: 0,
    })
    for (const d of docs as unknown as Record<string, unknown>[])
      if (mine(slug, d) || String(d.name || '').includes(stamp))
        await payload.delete({ collection: slug, id: d.id as number }).catch(() => {})
  }
  await payload.destroy()
}
process.exit(0)
