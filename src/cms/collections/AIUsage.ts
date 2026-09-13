import type { CollectionConfig } from 'payload'
import { administrator } from '../access'
export const AIUsage: CollectionConfig = {
  slug: 'ai-usage',
  admin: { hidden: true },
  access: { read: administrator, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', unique: true, required: true },
    { name: 'count', type: 'number', required: true },
  ],
}
