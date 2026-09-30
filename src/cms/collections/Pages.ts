import type { CollectionConfig } from 'payload'
import {
  baseFields,
  editorialConfig,
  evidenceFields,
  imageFields,
  searchFields,
} from '../fields/shared'
import { compositionSchema, emptyComposition } from '../../editor/registry/schema'
import { hashPagePassword, hashed } from '../../lib/page-access'

export const Pages: CollectionConfig = {
  slug: 'pages',
  ...editorialConfig('pages'),
  fields: [
    ...baseFields,
    {
      name: 'isTemplate',
      label: 'Page template',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Templates are never published. Use them to start new pages from Overview → New page.',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Password protected', value: 'password' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'pagePassword',
      label: 'Page password',
      type: 'text',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.visibility === 'password',
        description: 'Type a new password to set or change it. It is stored securely.',
      },
      hooks: {
        // Only a hash is ever stored; the form shows the field empty.
        beforeChange: [
          ({ value, originalDoc }) =>
            typeof value === 'string' && value && !hashed(value)
              ? hashPagePassword(value)
              : originalDoc?.pagePassword,
        ],
        afterRead: [
          ({ value, req }) => (req.context.designosCapture ? value : hashed(value) ? '' : value),
        ],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            imageFields(),
            {
              name: 'composition',
              type: 'json',
              localized: true,
              defaultValue: emptyComposition,
              validate: (v: unknown) =>
                compositionSchema.safeParse(v).success || 'Invalid section configuration.',
              admin: { components: { Field: '/src/editor/CompositionField#CompositionField' } },
            },
          ],
        },
        {
          label: 'Relationships',
          fields: [
            { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true },
            {
              name: 'caseStudies',
              type: 'relationship',
              relationTo: 'case-studies',
              hasMany: true,
            },
            ...evidenceFields,
          ],
        },
        {
          label: 'Search & quality',
          fields: [
            searchFields,
            {
              name: 'qualityCheck',
              type: 'ui',
              admin: { components: { Field: '/src/editor/QualityPanel#QualityPanel' } },
            },
          ],
        },
      ],
    },
  ],
}
