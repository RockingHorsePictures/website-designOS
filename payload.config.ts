import './src/lib/env'
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
import { FormSubmissions } from './src/cms/collections/FormSubmissions'
import { Forms } from './src/cms/collections/Forms'
import { Posts, Categories } from './src/cms/collections/Blog'
import { Blocks } from './src/cms/collections/Blocks'
import { defaultLocale, enabledLocales, supportedLocales } from './src/lib/locales'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { siteOrigin } from './src/lib/urls'

const dirname = path.dirname(fileURLToPath(import.meta.url))
if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 32)
  throw new Error('Set PAYLOAD_SECRET to at least 32 random characters.')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
if (process.env.DATABASE_ENV === 'production' && process.env.SITE_ENV !== 'production')
  throw new Error('Non-production app cannot use production data.')
if (process.env.VERCEL_ENV === 'preview' && process.env.DATABASE_ENV !== 'preview')
  throw new Error(
    'Code previews need their own database. Enable Neon preview branches for this project, then set DESIGNOS_PREVIEW_DATA=branch for the Preview environment (see docs/DEPLOY.md).',
  )
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
  // Field-level translations. Every supported language exists in the schema; Site Settings →
  // Additional languages decides which ones editors see and the website publishes.
  localization: {
    locales: supportedLocales.map((l) => ({
      code: l.code,
      label: l.label,
      ...(['ar', 'he'].includes(l.code) ? { rtl: true } : {}),
    })),
    defaultLocale,
    fallback: true,
    filterAvailableLocales: async ({ req, locales }) => {
      const settings = await req.payload
        .findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true, req })
        .catch(() => null)
      const enabled = enabledLocales(settings as { languages?: unknown })
      return locales.filter((l) => enabled.includes(l.code as never))
    },
  },
  // Optional SMTP delivery for password resets and enquiry notifications. Without it, email is
  // logged to the server console and enquiries remain available under Enquiries in the admin.
  ...(process.env.SMTP_HOST
    ? {
        email: nodemailerAdapter({
          defaultFromAddress: process.env.SMTP_FROM || 'no-reply@localhost',
          defaultFromName: process.env.SMTP_FROM_NAME || 'Website',
          transportOptions: {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_PORT === '465',
            auth: process.env.SMTP_USER
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
              : undefined,
          },
        }),
      }
    : {}),
  serverURL: siteOrigin(),
  csrf: [
    ...new Set([
      siteOrigin(),
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
      beforeLogin: ['/src/editor/SignIn#GoogleSignIn'],
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
    Posts,
    Categories,
    Blocks,
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
    Forms,
    FormSubmissions,
  ]
    .map((collection) => ({
      ...collection,
      admin: {
        ...collection.admin,
        ...([
          'pages',
          'posts',
          'categories',
          'blocks',
          'case-studies',
          'services',
          'team-members',
          'clients',
        ].includes(collection.slug)
          ? { group: 'Content' }
          : ['media', 'fonts'].includes(collection.slug)
            ? { group: 'Assets' }
            : {}),
      },
    }))
    .map((collection) =>
      ['users', 'ai-usage', 'form-submissions'].includes(collection.slug)
        ? collection
        : protectCollection(collection),
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
      // Without bootstrap credentials the owner uses /setup (protected by DESIGNOS_SETUP_CODE).
      // Anonymous first-user registration is blocked by the Users collection either way.
      if (
        !process.env.BOOTSTRAP_EMAIL ||
        !process.env.BOOTSTRAP_PASSWORD ||
        process.env.BOOTSTRAP_PASSWORD.length < 16
      )
        return
      try {
        await payload.create({
          collection: 'users',
          data: {
            email: process.env.BOOTSTRAP_EMAIL,
            password: process.env.BOOTSTRAP_PASSWORD,
            name: 'Administrator',
            role: 'admin',
          },
        })
      } catch (error) {
        // Another cold-starting instance may have created the administrator first.
        if (!(await payload.count({ collection: 'users' })).totalDocs) throw error
      }
    }
  },
})
