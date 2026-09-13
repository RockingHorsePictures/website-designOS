import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())
const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')
if (process.env.SITE_ENV === 'production' || process.env.DATABASE_ENV === 'production')
  throw new Error('Demo seeding is forbidden in production.')
if (!process.env.SEED_PASSWORD) throw new Error('Set SEED_PASSWORD before seeding.')
const payload = await getPayload({ config })
const users = await payload.find({ collection: 'users', limit: 1 })
if (!users.totalDocs)
  await payload.create({
    collection: 'users',
    data: {
      name: 'Demo administrator',
      email: process.env.SEED_EMAIL || 'editor@example.test',
      password: process.env.SEED_PASSWORD,
      role: 'admin',
    },
  })
const pages = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } } })
if (!pages.totalDocs)
  await payload.create({
    collection: 'pages',
    data: {
      title: 'CMS foundation demonstration',
      slug: 'home',
      demo: true,
      summary:
        'Demo content only. This neutral page proves that published Payload content reaches the frontend.',
      _status: 'published',
    },
  })
const serviceIDs: number[] = []
for (let n = 1; n <= 3; n++) {
  const found = await payload.find({
    collection: 'services',
    where: { slug: { equals: `demo-service-${n}` } },
  })
  const doc =
    found.docs[0] ||
    (await payload.create({
      collection: 'services',
      data: {
        title: `Demo service ${n}`,
        slug: `demo-service-${n}`,
        summary:
          'Representative service record for testing structured content, relationships and publishing. Not a company claim.',
        demo: true,
        order: n,
        _status: 'published',
      },
    }))
  serviceIDs.push(doc.id)
}
const clients = await payload.find({
  collection: 'clients',
  where: { name: { equals: 'Demo client — not a real client' } },
})
const client =
  clients.docs[0] ||
  (await payload.create({
    collection: 'clients',
    data: { name: 'Demo client — not a real client', demo: true },
  }))
for (let n = 1; n <= 3; n++) {
  const found = await payload.find({
    collection: 'case-studies',
    where: { slug: { equals: `demo-project-${n}` } },
  })
  if (!found.totalDocs)
    await payload.create({
      collection: 'case-studies',
      data: {
        title: `Demo project ${n}`,
        slug: `demo-project-${n}`,
        summary:
          'Representative project record for testing case-study creation, relationships, metadata and preview. Not a real project.',
        client: client.id,
        services: [serviceIDs[n - 1]],
        demo: true,
        featured: true,
        order: n,
        _status: 'published',
      },
    })
}
for (let n = 1; n <= 6; n++) {
  const found = await payload.find({
    collection: 'team-members',
    where: { name: { equals: `Demo person ${n}` } },
  })
  if (!found.totalDocs)
    await payload.create({
      collection: 'team-members',
      data: {
        name: `Demo person ${n}`,
        role: 'Example role',
        bio: 'Demo team record for testing variable team counts.',
        active: true,
        order: n,
        demo: true,
      },
    })
}
const existingSettings = await payload.findGlobal({ slug: 'site-settings' })
if (!existingSettings.companyName) {
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      companyName: 'Design OS demonstration',
      description: 'Neutral test environment for the company website editing foundation.',
      footerText: 'Foundation demonstration only. Final website design is a separate phase.',
    },
  })
  await payload.updateGlobal({
    slug: 'navigation',
    data: {
      primary: [
        { label: 'Home', url: '/' },
        { label: 'Case studies', url: '/case-studies' },
        { label: 'Services', url: '/services' },
        { label: 'Team', url: '/team' },
      ],
    },
  })
  await payload.updateGlobal({ slug: 'theme', data: {} })
  await payload.updateGlobal({
    slug: 'search-profile',
    data: {
      companyDescription:
        'Demo environment only. Supply verified company facts during the later content stage.',
    },
  })
}
const home = (await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } } }))
  .docs[0]
if (
  home &&
  (!home.composition ||
    typeof home.composition !== 'object' ||
    !('content' in home.composition) ||
    !(home.composition.content as unknown[])?.length)
)
  await payload.update({
    collection: 'pages',
    id: home.id,
    data: {
      demo: true,
      composition: {
        root: { props: {} },
        content: [
          {
            type: 'Intro',
            props: {
              id: 'intro-demo',
              heading: 'Editing proof',
              body: 'This introduction is stored in Payload. Use the page composer to edit it and save a draft.',
              style: 'plain',
            },
          },
          {
            type: 'SelectedProjects',
            props: {
              id: 'projects-demo',
              heading: 'Structured case-study references',
              mode: 'featured',
              projectIds: [],
              limit: 3,
            },
          },
          {
            type: 'CallToAction',
            props: {
              id: 'cta-demo',
              heading: 'Continue the test',
              body: 'Visit a structured service page.',
              label: 'Browse demo services',
              href: '/services',
            },
          },
        ],
      },
    },
  })
const media = await payload.find({
  collection: 'media',
  where: { filename: { equals: 'demo-swatch.png' } },
})
if (!media.totalDocs) {
  const { default: sharp } = await import('sharp')
  const image = await sharp({
    create: { width: 64, height: 64, channels: 3, background: '#cccccc' },
  })
    .png()
    .toBuffer()
  await payload.create({
    collection: 'media',
    data: {
      alt: 'Grey square used to test image delivery',
      demo: true,
      caption: 'Demo media fixture',
    },
    file: { data: image, name: 'demo-swatch.png', size: image.length, mimetype: 'image/png' },
  })
}
if (process.env.SITE_ENV === 'local') {
  const state = await payload.findGlobal({ slug: 'publication', depth: 0 })
  if (!state.previewRelease) {
    const { changePublication, releaseID } = await import('../src/lib/releases')
    const admin = (
      await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 })
    ).docs[0]
    await changePublication(payload, { ...admin, collection: 'users' }, 'preview', null)
    const preview = await payload.findGlobal({ slug: 'publication', depth: 0 })
    await changePublication(
      payload,
      { ...admin, collection: 'users' },
      'publish',
      releaseID(preview.previewRelease),
    )
  }
}
await payload.destroy()
console.log('Demo seed complete.')
process.exit(0)
