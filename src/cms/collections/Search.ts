import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { administrator, authenticated, humanField } from '../access'

export const ApprovedFacts: CollectionConfig = {
  slug: 'approved-facts',
  labels: { singular: 'Approved Fact', plural: 'Approved Facts & Evidence' },
  admin: {
    useAsTitle: 'statement',
    group: 'Search & evidence',
    defaultColumns: ['statement', 'verification', 'verifiedAt'],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: administrator,
  },
  fields: [
    { name: 'statement', type: 'textarea', required: true },
    {
      name: 'category',
      type: 'select',
      options: [
        'company',
        'capability',
        'client',
        'project',
        'result',
        'award',
        'testimonial',
        'location',
        'other',
      ],
      required: true,
    },
    { name: 'sourceNote', type: 'textarea', required: true },
    { name: 'sourceURL', type: 'text' },
    {
      name: 'verification',
      type: 'select',
      options: ['pending', 'verified', 'rejected'],
      defaultValue: 'pending',
      required: true,
      access: { create: humanField, update: humanField },
      admin: { description: 'Only a person can verify or reject a fact.' },
    },
    { name: 'verifiedAt', type: 'date', access: { create: humanField, update: humanField } },
    { name: 'reviewAt', type: 'date' },
    { name: 'client', type: 'relationship', relationTo: 'clients' },
    { name: 'project', type: 'relationship', relationTo: 'case-studies' },
    { name: 'service', type: 'relationship', relationTo: 'services' },
    { name: 'notes', type: 'textarea' },
  ],
}
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: { useAsTitle: 'from', group: 'Search & evidence' },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'from', type: 'text', unique: true, required: true },
    { name: 'to', type: 'text', required: true },
    { name: 'reason', type: 'text' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        const from = data.from ?? originalDoc?.from
        const to = data.to ?? originalDoc?.to
        const valid = (p: unknown) =>
          typeof p === 'string' &&
          /^\/(?!\/)[a-z0-9\-/]*$/.test(p) &&
          !/^\/(admin|api|editor)(\/|$)/.test(p)
        if (!valid(from) || !valid(to) || from === to)
          throw new APIError('Use distinct internal content paths.', 400)
        let cursor = to
        const seen = new Set([from])
        for (let i = 0; i < 20; i++) {
          if (seen.has(cursor)) throw new APIError('This redirect creates a loop.', 400)
          seen.add(cursor)
          const { docs } = await req.payload.find({
            collection: 'redirects',
            where: { from: { equals: cursor } },
            req,
            limit: 1,
          })
          if (!docs[0]) return data
          cursor = docs[0].to
        }
        throw new APIError('Redirect chain is too long.', 400)
      },
    ],
  },
}
