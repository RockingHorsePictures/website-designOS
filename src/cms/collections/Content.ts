import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'
import {
  baseFields,
  editorialConfig,
  evidenceFields,
  imageFields,
  searchFields,
  videoFields,
  linkFields,
} from '../fields/shared'

const qa: import('payload').Field = {
  name: 'qualityCheck',
  type: 'ui',
  admin: { components: { Field: '/src/editor/QualityPanel#QualityPanel' } },
}
export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  labels: { singular: 'Case Study', plural: 'Case Studies' },
  ...editorialConfig('case-studies'),
  fields: [
    ...baseFields,
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Project',
          fields: [
            { name: 'client', type: 'relationship', relationTo: 'clients' },
            { name: 'year', type: 'number', min: 1900, max: 2200 },
            { name: 'narrative', type: 'richText' },
            { name: 'featured', type: 'checkbox' },
            imageFields(),
            imageFields('thumbnail'),
            videoFields,
            { name: 'gallery', type: 'array', fields: [imageFields('asset')] },
            {
              name: 'results',
              type: 'textarea',
              admin: { description: 'Include only outcomes supported by evidence.' },
            },
          ],
        },
        {
          label: 'Relationships',
          fields: [
            { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true },
            {
              name: 'credits',
              type: 'array',
              fields: [
                { name: 'person', type: 'relationship', relationTo: 'team-members' },
                { name: 'contribution', type: 'text' },
              ],
            },
            { name: 'related', type: 'relationship', relationTo: 'case-studies', hasMany: true },
            ...evidenceFields,
          ],
        },
        { label: 'Search & quality', fields: [searchFields, qa] },
      ],
    },
  ],
}
export const Services: CollectionConfig = {
  slug: 'services',
  ...editorialConfig('services'),
  fields: [
    ...baseFields,
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Service',
          fields: [
            { name: 'description', type: 'richText' },
            imageFields(),
            videoFields,
            {
              name: 'capabilities',
              type: 'array',
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
              ],
            },
            { name: 'showInNavigation', type: 'checkbox' },
          ],
        },
        {
          label: 'Relationships',
          fields: [
            {
              name: 'caseStudies',
              type: 'relationship',
              relationTo: 'case-studies',
              hasMany: true,
            },
            { name: 'related', type: 'relationship', relationTo: 'services', hasMany: true },
            ...evidenceFields,
          ],
        },
        { label: 'Search & quality', fields: [searchFields, qa] },
      ],
    },
  ],
}
export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  labels: { singular: 'Team Member', plural: 'Team' },
  admin: {
    useAsTitle: 'name',
    group: 'Website',
    defaultColumns: ['name', 'role', 'active', 'order'],
  },
  access: {
    read: ({ req }) => (req.user ? true : { active: { equals: true } }),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    imageFields('portrait'),
    imageFields('alternatePortrait'),
    { name: 'bio', type: 'textarea' },
    { name: 'longBio', type: 'richText' },
    { name: 'links', type: 'array', fields: linkFields },
    { name: 'order', type: 'number', defaultValue: 0 },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'demo', type: 'checkbox', defaultValue: false },
  ],
}
export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: { useAsTitle: 'name', group: 'Website' },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'website', type: 'text' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'demo', type: 'checkbox', defaultValue: false },
  ],
}
