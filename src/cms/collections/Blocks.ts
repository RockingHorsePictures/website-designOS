import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'
import { blockCompositionSchema, emptyComposition } from '../../editor/registry/schema'

// Reusable blocks: a group of sections edited once and shown on many pages (a footer call to
// action, a trust strip, opening hours). Pages place them with the Reusable block section.
export const Blocks: CollectionConfig = {
  slug: 'blocks',
  labels: { singular: 'Reusable block', plural: 'Reusable blocks' },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'updatedAt'],
    description: 'Edit once; every page using the block updates in the next site release.',
  },
  versions: { maxPerDoc: 20 },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'composition',
      type: 'json',
      localized: true,
      defaultValue: emptyComposition,
      validate: (v: unknown) =>
        blockCompositionSchema.safeParse(v).success || 'Invalid section configuration.',
      admin: { components: { Field: '/src/editor/CompositionField#CompositionField' } },
    },
  ],
}
