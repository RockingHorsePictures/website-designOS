import { randomBytes } from 'node:crypto'
import type { CollectionConfig } from 'payload'
import { adminField, authenticated, humanField } from '../access'
import { safeLink } from '../../lib/urls'

export const formFieldTypes = [
  'text',
  'email',
  'tel',
  'textarea',
  'select',
  'checkbox',
  'number',
  'date',
  'url',
] as const

// Editor-defined forms, placed on pages with the Form section. Definitions are released with the
// site; delivery settings (notification addresses, webhook) stay in the workspace and are
// human-only, because they decide where visitors' personal data is sent.
export const Forms: CollectionConfig = {
  slug: 'forms',
  labels: { singular: 'Form', plural: 'Forms' },
  admin: {
    group: 'Enquiries',
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
    description: 'Build forms here, then add them to a page with the Form section.',
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'For editors only.' } },
    {
      name: 'fields',
      type: 'array',
      minRows: 1,
      maxRows: 30,
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, localized: true },
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: { description: 'Stored key, e.g. company_size' },
              validate: (v: unknown) =>
                (typeof v === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(v)) ||
                'Use lowercase letters, numbers and underscores.',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'type',
              type: 'select',
              required: true,
              defaultValue: 'text',
              options: [...formFieldTypes],
            },
            { name: 'required', type: 'checkbox', defaultValue: false },
            {
              name: 'width',
              type: 'select',
              defaultValue: 'full',
              options: ['full', 'half'],
            },
          ],
        },
        { name: 'placeholder', type: 'text', localized: true },
        { name: 'help', type: 'text', localized: true, label: 'Help text' },
        {
          name: 'options',
          type: 'array',
          admin: { condition: (_, row) => row?.type === 'select' },
          fields: [
            { name: 'label', type: 'text', required: true, localized: true },
            { name: 'value', type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'submitLabel', type: 'text', defaultValue: 'Send', localized: true },
    {
      name: 'successMessage',
      type: 'textarea',
      defaultValue: 'Thank you. We will be in touch soon.',
      localized: true,
    },
    {
      name: 'redirect',
      label: 'After sending, go to (optional)',
      type: 'text',
      access: { create: humanField, update: humanField },
      validate: (v: unknown) =>
        !v || (typeof v === 'string' && /^\/(?!\/)/.test(v) && safeLink(v)) || 'Use a page path.',
    },
    {
      type: 'collapsible',
      label: 'Delivery',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'storeSubmissions',
          type: 'checkbox',
          defaultValue: true,
          label: 'Keep submissions under Enquiries',
          access: { create: humanField, update: humanField },
        },
        {
          name: 'notify',
          label: 'Email notifications to',
          type: 'text',
          admin: { description: 'Comma-separated addresses. Needs email (SMTP) configured.' },
          access: { create: humanField, update: humanField },
          validate: (v: unknown) =>
            !v ||
            (typeof v === 'string' &&
              v.split(',').every((a) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(a.trim()))) ||
            'Enter email addresses separated by commas.',
        },
        {
          name: 'webhookURL',
          label: 'Webhook URL (Zapier, Make, Slack, CRM)',
          type: 'text',
          admin: {
            description:
              'Each submission is POSTed as JSON, signed with the secret below (header X-DesignOS-Signature: sha256=<hmac>).',
          },
          access: { create: adminField, update: adminField },
          validate: (v: unknown) =>
            !v || (typeof v === 'string' && /^https:\/\/[^\s/]+/.test(v)) || 'Use an https:// URL.',
        },
        {
          name: 'webhookSecret',
          type: 'text',
          admin: { readOnly: true, description: 'Use this to verify webhook signatures.' },
          access: { read: humanField },
          // Generated once and never taken from input.
          hooks: {
            beforeChange: [
              ({ originalDoc }) =>
                originalDoc?.webhookSecret || randomBytes(24).toString('base64url'),
            ],
          },
        },
      ],
    },
  ],
}
