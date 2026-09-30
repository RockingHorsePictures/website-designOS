import type { Metadata } from 'next'
import type { Page, CaseStudy, Service, Post, SiteSetting, Media } from '@/payload-types'
import { defaultLocale, localePath } from '../locales'
import { absoluteURL, contentPath, type ContentCollection } from '../urls'
import { plainText } from '../markdown'
import { allSections, type Composition } from '../../editor/registry/schema'

export type SearchDoc = Page | CaseStudy | Service | Post
// Language context for a page: the current language and every language the site publishes.
export type LocaleContext = { current: string; enabled: string[] }
// Canonical and hreflang alternates for a path in every published language.
export function languageAlternates(path: string, locales?: LocaleContext) {
  const current = locales?.current || defaultLocale
  const canonical = absoluteURL(localePath(path, current))
  if (!locales || locales.enabled.length < 2) return { canonical }
  return {
    canonical,
    languages: {
      ...Object.fromEntries(locales.enabled.map((l) => [l, absoluteURL(localePath(path, l))])),
      'x-default': absoluteURL(path),
    },
  }
}
export const collectionIndex: Record<ContentCollection, { path: string; name: string } | null> = {
  pages: null,
  services: { path: '/services', name: 'Services' },
  'case-studies': { path: '/case-studies', name: 'Case studies' },
  posts: { path: '/blog', name: 'Blog' },
}
const mediaURL = (value: unknown) =>
  value && typeof value === 'object' && 'url' in value && typeof value.url === 'string'
    ? absoluteURL(value.url)
    : undefined
export const indexable = (
  doc: {
    _status?: string | null
    demo?: boolean | null
    visibility?: string | null
    seo?: { noindex?: boolean | null; canonical?: string | null } | null
  },
  path: string,
  production = process.env.SITE_ENV === 'production',
) =>
  production &&
  doc._status === 'published' &&
  !doc.demo &&
  doc.visibility !== 'password' &&
  !doc.seo?.noindex &&
  (!doc.seo?.canonical || doc.seo.canonical === absoluteURL(path))
export function metadataFor(
  doc: SearchDoc,
  collection: ContentCollection,
  settings: SiteSetting,
  preview = false,
  locales?: LocaleContext,
): Metadata {
  const path = contentPath(collection, doc.slug)
  const url = absoluteURL(localePath(path, locales?.current))
  const locked = 'visibility' in doc && doc.visibility === 'password'
  const title =
    doc.seo?.title ||
    (collection === 'pages' && doc.slug === 'home'
      ? settings.companyName
      : `${doc.title} | ${settings.companyName}`)
  const description = locked
    ? 'This page is password protected.'
    : doc.seo?.description || doc.summary || settings.description || ''
  const socialImage =
    mediaURL(doc.seo?.socialImage) ||
    mediaURL(doc.heroMedia?.image) ||
    mediaURL(settings.defaultShareImage) ||
    // Generated from the page title when nothing else is set.
    absoluteURL(`/og?path=${encodeURIComponent(localePath(path, locales?.current))}`)
  const article = collection === 'case-studies' || collection === 'posts'
  const alternates = languageAlternates(path, locales)
  return {
    title,
    description,
    alternates: doc.seo?.canonical ? { canonical: doc.seo.canonical } : alternates,
    robots: {
      index: !preview && indexable(doc, contentPath(collection, doc.slug)),
      follow: !preview,
    },
    openGraph: {
      type: article ? 'article' : 'website',
      siteName: settings.companyName,
      locale: (locales && locales.current !== defaultLocale
        ? locales.current
        : settings.language || 'en'
      ).replace('-', '_'),
      title: doc.seo?.socialTitle || title,
      description: doc.seo?.socialDescription || description,
      url,
      ...(article && doc.publishedAt ? { publishedTime: doc.publishedAt } : {}),
      ...(article ? { modifiedTime: doc.updatedAt } : {}),
      ...(socialImage ? { images: [socialImage] } : {}),
    },
    twitter: {
      card: socialImage ? 'summary_large_image' : 'summary',
      title: doc.seo?.socialTitle || title,
      description: doc.seo?.socialDescription || description,
      ...(socialImage ? { images: [socialImage] } : {}),
    },
  }
}
export function imageSchema(media: Media) {
  return media.url
    ? {
        '@type': 'ImageObject',
        contentUrl: absoluteURL(media.url),
        width: media.width,
        height: media.height,
        caption: media.caption || undefined,
      }
    : undefined
}
export function organizationSchema(settings: SiteSetting) {
  const origin = absoluteURL('/')
  const logo = mediaURL(settings.logo)
  return {
    '@type': settings.organizationType || 'Organization',
    '@id': `${origin}#organization`,
    name: settings.companyName,
    url: origin,
    ...(settings.description ? { description: settings.description } : {}),
    ...(logo ? { logo: { '@type': 'ImageObject', url: logo } } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: settings.address.trim().replace(/\s*\n\s*/g, ', '),
          },
        }
      : {}),
    ...(settings.email || settings.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(settings.email ? { email: settings.email } : {}),
            ...(settings.phone ? { telephone: settings.phone } : {}),
          },
        }
      : {}),
    ...(settings.socialLinks?.length
      ? { sameAs: settings.socialLinks.map((s) => s.url).filter((u) => /^https?:/.test(u)) }
      : {}),
  }
}
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteURL(item.path),
    })),
  }
}
// Structured data mirrors visible content only: FAQ and video entries come from rendered sections.
export function sectionSchemas(composition: Composition | null | undefined, pageURL: string) {
  const graph: Record<string, unknown>[] = []
  const content = allSections(composition?.content || [])
  const faqs = content.flatMap((s) =>
    s.type === 'FAQ' && s.props.structuredData
      ? s.props.items.filter((i) => i.question.trim() && i.answer.trim())
      : [],
  )
  if (faqs.length)
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageURL}#faq`,
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: plainText(item.answer) },
      })),
    })
  for (const s of content)
    if (
      s.type === 'Video' &&
      s.props.videoId &&
      s.props.title &&
      s.props.description &&
      s.props.uploadDate
    )
      graph.push({
        '@type': 'VideoObject',
        name: s.props.title,
        description: plainText(s.props.description),
        uploadDate: s.props.uploadDate,
        embedUrl:
          s.props.provider === 'youtube'
            ? `https://www.youtube-nocookie.com/embed/${s.props.videoId}`
            : `https://player.vimeo.com/video/${s.props.videoId}`,
        ...(s.props.provider === 'youtube'
          ? { thumbnailUrl: `https://i.ytimg.com/vi/${s.props.videoId}/hqdefault.jpg` }
          : {}),
        ...(s.props.transcript ? { transcript: plainText(s.props.transcript) } : {}),
      })
  return graph
}
export function schemaFor(
  doc: SearchDoc,
  collection: ContentCollection,
  settings: SiteSetting,
  composition?: Composition | null,
  locale?: string,
) {
  const origin = absoluteURL('/')
  const path = contentPath(collection, doc.slug)
  const url = absoluteURL(localePath(path, locale))
  const index = collectionIndex[collection]
  const language = locale && locale !== defaultLocale ? locale : settings.language || 'en'
  const home = collection === 'pages' && doc.slug === 'home'
  const graph: Record<string, unknown>[] = [
    organizationSchema(settings),
    {
      '@type': 'WebSite',
      '@id': `${origin}#website`,
      url: origin,
      name: settings.companyName,
      inLanguage: language,
      publisher: { '@id': `${origin}#organization` },
    },
    breadcrumbSchema([
      { name: settings.companyName, path: '/' },
      ...(index ? [index] : []),
      ...(home ? [] : [{ name: doc.title, path }]),
    ]),
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: doc.seo?.title || doc.title,
      description: doc.seo?.description || doc.summary,
      inLanguage: language,
      isPartOf: { '@id': `${origin}#website` },
      ...(doc.updatedAt ? { dateModified: doc.updatedAt } : {}),
      ...(doc.seo?.topic ? { about: { '@type': 'Thing', name: doc.seo.topic } } : {}),
    },
  ]
  if (collection === 'services')
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: doc.title,
      description: doc.summary,
      url,
      provider: { '@id': `${origin}#organization` },
      mainEntityOfPage: { '@id': `${url}#page` },
    })
  if (collection === 'case-studies')
    graph.push({
      '@type': 'CreativeWork',
      '@id': `${url}#work`,
      name: doc.title,
      abstract: doc.summary,
      url,
      creator: { '@id': `${origin}#organization` },
      ...('year' in doc && doc.year ? { dateCreated: String(doc.year) } : {}),
      ...('client' in doc && doc.client && typeof doc.client === 'object'
        ? { sourceOrganization: { '@type': 'Organization', name: doc.client.name } }
        : {}),
      mainEntityOfPage: { '@id': `${url}#page` },
    })
  if (collection === 'posts') {
    const post = doc as Post
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: doc.seo?.title || doc.title,
      description: doc.seo?.description || doc.summary,
      url,
      inLanguage: language,
      datePublished: post.date || post.publishedAt || post.createdAt,
      dateModified: post.updatedAt,
      mainEntityOfPage: { '@id': `${url}#page` },
      publisher: { '@id': `${origin}#organization` },
      ...(mediaURL(doc.heroMedia?.image) ? { image: mediaURL(doc.heroMedia?.image) } : {}),
      ...(post.authors?.some((a) => typeof a === 'object')
        ? {
            author: post.authors.flatMap((a) =>
              typeof a === 'object' ? [{ '@type': 'Person', name: a.name, jobTitle: a.role }] : [],
            ),
          }
        : { author: { '@id': `${origin}#organization` } }),
      ...(post.categories?.some((c) => typeof c === 'object')
        ? {
            articleSection: post.categories.flatMap((c) =>
              typeof c === 'object' ? [c.title] : [],
            ),
          }
        : {}),
    })
  }
  const image = doc.heroMedia?.image
  if (image && typeof image === 'object') {
    const schema = imageSchema(image)
    if (schema) graph.push(schema)
  }
  if (
    'video' in doc &&
    doc.video?.vimeoId &&
    doc.video.title &&
    doc.video.description &&
    doc.video.uploadDate &&
    typeof doc.video.poster === 'object' &&
    doc.video.poster?.url
  )
    graph.push({
      '@type': 'VideoObject',
      name: doc.video.title,
      description: doc.video.description,
      uploadDate: doc.video.uploadDate,
      thumbnailUrl: absoluteURL(doc.video.poster.url),
      embedUrl: `https://player.vimeo.com/video/${doc.video.vimeoId}`,
    })
  graph.push(...sectionSchemas(composition, url))
  return { '@context': 'https://schema.org', '@graph': graph }
}
export function serializeSchema(schema: unknown) {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}
