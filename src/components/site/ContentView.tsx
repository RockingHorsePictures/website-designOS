import Link from 'next/link'
import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { cms, previewUser } from '@/lib/cms'
import { compositionSchema } from '@/editor/registry/schema'
import { Intro, CallToAction, SelectedProjects } from '../sections'
import type { Media, Page, CaseStudy, Service, SiteSetting } from '@/payload-types'
import { schemaFor, serializeSchema } from '@/lib/search/metadata'
import type { ContentCollection } from '@/lib/urls'

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
        src={media.url}
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
  doc: Page | CaseStudy | Service
  collection: ContentCollection
  settings: SiteSetting
}) {
  const payload = await cms()
  const user = await previewUser()
  const composition = 'composition' in doc ? compositionSchema.safeParse(doc.composition) : null
  return (
    <article>
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        {doc.slug !== 'home' && <> / {doc.title}</>}
      </nav>
      {doc.demo && (
        <p className="notice">Demonstration content. This is not a proposed website design.</p>
      )}
      <h1>{doc.title}</h1>
      <p>{doc.summary}</p>
      <ContentImage asset={doc.heroMedia} />
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
      {composition?.success &&
        (await Promise.all(
          composition.data.content.map(async (section) => {
            if (section.type === 'Intro') return <Intro key={section.props.id} {...section.props} />
            if (section.type === 'CallToAction')
              return <CallToAction key={section.props.id} {...section.props} />
            const { mode, projectIds, limit } = section.props
            const { docs } = await payload.find({
              collection: 'case-studies',
              draft: Boolean(user),
              user,
              overrideAccess: false,
              limit,
              sort: '-publishedAt',
              where:
                mode === 'manual'
                  ? { id: { in: projectIds } }
                  : mode === 'featured'
                    ? { featured: { equals: true } }
                    : {},
            })
            const ordered =
              mode === 'manual' ? projectIds.flatMap((id) => docs.filter((p) => p.id === id)) : docs
            return (
              <SelectedProjects
                key={section.props.id}
                heading={section.props.heading}
                projects={ordered}
              />
            )
          }),
        ))}
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
        dangerouslySetInnerHTML={{ __html: serializeSchema(schemaFor(doc, collection, settings)) }}
      />
    </article>
  )
}
