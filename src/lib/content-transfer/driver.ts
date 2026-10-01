import { fileKey, type Bundle, type Doc } from './bundle'
import type { IDMap } from './remap'

// Runs an import step by step. `exec` sends one operation to the destination site (the browser
// uses the /api/content-import endpoint; tests call the server functions directly). Each step is
// small, so large sites never hit request size or time limits, and a failed record is reported
// without stopping the rest. Running it again updates what it created instead of duplicating it.

export type Plan = {
  collections: string[]
  order: string[]
  uploads: string[]
  ordered: string[]
  defaultLocale: string
  matches: IDMap
  missing: string[]
  warnings: string[]
  maxFileBytes: number | null
  // Source IDs of matched file records whose stored file is missing (re-uploaded on import).
  missingFiles?: Record<string, string[]>
}
export type Operation =
  | { op: 'plan'; manifest: Bundle['manifest']; keys: Record<string, Doc[]> }
  | {
      op: 'record'
      collection: string
      record: Doc
      targetId: number | string | null
      idMap: IDMap
      locale?: string
      source?: string
    }
  | {
      op: 'file'
      collection: string
      record: Doc
      file: { name: string; data: Uint8Array }
      targetId?: number | string | null
      source?: string
    }
  | { op: 'global'; slug: string; data: Record<string, unknown>; idMap: IDMap; locale?: string }
  | { op: 'order'; collection: string; ids: (number | string)[] }
  | { op: 'setOrder'; collection: string; items: { id: number | string; key: string }[] }
  | { op: 'removeDemo'; keep: IDMap }
export type OpResult = {
  id?: number | string
  unresolved?: string[]
  unknown?: string[]
  removed?: string[]
  failed?: string[]
  keys?: string[]
  error?: string
}
export type Exec = (op: Operation) => Promise<OpResult & Partial<Plan>>
// updateExisting false: only add new records and re-upload missing files; records this site already
// has (and may have edited since) are left exactly as they are.
export type ImportOptions = { globals: boolean; removeDemo: boolean; updateExisting?: boolean }
export type ImportReport = {
  created: Record<string, number>
  updated: Record<string, number>
  reusedFiles: number
  repairedFiles: number
  kept: number
  errors: string[]
  unresolved: string[]
  unknown: string[]
  removed: string[]
  warnings: string[]
}
export type Progress = (done: number, total: number, step: string) => void

// Only the fields the destination needs to recognise records it already has.
export function planKeys(bundle: Bundle) {
  const locale = bundle.manifest.defaultLocale
  return Object.fromEntries(
    Object.entries(bundle.records).map(([collection, byLocale]) => [
      collection,
      (byLocale[locale] || []).map((doc) => {
        // Short top-level values: the destination matches on its own title field.
        const key: Doc = { id: doc.id }
        for (const [k, v] of Object.entries(doc))
          if (typeof v === 'number' || (typeof v === 'string' && v.length <= 300)) key[k] = v
        return key
      }),
    ]),
  )
}

export async function plan(bundle: Bundle, exec: Exec): Promise<Plan> {
  const result = await exec({ op: 'plan', manifest: bundle.manifest, keys: planKeys(bundle) })
  if (result.error) throw new Error(result.error)
  return result as Plan
}

export async function runImport(
  bundle: Bundle,
  planned: Plan,
  exec: Exec,
  options: ImportOptions,
  progress: Progress = () => {},
): Promise<ImportReport> {
  const report: ImportReport = {
    created: {},
    updated: {},
    reusedFiles: 0,
    repairedFiles: 0,
    kept: 0,
    errors: [],
    unresolved: [],
    unknown: [],
    removed: [],
    warnings: [...planned.warnings],
  }
  const locale = bundle.manifest.defaultLocale
  const source = bundle.manifest.sourceId
  const otherLocales = bundle.manifest.locales.filter((l) => l !== locale)
  const idMap: IDMap = JSON.parse(JSON.stringify(planned.matches))
  const docs = (collection: string) => bundle.records[collection]?.[locale] || []
  const collections = planned.order.filter((c) => bundle.records[c])
  const globals = options.globals ? Object.keys(bundle.globals) : []
  const total =
    collections.reduce((n, c) => n + docs(c).length, 0) * (2 + otherLocales.length) +
    globals.length * bundle.manifest.locales.length +
    planned.ordered.length +
    1
  let done = 0
  const step = (label: string) => progress(++done, total, label)
  const label = (collection: string, doc: Doc) =>
    `${collection} “${String(doc.title || doc.name || doc.slug || doc.filename || doc.id)}”`
  const fail = (what: string, error: unknown) =>
    report.errors.push(`${what}: ${error instanceof Error ? error.message : String(error)}`)
  const run = async (what: string, op: Operation) => {
    try {
      const result = await exec(op)
      if (result.error) throw new Error(result.error)
      return result
    } catch (error) {
      fail(what, error)
      return null
    }
  }
  const map = (collection: string, source: number | string, target: number | string) =>
    ((idMap[collection] ||= {})[String(source)] = target)

  // 1. Files and records, creating what is new. References to records not created yet are
  //    left out for now and filled in by step 2.
  const incomplete: [string, Doc][] = []
  const update = options.updateExisting !== false
  const kept = new Set<string>()
  for (const collection of collections) {
    for (const doc of docs(collection)) {
      const existing = idMap[collection]?.[String(doc.id)]
      const what = label(collection, doc)
      let result: OpResult | null
      const repair =
        existing !== undefined &&
        Boolean(planned.missingFiles?.[collection]?.includes(String(doc.id)))
      if (planned.uploads.includes(collection) && (existing === undefined || repair)) {
        const file = bundle.files[fileKey(collection, doc.id)]
        if (!file) {
          fail(what, new Error('its file is missing from the bundle'))
          step(what)
          continue
        }
        if (planned.maxFileBytes && file.data.byteLength > planned.maxFileBytes) {
          fail(
            what,
            new Error(
              `the file is ${(file.data.byteLength / 1e6).toFixed(1)} MB; the limit is ${(planned.maxFileBytes / 1e6).toFixed(1)} MB. Make it smaller and export again.`,
            ),
          )
          step(what)
          continue
        }
        result = await run(what, {
          op: 'file',
          collection,
          record: doc,
          file,
          source,
          targetId: repair ? existing : null,
        })
        if (result?.id !== undefined) {
          if (repair) report.repairedFiles++
          else report.created[collection] = (report.created[collection] || 0) + 1
        }
      } else if (existing !== undefined && !update) {
        kept.add(`${collection}/${doc.id}`)
        report.kept++
        result = { id: existing }
      } else {
        result = await run(what, {
          op: 'record',
          collection,
          record: doc,
          targetId: existing ?? null,
          idMap,
          source,
        })
        if (result?.id !== undefined) {
          const bucket = existing === undefined ? report.created : report.updated
          if (planned.uploads.includes(collection) && existing !== undefined) report.reusedFiles++
          else bucket[collection] = (bucket[collection] || 0) + 1
        }
      }
      if (result?.id !== undefined) {
        map(collection, doc.id, result.id)
        if (result.unresolved?.length) incomplete.push([collection, doc])
        report.unknown.push(...(result.unknown || []))
      }
      step(what)
    }
  }
  // 2. Fill in references now that every record exists.
  const final = new Map<string, OpResult>()
  for (const [collection, doc] of incomplete) {
    const what = label(collection, doc)
    const result = await run(what, {
      op: 'record',
      collection,
      record: doc,
      targetId: idMap[collection][String(doc.id)],
      idMap,
    })
    if (result) final.set(`${collection}/${doc.id}`, result)
  }
  done += collections.reduce((n, c) => n + docs(c).length, 0) - incomplete.length
  incomplete.forEach(() => step('Linking records'))
  // 3. Other languages.
  for (const other of otherLocales)
    for (const collection of collections)
      for (const translated of bundle.records[collection]?.[other] || []) {
        const target = idMap[collection]?.[String(translated.id)]
        const what = `${label(collection, translated)} (${other})`
        if (target !== undefined && !kept.has(`${collection}/${translated.id}`))
          await run(what, {
            op: 'record',
            collection,
            record: translated,
            targetId: target,
            idMap,
            locale: other,
          })
        step(what)
      }
  // 4. Site-wide settings, navigation, theme and search strategy.
  for (const slug of globals)
    for (const l of bundle.manifest.locales) {
      const data = bundle.globals[slug][l]
      if (data) {
        const result = await run(`${slug} (${l})`, {
          op: 'global',
          slug,
          data,
          idMap,
          locale: l,
        })
        if (result?.unresolved?.length && l === locale) report.unresolved.push(...result.unresolved)
        if (result?.unknown?.length && l === locale) report.unknown.push(...result.unknown)
      }
      step(slug)
    }
  // 5. The bundle's custom order (left alone when existing records are kept as they are).
  for (const collection of update ? planned.ordered : []) {
    const ids = docs(collection)
      .map((doc) => idMap[collection]?.[String(doc.id)])
      .filter((id): id is number | string => id !== undefined)
    if (ids.length) {
      const prepared = await run(`${collection} order`, { op: 'order', collection, ids })
      const keys = prepared?.keys || []
      const items = ids.map((id, i) => ({ id, key: keys[i] })).filter((item) => item.key)
      for (let i = 0; i < items.length; i += 5)
        await run(`${collection} order`, {
          op: 'setOrder',
          collection,
          items: items.slice(i, i + 5),
        })
    }
    step(`${collection} order`)
  }
  // 6. Optionally remove example records the bundle didn't replace.
  if (options.removeDemo) {
    const result = await run('Removing demo content', { op: 'removeDemo', keep: idMap })
    report.removed.push(...(result?.removed || []))
    for (const f of result?.failed || []) report.errors.push(f)
  }
  step('Finished')
  // References still missing after step 2 point at records the bundle doesn't contain.
  for (const [, result] of final) {
    report.unresolved.push(...(result.unresolved || []))
    report.unknown.push(...(result.unknown || []))
  }
  report.unresolved = [...new Set(report.unresolved)]
  report.unknown = [...new Set(report.unknown)]
  return report
}
