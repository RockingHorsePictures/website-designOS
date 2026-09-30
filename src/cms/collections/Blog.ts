import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'
import {
  baseFields,
  editorialConfig,
  evidenceFields,
  imageFields,
  searchFields,
} from '../fields/shared'
import { validSlug } from '../../lib/urls'

const qa: import('payload').Field = {
  name: 'qualityCheck',
  type: 'ui',
  admin: { components: { Field: '/src/editor/QualityPanel#QualityPanel' } },
}
// Blog posts live at /blog/<slug>, with an index, category pages and an RSS feed.
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Blog posts' },
  ...editorialConfig('posts'),
  fields: [
    ...baseFields,
    {
      name: 'date',
      label: 'Publication date shown',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Defaults to when the post was first published.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Post',
          fields: [
            imageFields(),
            { name: 'body', type: 'richText', localized: true },
            { name: 'featured', type: 'checkbox' },
          ],
        },
        {
          label: 'Relationships',
          fields: [
            {
              name: 'authors',
              type: 'relationship',
              relationTo: 'team-members',
              hasMany: true,
            },
            { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
            { name: 'related', type: 'relationship', relationTo: 'posts', hasMany: true },
            ...evidenceFields,
          ],
        },
        { label: 'Search & quality', fields: [searchFields, qa] },
      ],
    },
  ],
}
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Category', plural: 'Categories' },
  admin: { useAsTitle: 'title', group: 'Content', defaultColumns: ['title', 'slug'] },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) =>
        validSlug(v) || 'Use lowercase letters, numbers and single hyphens.',
    },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
}
