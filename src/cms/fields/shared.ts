import type { Field, CollectionConfig } from 'payload'
import { authenticated, publishedOrAuthenticated } from '../access'
import { contentPath, safeLink, validSlug, type ContentCollection } from '../../lib/urls'
import { previewWidths } from '../../design-system/tokens'
import { beforePublish, afterContentChange, afterContentDelete } from '../hooks/publishing'

export const linkFields: Field[] = [
  { name: 'label', type: 'text', required: true },
  {
    name: 'url',
    type: 'text',
    required: true,
    validate: (value: unknown) =>
      (typeof value === 'string' && safeLink(value)) ||
      'Enter a valid internal, web, email or phone link.',
  },
]
export const searchFields: Field = {
  name: 'seo',
  label: 'Search & sharing',
  type: 'group',
  fields: [
    {
      name: 'title',
      label: 'Search title',
      type: 'text',
      admin: { description: 'Defaults to the page title and company name.' },
    },
    { name: 'description', label: 'Search description', type: 'textarea', maxLength: 320 },
    {
      name: 'canonical',
      label: 'Canonical URL override',
      type: 'text',
      validate: (v: unknown) =>
        !v ||
        (typeof v === 'string' && /^https?:\/\/[^\s]+$/.test(v)) ||
        'Use an absolute http(s) URL.',
    },
    { name: 'noindex', label: 'Hide from search engines', type: 'checkbox', defaultValue: false },
    { name: 'socialTitle', type: 'text' },
    { name: 'socialDescription', type: 'textarea' },
    { name: 'socialImage', type: 'upload', relationTo: 'media' },
    { name: 'topic', label: 'Primary topic', type: 'text' },
    { name: 'intent', label: 'What should this page help the visitor do?', type: 'text' },
    {
      name: 'questions',
      type: 'array',
      fields: [{ name: 'question', type: 'text', required: true }],
    },
  ],
}
export const imageFields = (name = 'heroMedia'): Field => ({
  name,
  type: 'group',
  label: name === 'heroMedia' ? 'Hero image' : name,
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'altOverride', label: 'Description for this use (optional)', type: 'text' },
    {
      name: 'decorative',
      type: 'checkbox',
      label: 'Decorative in this context',
      defaultValue: false,
    },
  ],
})
export const videoFields: Field = {
  name: 'video',
  type: 'group',
  fields: [
    {
      name: 'vimeoId',
      type: 'text',
      label: 'Vimeo video ID',
      validate: (v: unknown) =>
        !v || (typeof v === 'string' && /^\d+$/.test(v)) || 'Enter the numeric Vimeo ID.',
    },
    { name: 'title', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'poster', type: 'upload', relationTo: 'media' },
    { name: 'uploadDate', type: 'date' },
    { name: 'transcript', type: 'textarea', label: 'Transcript / accessible alternative' },
  ],
}
export const baseFields: Field[] = [
  { name: 'title', type: 'text', required: true },
  {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    validate: (v: unknown) => validSlug(v) || 'Use lowercase letters, numbers and single hyphens.',
  },
  { name: 'summary', type: 'textarea', required: true },
  { name: 'order', type: 'number', defaultValue: 0 },
  {
    name: 'demo',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      position: 'sidebar',
      description: 'Demo records are excluded from production search indexing.',
    },
  },
  { name: 'publishedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
]
export const evidenceFields: Field[] = [
  {
    name: 'evidence',
    type: 'relationship',
    relationTo: 'approved-facts',
    hasMany: true,
    label: 'Supporting facts',
    filterOptions: { verification: { equals: 'verified' } },
  },
  {
    name: 'aiAssisted',
    type: 'checkbox',
    label: 'Includes AI-assisted claims',
    defaultValue: false,
  },
  {
    name: 'claimsReviewed',
    type: 'checkbox',
    label: 'A person has checked factual claims',
    defaultValue: false,
  },
]
export function editorialConfig(
  slug: ContentCollection,
): Pick<CollectionConfig, 'access' | 'versions' | 'admin' | 'hooks'> {
  return {
    access: {
      read: publishedOrAuthenticated,
      create: authenticated,
      update: authenticated,
      delete: authenticated,
    },
    versions: { drafts: { schedulePublish: { timeFormat: 'HH:mm' } }, maxPerDoc: 30 },
    admin: {
      useAsTitle: 'title',
      group: 'Website',
      defaultColumns: ['title', '_status', 'updatedAt'],
      preview: (data) => `/api/preview?collection=${slug}&id=${data.id}`,
      livePreview: {
        url: ({ data }) => `/api/preview?collection=${slug}&id=${data.id}`,
        breakpoints: previewWidths,
      },
    },
    hooks: {
      beforeChange: [beforePublish],
      afterChange: [afterContentChange],
      afterDelete: [afterContentDelete],
    },
  }
}
export { contentPath }
