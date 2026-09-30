import { SiteLink as Link } from '@/components/site/SiteLink'
import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { compositionSchema, type Composition } from '@/editor/registry/schema'
import { cookies } from 'next/headers'
import type { Media, Page, CaseStudy, Service, Post, SiteSetting } from '@/payload-types'
import { accessCookie, hasPageAccess } from '@/lib/page-access'
import { siteLocale, siteView } from '@/lib/site'
import { dateFormatter } from './Sections'
import { collectionIndex, schemaFor, serializeSchema } from '@/lib/search/metadata'
import { contentPath, imageSrc, type ContentCollection } from '@/lib/urls'
import { Sections } from './Sections'

export function ContentImage({
  asset,
}: {
  asset?: {
    image?: number | Media | null
    altOverride?: string | null
    decorative?: boolean | null
  } | null
}) {
  const media = asset?.image
  if (!media || typeof media !== 'object' || !media.url) return null
  return (
    <figure>
      <Image
        src={imageSrc(media.url)}
        alt={asset?.decorative || media.decorative ? '' : asset?.altOverride || media.alt || ''}
        width={media.width || 800}
        height={media.height || 600}
        sizes="(max-width: 768px) 100vw, 800px"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  )
}
export async function ContentView({
  doc,
  collection,
  settings,
}: {
  doc: Page | CaseStudy | Service | Post
  collection: ContentCollection
  settings: SiteSetting
}) {
  const path = contentPath(collection, doc.slug)
  // Password-protected pages show only a sign-in form until the visitor enters the password.
  if ('visibility' in doc && doc.visibility === 'password' && (await siteView()) !== 'workspace') {
    const jar = await cookies()
    if (!hasPageAccess(doc as never, jar.get(accessCookie(doc.id))?.value))
      return (
        <article className="page-locked">
          <h1>{doc.title}</h1>
          <p>This page is protected. Enter the password to continue.</p>
          <form method="post" action="/api/page-access" className="site-form">
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="back" value={path} />
            <p>
              <label htmlFor="page-password">Password</label>
              <input
                id="page-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </p>
            <button type="submit">Continue</button>
          </form>
        </article>
      )
  }
  const parsed = 'composition' in doc ? compositionSchema.safeParse(doc.composition) : null
  const composition = parsed?.success ? (parsed.data as Composition) : null
  const hideHeader = composition?.root.props?.pageHeader === 'hidden'
  const index = collectionIndex[collection]
  const formatDate = dateFormatter(await siteLocale())
  const post = collection === 'posts' ? (doc as Post) : null
  const postDate = post ? post.date || post.publishedAt || post.createdAt : null
  return (
    <article>
      {doc.slug !== 'home' && (
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link href="/">Home</Link>
          {index && (
            <>
              {' / '}
              <Link href={index.path}>{index.name}</Link>
            </>
          )}
          {' / '}
          <span aria-current="page">{doc.title}</span>
        </nav>
      )}
      {doc.demo && (
        <p className="notice">Demonstration content. This is not a proposed website design.</p>
      )}
      {!hideHeader && (
        <header className="page-header">
          <h1>{doc.title}</h1>
          <p>{doc.summary}</p>
          {post && (
            <p className="meta">
              {postDate && <time dateTime={postDate}>{formatDate(postDate)}</time>}
              {post.authors?.some((a) => typeof a === 'object') && (
                <>
                  {' · '}
                  {post.authors.flatMap((a) => (typeof a === 'object' ? [a.name] : [])).join(', ')}
                </>
              )}
            </p>
          )}
          <ContentImage asset={doc.heroMedia} />
        </header>
      )}
      {post?.body && <RichText data={post.body} />}
      {post?.categories?.some((c) => typeof c === 'object') && (
        <p className="tags">
          {post.categories.flatMap((c) =>
            typeof c === 'object'
              ? [
                  <Link key={c.id} href={`/blog/category/${c.slug}`}>
                    {c.title}
                  </Link>,
                ]
              : [],
          )}
        </p>
      )}
      {post?.related?.some((r) => typeof r === 'object') && (
        <section>
          <h2>Related posts</h2>
          <ul>
            {post.related.flatMap((r) =>
              typeof r === 'object'
                ? [
                    <li key={r.id}>
                      <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                    </li>,
                  ]
                : [],
            )}
          </ul>
        </section>
      )}
      {'client' in doc && typeof doc.client === 'object' && doc.client && (
        <p>Client: {doc.client.name}</p>
      )}
      {'narrative' in doc && doc.narrative && <RichText data={doc.narrative} />}
      {'description' in doc && doc.description && <RichText data={doc.description} />}
      {'capabilities' in doc && doc.capabilities?.length ? (
        <section>
          <h2>Capabilities</h2>
          <ul>
            {doc.capabilities.map((c) => (
              <li key={c.id}>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {'gallery' in doc && doc.gallery?.map((g) => <ContentImage key={g.id} asset={g.asset} />)}
      {'results' in doc && doc.results && (
        <section>
          <h2>Results</h2>
          <p>{doc.results}</p>
        </section>
      )}
      {'video' in doc && doc.video?.vimeoId && (
        <section>
          <h2>{doc.video.title || 'Video'}</h2>
          <p>{doc.video.description}</p>
          <iframe
            loading="lazy"
            title={doc.video.title || doc.title}
            src={`https://player.vimeo.com/video/${doc.video.vimeoId}?dnt=1`}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
          />
          <p>{doc.video.transcript}</p>
        </section>
      )}
      {composition && <Sections composition={composition} settings={settings} pagePath={path} />}
      {'services' in doc && doc.services?.length ? (
        <section>
          <h2>Related services</h2>
          <ul>
            {doc.services.map(
              (s) =>
                typeof s === 'object' && (
                  <li key={s.id}>
                    <Link href={`/services/${s.slug}`}>{s.title}</Link>
                  </li>
                ),
            )}
          </ul>
        </section>
      ) : null}
      {'caseStudies' in doc && doc.caseStudies?.length ? (
        <section>
          <h2>Related case studies</h2>
          <ul>
            {doc.caseStudies.map(
              (s) =>
                typeof s === 'object' && (
                  <li key={s.id}>
                    <Link href={`/case-studies/${s.slug}`}>{s.title}</Link>
                  </li>
                ),
            )}
          </ul>
        </section>
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSchema(
            schemaFor(doc, collection, settings, composition, await siteLocale()),
          ),
        }}
      />
    </article>
  )
}
