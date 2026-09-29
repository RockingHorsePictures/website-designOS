import type { Access, CollectionConfig } from 'payload'
import { administrator } from '../access'

// Enquiries contain personal data: people with editor accounts can read them; AI accounts cannot.
// Submissions are never part of site releases. Records are created only by /api/forms/contact.
const staff: Access = ({ req }) => ['admin', 'editor'].includes(req.user?.role || '')
export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  labels: { singular: 'Enquiry', plural: 'Enquiries' },
  admin: {
    group: 'Enquiries',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'status', 'createdAt'],
    description:
      'Messages sent through Contact sections. Delete records you no longer need; they are personal data.',
  },
  access: { create: () => false, read: staff, update: staff, delete: administrator },
  fields: [
    {
      name: 'status',
      type: 'select',
      options: ['new', 'replied', 'archived', 'spam'],
      defaultValue: 'new',
      required: true,
      admin: { position: 'sidebar' },
    },
    { name: 'name', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'email', type: 'email', required: true, admin: { readOnly: true } },
    { name: 'message', type: 'textarea', required: true, admin: { readOnly: true } },
    { name: 'page', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'channel',
      type: 'select',
      options: ['live', 'preview'],
      defaultValue: 'live',
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'notes', type: 'textarea', label: 'Internal notes' },
    // Salted hash used only for rate limiting; the address itself is never stored.
    { name: 'senderKey', type: 'text', index: true, admin: { hidden: true } },
  ],
}
