import type { Payload, TypedUser } from 'payload'
import { releaseID } from './releases'
import { googleEnabled } from './auth/google'
import { enabledLocales } from './locales'
import pkg from '../../package.json'

const recentCollections = [
  ['pages', 'Page'],
  ['posts', 'Post'],
  ['services', 'Service'],
  ['case-studies', 'Case study'],
  ['blocks', 'Reusable block'],
  ['forms', 'Form'],
] as const

// The latest Design OS release, checked at most once an hour. Never blocks the dashboard.
let cachedRelease: { at: number; version: string | null; url: string | null } | null = null
async function latestRelease() {
  if (cachedRelease && Date.now() - cachedRelease.at < 3600_000) return cachedRelease
  try {
    const res = await fetch(
      'https://api.github.com/repos/RockingHorsePictures/website-designOS/releases/latest',
      { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(3000) },
    )
    const body = (await res.json()) as { tag_name?: string; html_url?: string }
    cachedRelease = {
      at: Date.now(),
      version: res.ok && body.tag_name ? body.tag_name.replace(/^v/, '') : null,
      url: body.html_url || null,
    }
  } catch {
    cachedRelease = { at: Date.now(), version: null, url: null }
  }
  return cachedRelease
}
const newer = (a: string, b: string) => {
  const pa = a.split(/[.-]/).map(Number)
  const pb = b.split(/[.-]/).map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0)
  return false
}

// Everything the Overview needs in one request, read as the signed-in user.
export async function dashboard(payload: Payload, user: TypedUser) {
  const read = { user, overrideAccess: false, depth: 0 } as const
  const staff = user.role === 'admin' || user.role === 'editor'
  const [settings, theme, publication, ...recent] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', ...read }),
    payload.findGlobal({ slug: 'theme', ...read }),
    payload.findGlobal({ slug: 'publication', depth: 0 }),
    ...recentCollections.map(([collection]) =>
      payload
        .find({
          collection,
          ...read,
          draft: true,
          limit: 6,
          sort: '-updatedAt',
          select: { title: true, updatedAt: true },
        } as never)
        .catch(() => ({ docs: [], totalDocs: 0 })),
    ),
  ])
  const counts = Object.fromEntries(
    recentCollections.map(([collection], i) => [
      collection,
      (recent[i] as { totalDocs: number }).totalDocs,
    ]),
  )
  const edits = recentCollections
    .flatMap(([collection, kind], i) =>
      ((recent[i] as { docs: { id: number; title?: string; updatedAt: string }[] }).docs || []).map(
        (doc) => ({
          kind,
          title: doc.title || 'Untitled',
          updatedAt: doc.updatedAt,
          href: `/admin/collections/${collection}/${doc.id}`,
        }),
      ),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)
  const previewID = releaseID(publication.previewRelease)
  const liveID = releaseID(publication.liveRelease)
  const [preview, live] = await Promise.all(
    [previewID, liveID].map((id) =>
      id
        ? payload
            .findByID({
              collection: 'site-releases',
              id,
              depth: 0,
              select: { createdAt: true, createdBy: true },
            } as never)
            .catch(() => null)
        : null,
    ),
  )
  const lastEdit = [edits[0]?.updatedAt, settings.updatedAt, theme.updatedAt]
    .filter(Boolean)
    .sort()
    .pop()
  const previewAt = (preview as { createdAt?: string } | null)?.createdAt || null
  const newEnquiries = staff
    ? (
        await payload.count({
          collection: 'form-submissions',
          where: { status: { equals: 'new' } },
          user,
          overrideAccess: false,
        })
      ).totalDocs
    : null
  const aiConnected =
    user.role === 'admin'
      ? (await payload.count({ collection: 'users', where: { role: { equals: 'ai' } } }))
          .totalDocs > 0
      : null
  const templates = (
    await payload.find({
      collection: 'pages',
      where: { isTemplate: { equals: true } },
      draft: true,
      limit: 50,
      select: { title: true },
      ...read,
    } as never)
  ).docs.map((d) => ({ id: (d as { id: number }).id, title: (d as { title: string }).title }))
  const release = await latestRelease()
  const protection = (theme.protection || {}) as Record<string, { state?: string }>
  const checklist = [
    {
      id: 'company',
      label: 'Add your company details',
      done: Boolean(settings.description && (settings.email || settings.phone)),
      href: '/admin/globals/site-settings',
    },
    {
      id: 'logo',
      label: 'Upload your logo and browser icon',
      done: Boolean(settings.logo && settings.siteIcon),
      href: '/admin/globals/site-settings',
    },
    {
      id: 'brand',
      label: 'Set your colours and fonts',
      done: Object.values(protection).some((p) => p.state === 'approved' || p.state === 'locked'),
      href: '/admin/globals/theme',
    },
    {
      id: 'pages',
      label: 'Build your pages',
      done: (counts.pages || 0) > 1,
      href: '/admin/collections/pages',
    },
    {
      id: 'preview',
      label: 'Save a site Preview and review it',
      done: Boolean(previewID),
      href: '#publishing',
    },
    { id: 'live', label: 'Publish your website', done: Boolean(liveID), href: '#publishing' },
    ...(user.role === 'admin'
      ? [
          {
            id: 'google',
            label: 'Turn on Sign in with Google',
            done: googleEnabled(),
            href: '/admin/collections/users',
          },
          {
            id: 'email',
            label: 'Connect email for enquiries and password resets',
            done: Boolean(process.env.SMTP_HOST),
            href: 'https://github.com/RockingHorsePictures/website-designOS/blob/stable/docs/DEPLOY.md#email',
          },
        ]
      : []),
  ]
  return {
    user: { name: user.name || user.email, role: user.role },
    company: settings.companyName,
    languages: enabledLocales(settings as { languages?: unknown }),
    counts,
    newEnquiries,
    edits,
    publishing: {
      previewAt,
      liveAt:
        publication.liveChangedAt || (live as { createdAt?: string } | null)?.createdAt || null,
      live: Boolean(liveID),
      unsavedChanges: Boolean(lastEdit && (!previewAt || lastEdit > previewAt)),
      previewDiffersFromLive: Boolean(previewID && previewID !== liveID),
    },
    checklist,
    templates,
    aiConnected,
    version: pkg.version,
    update:
      release.version && newer(release.version, pkg.version)
        ? {
            version: release.version,
            notes: release.url,
            repo:
              process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
                ? `https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
                : null,
          }
        : null,
  }
}
export type Dashboard = Awaited<ReturnType<typeof dashboard>>
