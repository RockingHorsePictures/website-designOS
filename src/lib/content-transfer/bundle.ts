import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'

// A content bundle: everything a site's editors created, in one zip, for moving content between
// databases (for example from the database a site was designed in to its live site).
//
//   manifest.json                       format, Design OS version, locales, counts
//   records/<collection>.json           { "<locale>": [documents…] }
//   globals/<slug>.json                 { "<locale>": data }
//   files/<collection>/<id>/<filename>  the original uploaded file for that record
//
// Works in Node (export, tests) and the browser (import).

export const bundleFormat = 'designos-content'
export const bundleVersion = 1

export type Doc = Record<string, unknown> & { id: number | string }
export type Manifest = {
  format: typeof bundleFormat
  version: number
  designos: string
  exportedAt: string
  source: string
  // Stable per source database, so re-imports update the records an earlier import created.
  sourceId?: string
  defaultLocale: string
  locales: string[]
  collections: Record<string, number>
  globals: string[]
  skippedDemo: Record<string, string[]>
}
export type BundleFile = { name: string; data: Uint8Array }
export type Bundle = {
  manifest: Manifest
  records: Record<string, Record<string, Doc[]>>
  globals: Record<string, Record<string, Record<string, unknown>>>
  files: Record<string, BundleFile>
}
export const fileKey = (collection: string, id: number | string) => `${collection}/${id}`

export function writeBundle(bundle: Bundle): Uint8Array {
  const zip: Zippable = {
    'manifest.json': strToU8(JSON.stringify(bundle.manifest, null, 2)),
  }
  for (const [collection, byLocale] of Object.entries(bundle.records))
    zip[`records/${collection}.json`] = strToU8(JSON.stringify(byLocale))
  for (const [slug, byLocale] of Object.entries(bundle.globals))
    zip[`globals/${slug}.json`] = strToU8(JSON.stringify(byLocale))
  // Images are already compressed: store them as they are.
  for (const [key, file] of Object.entries(bundle.files))
    zip[`files/${key}/${file.name}`] = [file.data, { level: 0 }]
  return zipSync(zip, { level: 6 })
}

export function readBundle(bytes: Uint8Array): Bundle {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch {
    throw new Error('This file is not a content bundle (it is not a valid zip file).')
  }
  const json = (name: string) => JSON.parse(strFromU8(entries[name]))
  if (!entries['manifest.json']) throw new Error('This zip file is not a Design OS content bundle.')
  const manifest = json('manifest.json') as Manifest
  if (manifest.format !== bundleFormat)
    throw new Error('This zip file is not a Design OS content bundle.')
  if (manifest.version > bundleVersion)
    throw new Error('This bundle was made by a newer Design OS. Update this site first.')
  const bundle: Bundle = { manifest, records: {}, globals: {}, files: {} }
  for (const [path, data] of Object.entries(entries)) {
    const record = /^records\/([^/]+)\.json$/.exec(path)
    const global = /^globals\/([^/]+)\.json$/.exec(path)
    const file = /^files\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(path)
    if (record) bundle.records[record[1]] = json(path)
    else if (global) bundle.globals[global[1]] = json(path)
    else if (file) bundle.files[fileKey(file[1], file[2])] = { name: file[3], data }
  }
  return bundle
}
