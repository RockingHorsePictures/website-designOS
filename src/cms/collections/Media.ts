import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'
import { mediaDescription } from '../hooks/media'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Website', useAsTitle: 'filename' },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    focalPoint: true,
    imageSizes: [
      { name: 'card', width: 640 },
      { name: 'large', width: 1600 },
    ],
  },
  hooks: { beforeChange: [mediaDescription] },
  fields: [
    { name: 'alt', type: 'text', label: 'Image description' },
    { name: 'decorative', type: 'checkbox', defaultValue: false },
    { name: 'caption', type: 'text' },
    {
      name: 'context',
      type: 'textarea',
      label: 'How is this image used?',
      admin: {
        description:
          'Provide the page title, nearby copy and purpose to help draft an accurate description.',
      },
    },
    {
      name: 'altSource',
      type: 'select',
      options: ['manual', 'ai-draft', 'decorative', 'needs-review'],
      defaultValue: 'needs-review',
      admin: { readOnly: true },
    },
    {
      name: 'descriptionActions',
      type: 'ui',
      admin: { components: { Field: '/src/editor/MediaActions#MediaActions' } },
    },
    { name: 'demo', type: 'checkbox', defaultValue: false },
  ],
}
