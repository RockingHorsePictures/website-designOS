import {
  APIError,
  type CollectionConfig,
  type GlobalConfig,
  type Field,
  type PayloadRequest,
} from 'payload'
import { advisoryLock } from '../lib/transaction'
import { protectBrandAsset } from '../lib/releases'
import { fileInAnyRelease } from '../lib/release-assets'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isAI, readOnlyAI } from './access'
import { codePreview, codePreviewMessage } from '../lib/code-preview'

function requireWritable(req: PayloadRequest) {
  if (codePreview()) throw new APIError(codePreviewMessage(), 403)
  if (readOnlyAI(req.user))
    throw new APIError(
      'This AI connection is read-only. Make changes in the code-preview workspace.',
      403,
    )
}

// A new upload never takes the name of a file a release still shows (its record may have been
// deleted, and Blob storage would overwrite the file) or one another record uses.
async function avoidReleasedName(req: PayloadRequest, collection: 'media' | 'fonts') {
  const file = req.file!
  const dot = file.name.lastIndexOf('.')
  const [base, ext] = dot > 0 ? [file.name.slice(0, dot), file.name.slice(dot)] : [file.name, '']
  let name = file.name
  for (let n = 1; ; n++) {
    const taken =
      (await fileInAnyRelease(req.payload, collection, name)) ||
      (await req.payload.count({ collection, where: { filename: { equals: name } }, req }))
        .totalDocs > 0
    if (!taken) break
    name = `${base}-${n}${ext}`
  }
  file.name = name
}

// Replacing or deleting a file that a release uses: Blob storage keeps it (the adapter never deletes
// a released file). Local storage (development) deletes the files during the operation, so they are
// read here and written back afterwards.
async function keepReleasedFiles(req: PayloadRequest, collection: 'media' | 'fonts', id: unknown) {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return
  const doc = (await req.payload.findByID({
    collection,
    id: id as number,
    depth: 0,
    overrideAccess: true,
    req,
  })) as { filename?: string; sizes?: Record<string, { filename?: string | null }> }
  const upload = req.payload.collections[collection].config.upload
  const dir = typeof upload === 'object' && upload.staticDir ? upload.staticDir : collection
  const names = [doc.filename, ...Object.values(doc.sizes || {}).map((s) => s?.filename)].filter(
    (n): n is string => Boolean(n),
  )
  const kept: { file: string; data: Buffer }[] = []
  for (const name of names) {
    const file = path.join(dir, name)
    if (existsSync(file) && (await fileInAnyRelease(req.payload, collection, name)))
      kept.push({ file, data: await readFile(file) })
  }
  if (kept.length)
    req.context.keptFiles = [
      ...((req.context.keptFiles as { file: string; data: Buffer }[] | undefined) || []),
      ...kept,
    ]
}
const restoreKeptFiles = async ({ doc, req }: { doc: unknown; req: PayloadRequest }) => {
  const kept = req.context.keptFiles as { file: string; data: Buffer }[] | undefined
  if (kept) {
    for (const { file, data } of kept)
      if (!existsSync(file)) {
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, data)
      }
    delete req.context.keptFiles
  }
  return doc
}

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
      ![
        'protection',
        'publishedAt',
        '_status',
        'updatedAt',
        'createdAt',
        'position',
        '_order',
      ].includes(field.name)
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
  restoring = Boolean(req.context.isRestoringVersion),
}: {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  req: PayloadRequest
  fields: Field[]
  restoring?: boolean
}) {
  requireWritable(req)
  const policies = (originalDoc?.protection || {}) as Policies
  const approved =
    req.context.policyApproval === policyApproval && req.user && req.user.role !== 'ai'
  // A restored version carries the approval record from its own time. Current approvals and
  // locks always win: restoring content never changes policies.
  if (restoring) delete data.protection
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
    // Imported content is reviewed after the import, so it is not stamped as approved.
    if (req.context.designosImport) continue
    if (req.user && !isAI(req.user) && !approved)
      next[field.name] = { state: 'approved', by: req.user.email, at: new Date().toISOString() }
    // An AI change is not a human approval: the field returns to an editable default.
    else if (isAI(req.user) && policies[field.name]?.state === 'approved')
      next[field.name] = { state: 'default', by: req.user!.email, at: new Date().toISOString() }
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
      create: (args) =>
        readOnlyAI(args.req.user) || codePreview()
          ? false
          : (config.access?.create?.(args) ?? Boolean(args.req.user)),
      update: (args) =>
        readOnlyAI(args.req.user) || codePreview()
          ? false
          : (config.access?.update?.(args) ?? Boolean(args.req.user)),
      // AI accounts edit unlocked content but never delete records or files.
      delete: (args) =>
        isAI(args.req.user) ? false : (config.access?.delete?.(args) ?? Boolean(args.req.user)),
      read: ['media', 'fonts'].includes(config.slug)
        ? config.access?.read
        : ({ req }) => Boolean(req.user),
    },
    fields: [...config.fields, ...protectionFields()],
    hooks: {
      ...config.hooks,
      afterChange: [...(config.hooks?.afterChange || []), restoreKeptFiles],
      afterDelete: [...(config.hooks?.afterDelete || []), restoreKeptFiles],
      beforeOperation: [
        ...(config.hooks?.beforeOperation || []),
        async ({ req, operation, args }) => {
          if (['create', 'update', 'delete', 'restoreVersion'].includes(operation))
            requireWritable(req)
          if (
            ['media', 'fonts'].includes(config.slug) &&
            ['create', 'update'].includes(operation) &&
            req.file &&
            !(args as { overwriteExistingFiles?: boolean }).overwriteExistingFiles
          )
            await avoidReleasedName(req, config.slug as 'media' | 'fonts')
          if (['update', 'delete', 'restoreVersion'].includes(operation)) {
            const tx = await req.transactionID
            if (tx) await advisoryLock(req, 742193802)
            // Images and fonts can be replaced or deleted, one at a time or in bulk. Files a
            // saved release shows are kept for it (see keepReleasedFiles and the Blob adapter).
            const id = 'id' in args ? args.id : undefined
            if (
              ['media', 'fonts'].includes(config.slug) &&
              operation === 'update' &&
              id &&
              req.file
            )
              await keepReleasedFiles(req, config.slug as 'media' | 'fonts', id)
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
          if (originalDoc?.id && ['media', 'fonts'].includes(config.slug))
            await protectBrandAsset(req, config.slug as 'media' | 'fonts', originalDoc.id)
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
          if (['media', 'fonts'].includes(config.slug)) {
            await protectBrandAsset(req, config.slug as 'media' | 'fonts', id)
            await keepReleasedFiles(req, config.slug as 'media' | 'fonts', id)
          }
        },
      ],
    },
  }
}
export function protectGlobal(config: GlobalConfig): GlobalConfig {
  return {
    ...config,
    access: {
      ...config.access,
      read: ({ req }) => Boolean(req.user),
      update: (args) =>
        readOnlyAI(args.req.user) || codePreview()
          ? false
          : (config.access?.update?.(args) ?? Boolean(args.req.user)),
    },
    fields: [...config.fields, ...protectionFields()],
    hooks: {
      ...config.hooks,
      beforeOperation: [
        ...(config.hooks?.beforeOperation || []),
        async ({ args, operation, req }) => {
          if (['update', 'restoreVersion'].includes(operation)) requireWritable(req)
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
              restoring: true,
            })
            req.context.designosPolicies = current.protection || {}
          }
          return args
        },
      ],
      afterChange: [
        ...(config.hooks?.afterChange || []),
        async ({ doc, req }) => {
          // The adapter wrote the old version's approval record; put the current one back.
          if (!req.context.isRestoringVersion || !req.context.designosPolicies) return doc
          const raw = await req.payload.db.findGlobal({ slug: config.slug, req })
          await req.payload.db.updateGlobal({
            slug: config.slug,
            data: { ...raw, protection: req.context.designosPolicies },
            req,
          })
          return { ...doc, protection: req.context.designosPolicies }
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
