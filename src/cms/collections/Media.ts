import type { CollectionConfig } from 'payload'
import { authenticated, releasedAsset, staffField } from '../access'
import { mediaDescription } from '../hooks/media'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Website', useAsTitle: 'filename' },
  // Organise the library into folders (Media → Browse by folder). Folders never change an image's
  // address or anything on the site.
  folders: true,
  access: {
    read: releasedAsset('media'),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
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
    { name: 'alt', type: 'text', label: 'Image description', localized: true },
    { name: 'decorative', type: 'checkbox', defaultValue: false },
    { name: 'caption', type: 'text', localized: true },
    {
      name: 'context',
      type: 'textarea',
      access: { read: staffField },
      label: 'How is this image used?',
      admin: {
        description:
          'Provide the page title, nearby copy and purpose to help draft an accurate description.',
      },
    },
    {
      name: 'altSource',
      type: 'select',
      access: { read: staffField },
      options: ['manual', 'ai-draft', 'decorative', 'needs-review'],
      defaultValue: 'needs-review',
      admin: { readOnly: true },
    },
    {
      name: 'descriptionActions',
      type: 'ui',
      admin: { components: { Field: '/src/editor/MediaActions#MediaActions' } },
    },
    { name: 'demo', type: 'checkbox', defaultValue: false, access: { read: staffField } },
  ],
}
