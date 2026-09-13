import type { Metadata } from 'next'
import type { Page, CaseStudy, Service, SiteSetting, Media } from '@/payload-types'
import { absoluteURL, contentPath, type ContentCollection } from '../urls'

export type SearchDoc = Page | CaseStudy | Service
export const indexable = (
  doc: {
    _status?: string | null
    demo?: boolean | null
    seo?: { noindex?: boolean | null; canonical?: string | null } | null
  },
  path: string,
  production = process.env.SITE_ENV === 'production',
) =>
  production &&
  doc._status === 'published' &&
  !doc.demo &&
  !doc.seo?.noindex &&
  (!doc.seo?.canonical || doc.seo.canonical === absoluteURL(path))
export function metadataFor(
  doc: SearchDoc,
  collection: ContentCollection,
  settings: SiteSetting,
  preview = false,
): Metadata {
  const url = absoluteURL(contentPath(collection, doc.slug))
  const title = doc.seo?.title || `${doc.title} | ${settings.companyName}`
  const description = doc.seo?.description || doc.summary || settings.description || ''
  const image = doc.seo?.socialImage || settings.defaultShareImage
  const socialImage = typeof image === 'object' && image?.url ? absoluteURL(image.url) : undefined
  return {
    title,
    description,
    alternates: { canonical: doc.seo?.canonical || url },
    robots: {
      index: !preview && indexable(doc, contentPath(collection, doc.slug)),
      follow: !preview,
    },
    openGraph: {
      type: 'website',
      title: doc.seo?.socialTitle || title,
      description: doc.seo?.socialDescription || description,
      url,
      ...(socialImage ? { images: [socialImage] } : {}),
    },
    twitter: { card: socialImage ? 'summary_large_image' : 'summary', title, description },
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
export function schemaFor(doc: SearchDoc, collection: ContentCollection, settings: SiteSetting) {
  const origin = absoluteURL('/')
  const url = absoluteURL(contentPath(collection, doc.slug))
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${origin}#organization`,
      name: settings.companyName,
      url: origin,
      ...(settings.socialLinks?.length
        ? { sameAs: settings.socialLinks.map((s) => s.url).filter((u) => /^https?:/.test(u)) }
        : {}),
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}#website`,
      url: origin,
      name: settings.companyName,
      publisher: { '@id': `${origin}#organization` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: settings.companyName, item: origin },
        ...(doc.slug === 'home'
          ? []
          : [{ '@type': 'ListItem', position: 2, name: doc.title, item: url }]),
      ],
    },
    {
      '@type': collection === 'services' ? 'Service' : 'WebPage',
      '@id': `${url}#page`,
      name: doc.title,
      description: doc.summary,
      url,
      ...(collection === 'services'
        ? { provider: { '@id': `${origin}#organization` } }
        : { isPartOf: { '@id': `${origin}#website` } }),
    },
  ]
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
  return { '@context': 'https://schema.org', '@graph': graph }
}
export function serializeSchema(schema: unknown) {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}
