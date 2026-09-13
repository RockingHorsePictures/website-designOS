import type { CollectionConfig } from 'payload'
import {
  baseFields,
  editorialConfig,
  evidenceFields,
  imageFields,
  searchFields,
} from '../fields/shared'
import { compositionSchema, emptyComposition } from '../../editor/registry/schema'

export const Pages: CollectionConfig = {
  slug: 'pages',
  ...editorialConfig('pages'),
  fields: [
    ...baseFields,
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
