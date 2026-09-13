import type { CollectionConfig, GlobalConfig } from 'payload'
import { authenticated } from '../access'

export const Releases: CollectionConfig = {
  slug: 'site-releases',
  admin: {
    group: 'Publishing',
    useAsTitle: 'label',
    description: 'Immutable whole-site snapshots. Use the publishing controls on Overview.',
  },
  access: { read: authenticated, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'formatVersion', type: 'number', required: true, defaultValue: 1 },
    { name: 'snapshot', type: 'json', required: true, admin: { hidden: true } },
    { name: 'createdBy', type: 'text', required: true },
  ],
}
export const Publication: GlobalConfig = {
  slug: 'publication',
  admin: { hidden: true },
  access: { read: authenticated, update: () => false },
  fields: [
    { name: 'previewRelease', type: 'relationship', relationTo: 'site-releases' },
    { name: 'liveRelease', type: 'relationship', relationTo: 'site-releases' },
    { name: 'liveChangedAt', type: 'date' },
    { name: 'changedBy', type: 'text' },
  ],
}
