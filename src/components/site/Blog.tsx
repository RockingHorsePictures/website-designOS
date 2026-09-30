import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { siteCMS, siteView, siteLocale, localeContext } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { SiteLink as Link } from '@/components/site/SiteLink'
import { ContentImage } from '@/components/site/ContentView'
import { absoluteURL } from '@/lib/urls'
import { localePath } from '@/lib/locales'
import {
  breadcrumbSchema,
  indexable,
  languageAlternates,
  organizationSchema,
  serializeSchema,
} from '@/lib/search/metadata'
import { dateFormatter } from './Sections'
import type { Category, Post } from '@/payload-types'

export const PAGE_SIZE = 12
const dateOf = (p: Post) => p.date || p.publishedAt || p.createdAt

// Published posts, newest first, optionally in one category.
export async function blogPosts(categoryId?: number) {
  const user = await previewUser()
  const { docs } = await (
    await siteCMS()
  ).find({
    collection: 'posts',
    overrideAccess: false,
    user,
    draft: Boolean(user),
    limit: 1000,
    depth: 1,
  })
  const visible = (docs as Post[]).filter(
    (p) =>
      (p as { visibility?: string }).visibility !== 'password' &&
      (!categoryId || p.categories?.some((c) => (typeof c === 'object' ? c.id : c) === categoryId)),
  )
  return visible.sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))))
}
export async function blogCategories() {
  const { docs } = await (
    await siteCMS()
  ).find({ collection: 'categories', overrideAccess: false, limit: 200, depth: 0, sort: 'order' })
  return docs as Category[]
}
export async function blogMetadata(
  title: string,
  path: string,
  page: number,
  count: number,
): Promise<Metadata> {
  const settings = await (await siteCMS()).findGlobal({ slug: 'site-settings' })
  const live = (await siteView()) === 'live' && process.env.SITE_ENV === 'production'
  const alternates = languageAlternates(path, await localeContext())
  return {
    title: `${title}${page > 1 ? ` (page ${page})` : ''} | ${settings.companyName}`,
    description: settings.description || title,
    alternates: {
      ...alternates,
      canonical: page > 1 ? `${alternates.canonical}?page=${page}` : alternates.canonical,
      types: { 'application/rss+xml': absoluteURL('/blog/feed.xml') },
    },
    robots: { index: live && count > 0, follow: live },
  }
}

export async function BlogIndex({
  title,
  path,
  page,
  category,
}: {
  title: string
  path: string
  page: number
  category?: Category
}) {
  const [posts, categories, settings, locale] = await Promise.all([
    blogPosts(category?.id),
    blogCategories(),
    (await siteCMS()).findGlobal({ slug: 'site-settings' }),
    siteLocale(),
  ])
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  if (page > pages) notFound()
  const shown = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const formatDate = dateFormatter(locale)
  const url = absoluteURL(localePath(path, locale))
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(settings),
      breadcrumbSchema([
        { name: settings.companyName, path: '/' },
        { name: 'Blog', path: '/blog' },
        ...(category ? [{ name: category.title, path }] : []),
      ]),
      {
        '@type': 'Blog',
        '@id': `${url}#blog`,
        url,
        name: title,
        inLanguage: locale,
        blogPost: shown
          .filter((p) => indexable(p, `/blog/${p.slug}`, true))
          .map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            url: absoluteURL(localePath(`/blog/${p.slug}`, locale)),
            datePublished: dateOf(p),
          })),
      },
    ],
  }
  return (
    <section className="blog-index">
      <h1>{title}</h1>
      {category?.description && <p>{category.description}</p>}
      {categories.length > 0 && (
        <nav aria-label="Categories" className="tags">
          <Link href="/blog" aria-current={!category ? 'page' : undefined}>
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/blog/category/${c.slug}`}
              aria-current={category?.id === c.id ? 'page' : undefined}
            >
              {c.title}
            </Link>
          ))}
        </nav>
      )}
      <ul className="grid posts">
        {shown.map((post) => (
          <li key={post.id}>
            <ContentImage asset={post.heroMedia} />
            <h2>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="meta">
              <time dateTime={dateOf(post)}>{formatDate(dateOf(post))}</time>
            </p>
            <p>{post.summary}</p>
          </li>
        ))}
      </ul>
      {!shown.length && <p>No posts yet.</p>}
      {pages > 1 && (
        <nav aria-label="Pagination" className="pagination">
          {page > 1 && (
            <Link href={page === 2 ? path : `${path}?page=${page - 1}`} rel="prev">
              Newer posts
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`${path}?page=${page + 1}`} rel="next">
              Older posts
            </Link>
          )}
        </nav>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
      />
    </section>
  )
}
export const pageNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : 1
}
