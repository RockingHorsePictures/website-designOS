import type { CollectionConfig } from 'payload'
import { administrator, adminField, readOnlyAI } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: { tokenExpiration: 7200, maxLoginAttempts: 5, lockTime: 600000 },
  admin: { useAsTitle: 'email', group: 'Administration' },
  access: {
    create: administrator,
    delete: administrator,
    read: ({ req }) =>
      req.user?.role === 'admin' ? true : req.user ? { id: { equals: req.user.id } } : false,
    update: ({ req }) =>
      readOnlyAI(req.user)
        ? false
        : req.user?.role === 'admin'
          ? true
          : req.user
            ? { id: { equals: req.user.id } }
            : false,
  },
  fields: [
    {
      name: 'aiReadOnly',
      type: 'checkbox',
      defaultValue: false,
      label: 'Read-only AI connection',
      admin: {
        description:
          'Production AI connections can read content and approvals but cannot change them.',
      },
      access: { create: adminField, update: adminField },
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        'admin',
        'editor',
        { label: 'AI contributor (cannot approve or publish)', value: 'ai' },
      ],
      access: { create: adminField, update: adminField },
    },
  ],
}
