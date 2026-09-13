import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'
import { Users } from './src/cms/collections/Users'
import { Pages } from './src/cms/collections/Pages'
import { Media } from './src/cms/collections/Media'
import { Fonts } from './src/cms/collections/Fonts'
import { CaseStudies, Services, TeamMembers, Clients } from './src/cms/collections/Content'
import { ApprovedFacts, Redirects } from './src/cms/collections/Search'
import { Navigation, SiteSettings, Theme, SearchProfile } from './src/cms/globals'
import { AIUsage } from './src/cms/collections/AIUsage'
import { Releases, Publication } from './src/cms/collections/Releases'
import { protectCollection, protectGlobal } from './src/cms/protection'

const dirname = path.dirname(fileURLToPath(import.meta.url))
if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 32)
  throw new Error('Set PAYLOAD_SECRET to at least 32 random characters.')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
if (process.env.DATABASE_ENV === 'production' && process.env.SITE_ENV !== 'production')
  throw new Error('Non-production app cannot use production data.')
if (process.env.VERCEL_ENV === 'preview' && process.env.DATABASE_ENV !== 'preview')
  throw new Error('Vercel preview requires explicitly separate preview data.')
if (
  process.env.VERCEL_ENV === 'production' &&
  (process.env.DATABASE_ENV !== 'production' || process.env.SITE_ENV !== 'production')
)
  throw new Error('Vercel production requires explicitly configured production resources.')
if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN)
  throw new Error('Hosted media requires persistent Blob storage.')

export default buildConfig({
  i18n: {
    translations: {
      en: {
        version: {
          publish: 'Save to workspace',
          publishChanges: 'Save to workspace',
          unpublish: 'Move to draft',
          aboutToUnpublish:
            'Move this document to draft? This does not change the Live site. Use Include in site releases to exclude it from the next Preview.',
        },
      },
    },
  },
  secret: process.env.PAYLOAD_SECRET,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  csrf: [
    ...new Set([
      process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
      ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
        .filter(Boolean)
        .map((host) => `https://${host}`),
    ]),
  ],
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ' | Design OS' },
    components: {
      beforeDashboard: ['/src/editor/Workspace#WorkspaceHome'],
      beforeNavLinks: ['/src/editor/Workspace#WorkspaceNav'],
      actions: ['/src/editor/Workspace#EnvironmentBadge'],
      graphics: {
        Logo: '/src/editor/Workspace#WorkspaceLogo',
        Icon: '/src/editor/Workspace#WorkspaceIcon',
      },
    },
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    push: process.env.SITE_ENV === 'local' && process.env.DB_PUSH === 'true',
    migrationDir: path.resolve(dirname, 'src/migrations'),
  }),
  editor: lexicalEditor(),
  sharp,
  collections: [
    Pages,
    CaseStudies,
    Services,
    TeamMembers,
    Clients,
    Media,
    Fonts,
    ApprovedFacts,
    Redirects,
    Users,
    AIUsage,
  ]
    .map((collection) => ({
      ...collection,
      admin: {
        ...collection.admin,
        ...(['pages', 'case-studies', 'services', 'team-members', 'clients'].includes(
          collection.slug,
        )
          ? { group: 'Content' }
          : ['media', 'fonts'].includes(collection.slug)
            ? { group: 'Assets' }
            : {}),
      },
    }))
    .map((collection) =>
      ['users', 'ai-usage'].includes(collection.slug) ? collection : protectCollection(collection),
    )
    .concat(Releases),
  globals: [...[Navigation, SiteSettings, Theme, SearchProfile].map(protectGlobal), Publication],
  jobs: {
    access: {
      run: ({ req }) =>
        req.user?.role === 'admin' ||
        Boolean(
          process.env.CRON_SECRET &&
          req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`,
        ),
    },
    ...(process.env.SITE_ENV === 'local'
      ? { autoRun: [{ cron: '* * * * *', allQueues: true, limit: 20 }] }
      : {}),
  },
  typescript: { outputFile: path.resolve(dirname, 'src/payload-types.ts') },
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true, fonts: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
  onInit: async (payload) => {
    if (!process.env.VERCEL) return
    const users = await payload.count({ collection: 'users' })
    if (!users.totalDocs) {
      if (
        !process.env.BOOTSTRAP_EMAIL ||
        !process.env.BOOTSTRAP_PASSWORD ||
        process.env.BOOTSTRAP_PASSWORD.length < 16
      )
        throw new Error(
          'Provision the initial administrator using BOOTSTRAP_EMAIL and a strong BOOTSTRAP_PASSWORD before exposing admin.',
        )
      await payload.create({
        collection: 'users',
        data: {
          email: process.env.BOOTSTRAP_EMAIL,
          password: process.env.BOOTSTRAP_PASSWORD,
          name: 'Administrator',
          role: 'admin',
        },
      })
    }
  },
})
