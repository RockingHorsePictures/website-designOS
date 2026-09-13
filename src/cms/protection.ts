import {
  APIError,
  type CollectionConfig,
  type GlobalConfig,
  type Field,
  type PayloadRequest,
} from 'payload'
import { advisoryLock } from '../lib/transaction'
import { protectReleasedAsset } from '../lib/releases'

export const policyApproval = Symbol('explicit human policy change')
export type Policy = { state: 'default' | 'approved' | 'locked'; by?: string; at?: string }
export type Policies = Record<string, Policy>
export function editableFields(
  fields: Field[],
): { name: string; label: string; defaultValue?: unknown }[] {
  return fields.flatMap((field) => {
    if (field.type === 'ui') return []
    if (
      'name' in field &&
      field.name &&
      !['protection', 'publishedAt', '_status', 'updatedAt', 'createdAt'].includes(field.name)
    )
      return [
        {
          name: field.name,
          label: typeof field.label === 'string' ? field.label : field.name,
          defaultValue: 'defaultValue' in field ? field.defaultValue : undefined,
        },
      ]
    if ('fields' in field) return editableFields(field.fields)
    if (field.type === 'tabs') return field.tabs.flatMap((tab) => editableFields(tab.fields))
    return []
  })
}
function comparable(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize)
    if (!v || typeof v !== 'object') return v ?? null
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    )
  }
  return JSON.stringify(normalize(value))
}
export async function checkProtection({
  data,
  originalDoc,
  req,
  fields,
}: {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  req: PayloadRequest
  fields: Field[]
}) {
  const policies = (originalDoc?.protection || {}) as Policies
  const approved =
    req.context.policyApproval === policyApproval && req.user && req.user.role !== 'ai'
  if ('protection' in data && comparable(data.protection) !== comparable(policies) && !approved)
    throw new APIError('Only the approval controls can change field locks.', 403)
  const next =
    approved && 'protection' in data ? { ...(data.protection as Policies) } : { ...policies }
  for (const field of editableFields(fields)) {
    if (
      !(field.name in data) ||
      comparable(data[field.name]) === comparable(originalDoc?.[field.name])
    )
      continue
    if (policies[field.name]?.state === 'locked')
      throw new APIError(
        `${field.label} is locked. Ask its owner to unlock it in Approvals & locks before changing it.`,
        423,
      )
    if (req.user && req.user.role !== 'ai' && !approved)
      next[field.name] = { state: 'approved', by: req.user.email, at: new Date().toISOString() }
  }
  data.protection = next
  return data
}
function protectionFields(): Field[] {
  return [
    {
      name: 'protection',
      type: 'json',
      defaultValue: {},
      admin: { hidden: true },
      access: { read: ({ req }) => Boolean(req.user) },
    },
    {
      name: 'approvalControls',
      type: 'ui',
      admin: { components: { Field: '/src/editor/ProtectionPanel#ProtectionPanel' } },
    },
  ]
}
export function protectCollection(config: CollectionConfig): CollectionConfig {
  return {
    ...config,
    access: {
      ...config.access,
      read: ['media', 'fonts'].includes(config.slug)
        ? config.access?.read
        : ({ req }) => Boolean(req.user),
    },
    fields: [...config.fields, ...protectionFields()],
    hooks: {
      ...config.hooks,
      beforeOperation: [
        ...(config.hooks?.beforeOperation || []),
        async ({ req, operation, args }) => {
          if (['update', 'delete', 'restoreVersion'].includes(operation)) {
            const tx = await req.transactionID
            if (tx) await advisoryLock(req, 742193802)
            if (['media', 'fonts'].includes(config.slug) && (operation === 'delete' || req.file)) {
              const id = 'id' in args ? args.id : undefined
              if (id) await protectReleasedAsset(req, config.slug as 'media' | 'fonts', id)
              else throw new APIError('Change retained files individually.', 400)
            }
          }
          return args
        },
      ],
      beforeChange: [
        async ({ data, originalDoc, req }) => {
          const latest = originalDoc?.id
            ? await req.payload.findByID({
                collection: config.slug as 'pages',
                id: originalDoc.id,
                draft: true,
                depth: 0,
                req,
              })
            : originalDoc
          return checkProtection({ data, originalDoc: latest, req, fields: config.fields })
        },
        ...(config.hooks?.beforeChange || []),
      ],
      beforeDelete: [
        ...(config.hooks?.beforeDelete || []),
        async ({ req, id }) => {
          const doc = await req.payload.findByID({
            collection: config.slug as 'pages',
            id,
            depth: 0,
            draft: true,
            req,
          })
          if (
            Object.values((doc.protection || {}) as Policies).some(
              (policy) => policy.state === 'locked',
            )
          )
            throw new APIError('Unlock approved fields before deleting this record.', 423)
        },
      ],
    },
  }
}
export function protectGlobal(config: GlobalConfig): GlobalConfig {
  return {
    ...config,
    access: { ...config.access, read: ({ req }) => Boolean(req.user) },
    fields: [...config.fields, ...protectionFields()],
    hooks: {
      ...config.hooks,
      beforeOperation: [
        ...(config.hooks?.beforeOperation || []),
        async ({ args, operation, req }) => {
          // Payload restores globals directly in the adapter, skipping beforeChange.
          if (operation === 'restoreVersion') {
            await advisoryLock(req, 742193802)
            const current = await req.payload.findGlobal({
              slug: config.slug as 'theme',
              depth: 0,
              req,
            })
            const saved = await req.payload.findGlobalVersionByID({
              slug: config.slug as 'theme',
              id: args.id,
              depth: 0,
              req,
            })
            await checkProtection({
              data: { ...saved.version },
              originalDoc: { ...current },
              req,
              fields: config.fields,
            })
          }
          return args
        },
      ],
      beforeChange: [
        async ({ data, originalDoc, req }) => {
          const tx = await req.transactionID
          if (tx) await advisoryLock(req, 742193802)
          const latest = await req.payload.findGlobal({
            slug: config.slug as 'theme',
            depth: 0,
            req,
          })
          return checkProtection({
            data,
            originalDoc: { ...originalDoc, ...latest },
            req,
            fields: config.fields,
          })
        },
        ...(config.hooks?.beforeChange || []),
      ],
    },
  }
}
