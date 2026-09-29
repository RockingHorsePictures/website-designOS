import Image from 'next/image'
import type { ReactNode } from 'react'
import { SiteLink as Link } from '@/components/site/SiteLink'
import { imageSrc, safeLink } from '@/lib/urls'
import type { AnySection, SectionProps } from '@/editor/registry/schema'
import { Markdown } from './Markdown'
import { ContactForm } from './ContactForm'

// Base section renderers. Deliberately neutral: they carry structure, semantics and accessibility,
// not a visual design. A site's bespoke design restyles these (via class names and tokens) or
// registers its own sections; see SECTIONS.md. Components are plain React so the Puck composer
// (client) and the public site (server) render identical output.

export type MediaSummary = {
  id: number
  url?: string | null
  alt?: string | null
  caption?: string | null
  decorative?: boolean | null
  width?: number | null
  height?: number | null
}
export type ProjectSummary = {
  id: number
  title: string
  slug: string
  summary?: string | null
  featured?: boolean | null
}
export type ServiceSummary = { id: number; title: string; slug: string; summary?: string | null }
export type PersonSummary = {
  id: number
  name: string
  role: string
  bio?: string | null
  portrait?: number | null
}
export type ClientSummary = {
  id: number
  name: string
  website?: string | null
  logo?: number | null
}
export type ContactDetails = {
  email?: string | null
  phone?: string | null
  address?: string | null
}
// Everything a section may reference, resolved from the site release (public) or the workspace
// (composer). Sections select from these lists; they never store copied entity content.
export type SectionData = {
  media: Record<number, MediaSummary>
  projects: ProjectSummary[]
  services: ServiceSummary[]
  team: PersonSummary[]
  clients: ClientSummary[]
  contact: ContactDetails
}
export const emptySectionData: SectionData = {
  media: {},
  projects: [],
  services: [],
  team: [],
  clients: [],
  contact: {},
}
export type SectionContext = {
  data: SectionData
  // The page's h1 comes from the page header unless the composition hides it for a first Hero.
  headingLevel: 1 | 2
  editing?: boolean
  pagePath?: string
}

export function pick<T extends { id: number }>(
  all: T[],
  mode: string,
  ids: number[],
  limit = 100,
  filter?: (item: T) => boolean,
): T[] {
  const chosen =
    mode === 'manual'
      ? ids.flatMap((id) => all.filter((item) => item.id === id))
      : all.filter((item) => !filter || filter(item))
  return chosen.slice(0, limit)
}

function Heading({ level, children }: { level: 1 | 2 | 3; children: ReactNode }) {
  if (!children) return null
  const Tag = `h${level}` as 'h2'
  return <Tag>{children}</Tag>
}
function MediaImage({
  value,
  data,
  sizes = '(max-width: 768px) 100vw, 800px',
  priority,
}: {
  value?: { image: number | null; alt?: string; decorative?: boolean } | number | null
  data: SectionData
  sizes?: string
  priority?: boolean
}) {
  const ref = typeof value === 'number' ? { image: value } : value
  const media = ref?.image ? data.media[ref.image] : null
  if (!media?.url) return null
  const use = ref as { alt?: string; decorative?: boolean }
  // Same rule as ContentImage: decorative → empty alt; a per-use description beats the asset's.
  const alt = use.decorative || media.decorative ? '' : use.alt || media.alt || ''
  return (
    <Image
      src={imageSrc(media.url)}
      alt={alt}
      width={media.width || 1200}
      height={media.height || 800}
      sizes={sizes}
      priority={priority}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}
function Action({ link, primary }: { link: { label: string; href: string }; primary?: boolean }) {
  if (!link.label || !link.href || !safeLink(link.href)) return null
  return (
    <Link className={primary ? 'action action-primary' : 'action'} href={link.href}>
      {link.label}
    </Link>
  )
}

export function Intro({ heading, body, style = 'plain' }: SectionProps<'Intro'>) {
  return (
    <section className={`proof-section section-intro ${style}`}>
      <h2>{heading}</h2>
      <p>{body}</p>
    </section>
  )
}
export function CallToAction({ heading, body, label, href }: SectionProps<'CallToAction'>) {
  return (
    <section className="proof-section section-cta">
      <h2>{heading}</h2>
      <p>{body}</p>
      <Link href={href}>{label}</Link>
    </section>
  )
}
export function SelectedProjects({
  heading,
  projects,
}: {
  heading: string
  projects: ProjectSummary[]
}) {
  return (
    <section className="proof-section section-projects">
      <h2>{heading}</h2>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/case-studies/${p.slug}`}>{p.title}</Link>
            <p>{p.summary}</p>
          </li>
        ))}
      </ul>
      {!projects.length && <p>No matching published case studies.</p>}
    </section>
  )
}

// One renderer per section type. `props` excludes the section ID.
export const sectionRenderers: {
  [T in AnySection['type']]: (args: { props: SectionProps<T>; ctx: SectionContext }) => ReactNode
} = {
  Intro: ({ props }) => <Intro {...props} />,
  CallToAction: ({ props }) => <CallToAction {...props} />,
  SelectedProjects: ({ props, ctx }) => (
    <SelectedProjects
      heading={props.heading}
      projects={pick(
        ctx.data.projects,
        props.mode,
        props.projectIds,
        props.limit,
        props.mode === 'featured' ? (p) => Boolean(p.featured) : undefined,
      )}
    />
  ),
  Hero: ({ props, ctx }) => (
    <section className={`section section-hero layout-${props.layout}`}>
      <div className="section-body">
        {props.eyebrow && <p className="eyebrow">{props.eyebrow}</p>}
        <Heading level={ctx.headingLevel}>{props.heading}</Heading>
        <Markdown source={props.body} level={ctx.headingLevel} />
        {(props.primary.label || props.secondary.label) && (
          <p className="actions">
            <Action link={props.primary} primary />
            <Action link={props.secondary} />
          </p>
        )}
      </div>
      <MediaImage value={props.media} data={ctx.data} sizes="100vw" priority />
    </section>
  ),
  Text: ({ props }) => (
    <section className={`section section-text width-${props.width}`}>
      <Heading level={2}>{props.heading}</Heading>
      <Markdown source={props.body} />
    </section>
  ),
  TextMedia: ({ props, ctx }) => (
    <section className={`section section-text-media media-${props.mediaPosition}`}>
      <div className="section-body">
        <Heading level={2}>{props.heading}</Heading>
        <Markdown source={props.body} />
        <Action link={props.link} />
      </div>
      <MediaImage value={props.media} data={ctx.data} />
    </section>
  ),
  Media: ({ props, ctx }) => (
    <figure className={`section section-media size-${props.size}`}>
      <MediaImage
        value={props.media}
        data={ctx.data}
        sizes={props.size === 'content' ? '(max-width: 768px) 100vw, 800px' : '100vw'}
      />
      {props.caption && <figcaption>{props.caption}</figcaption>}
    </figure>
  ),
  Gallery: ({ props, ctx }) => (
    <section className="section section-gallery">
      <Heading level={2}>{props.heading}</Heading>
      <ul className="grid">
        {props.items.map((item, i) => (
          <li key={i}>
            <figure>
              <MediaImage
                value={item.media}
                data={ctx.data}
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              {item.caption && <figcaption>{item.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  ),
  Video: ({ props }) => (
    <section className="section section-video">
      <Heading level={2}>{props.heading}</Heading>
      {props.videoId ? (
        <iframe
          loading="lazy"
          title={props.title || props.heading || 'Video'}
          src={
            props.provider === 'youtube'
              ? `https://www.youtube-nocookie.com/embed/${props.videoId}`
              : `https://player.vimeo.com/video/${props.videoId}?dnt=1`
          }
          allow="fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : null}
      {props.description && <Markdown source={props.description} />}
      {props.transcript && (
        <details>
          <summary>Transcript</summary>
          <Markdown source={props.transcript} />
        </details>
      )}
    </section>
  ),
  Features: ({ props, ctx }) => (
    <section className="section section-features">
      <Heading level={2}>{props.heading}</Heading>
      {props.intro && <Markdown source={props.intro} />}
      <ul className={`grid columns-${props.columns}`}>
        {props.items.map((item, i) => (
          <li key={i}>
            <MediaImage value={item.media} data={ctx.data} sizes="(max-width: 768px) 100vw, 33vw" />
            <Heading level={3}>{item.title}</Heading>
            <Markdown source={item.body} level={3} />
            <Action link={item.link} />
          </li>
        ))}
      </ul>
    </section>
  ),
  Stats: ({ props }) => (
    <section className="section section-stats">
      <Heading level={2}>{props.heading}</Heading>
      <dl className="grid">
        {props.items.map((item, i) => (
          <div key={i}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  ),
  Quotes: ({ props }) => (
    <section className="section section-quotes">
      <Heading level={2}>{props.heading}</Heading>
      {props.items.map((item, i) => (
        <figure key={i}>
          <blockquote>
            <Markdown source={item.quote} />
          </blockquote>
          <figcaption>
            {[item.name, item.role, item.organisation].filter(Boolean).join(', ')}
          </figcaption>
        </figure>
      ))}
    </section>
  ),
  Logos: ({ props, ctx }) => (
    <section className="section section-logos">
      <Heading level={2}>{props.heading}</Heading>
      <ul className="grid">
        {pick(ctx.data.clients, props.mode, props.clientIds).map((client) => {
          const logo = client.logo ? ctx.data.media[client.logo] : null
          const mark = logo?.url ? (
            <Image
              src={imageSrc(logo.url)}
              alt={client.name}
              width={logo.width || 240}
              height={logo.height || 120}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          ) : (
            client.name
          )
          return (
            <li key={client.id}>
              {client.website && /^https:\/\//.test(client.website) ? (
                <a href={client.website} rel="noopener">
                  {mark}
                </a>
              ) : (
                mark
              )}
            </li>
          )
        })}
      </ul>
    </section>
  ),
  FAQ: ({ props }) => (
    <section className="section section-faq">
      <Heading level={2}>{props.heading}</Heading>
      {props.items.map((item, i) => (
        <details key={i}>
          <summary>{item.question}</summary>
          <Markdown source={item.answer} level={3} />
        </details>
      ))}
    </section>
  ),
  Services: ({ props, ctx }) => (
    <section className="section section-services">
      <Heading level={2}>{props.heading}</Heading>
      <ul className="grid">
        {pick(ctx.data.services, props.mode, props.serviceIds, props.limit).map((s) => (
          <li key={s.id}>
            <h3>
              <Link href={`/services/${s.slug}`}>{s.title}</Link>
            </h3>
            <p>{s.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  ),
  Team: ({ props, ctx }) => (
    <section className="section section-team">
      <Heading level={2}>{props.heading}</Heading>
      <ul className="grid">
        {pick(ctx.data.team, props.mode, props.memberIds, props.limit).map((p) => (
          <li key={p.id}>
            <MediaImage value={p.portrait} data={ctx.data} sizes="(max-width: 768px) 50vw, 25vw" />
            <h3>{p.name}</h3>
            <p>{p.role}</p>
            {p.bio && <p>{p.bio}</p>}
          </li>
        ))}
      </ul>
    </section>
  ),
  Contact: ({ props, ctx }) => (
    <section className="section section-contact" id="contact">
      <Heading level={2}>{props.heading}</Heading>
      <Markdown source={props.body} />
      {props.showDetails && (
        <address>
          {ctx.data.contact.email && (
            <p>
              <a href={`mailto:${ctx.data.contact.email}`}>{ctx.data.contact.email}</a>
            </p>
          )}
          {ctx.data.contact.phone && (
            <p>
              <a href={`tel:${ctx.data.contact.phone.replace(/[^+\d]/g, '')}`}>
                {ctx.data.contact.phone}
              </a>
            </p>
          )}
          {ctx.data.contact.address && (
            <p style={{ whiteSpace: 'pre-line' }}>{ctx.data.contact.address}</p>
          )}
        </address>
      )}
      {props.form && (
        <ContactForm
          submitLabel={props.submitLabel || 'Send'}
          successMessage={props.successMessage}
          disabled={ctx.editing}
          pagePath={ctx.pagePath}
        />
      )}
    </section>
  ),
}

export function SectionView({ section, ctx }: { section: AnySection; ctx: SectionContext }) {
  const render = sectionRenderers[section.type] as (args: {
    props: unknown
    ctx: SectionContext
  }) => ReactNode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...props } = section.props
  return <>{render({ props, ctx })}</>
}
