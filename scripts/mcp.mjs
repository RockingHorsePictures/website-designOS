#!/usr/bin/env node
// Design OS MCP server (stdio). Exposes this website's CMS bridge, section registry, site health
// and audit crawler as tools for Claude Code, Claude Desktop/Cowork and other MCP clients.
// Every CMS operation runs through scripts/ai.mjs, so the restricted AI accounts, lock hooks and
// read-only Production rules apply unchanged. Credentials never enter tool results.
// Register: see docs/AI_TOOLKIT.md (`.mcp.json` is included for Claude Code).
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const tsx = path.join(root, 'node_modules/tsx/dist/cli.mjs')
const LIMIT = 150_000

function run(args, timeout = 180_000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, env: process.env })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), timeout)
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.replace(/npm notice.*\n?/g, '').trim(),
      })
    })
  })
}
const clip = (text) =>
  text.length > LIMIT
    ? `${text.slice(0, LIMIT)}\n… [truncated ${text.length - LIMIT} characters; narrow the request or read the saved file]`
    : text
async function bridge(command, environment, request) {
  let file
  if (request) {
    mkdirSync('.designos/tmp', { recursive: true })
    file = `.designos/tmp/request-${randomBytes(6).toString('hex')}.json`
    writeFileSync(file, JSON.stringify(request), { mode: 0o600 })
  }
  try {
    const args = [
      'scripts/ai.mjs',
      command,
      ...(environment ? [environment] : []),
      ...(file ? [file] : []),
    ]
    const r = await run(args)
    if (r.code !== 0) throw new Error(r.stderr || r.stdout || 'The CMS bridge failed.')
    return r.stdout
  } finally {
    if (file) rmSync(file, { force: true })
  }
}
const target = {
  collection: {
    type: 'string',
    description:
      'Collection slug, e.g. pages, case-studies, services, team-members, clients, media, approved-facts, redirects.',
  },
  global: {
    type: 'string',
    description: 'Global slug: site-settings, theme, navigation or search-profile.',
  },
}
const env = (writable) => ({
  type: 'string',
  enum: writable ? ['preview', 'local'] : ['production', 'preview', 'local'],
  description: writable
    ? 'Where to write: preview (code-preview CMS) or local (development database). Production is read-only for AI.'
    : 'Which CMS: production (authoritative approvals, read-only), preview or local.',
})

const tools = [
  {
    name: 'designos_check',
    description:
      'Check which CMS environments this website folder can reach and the AI account scope for each. Run first.',
    inputSchema: { type: 'object', properties: {} },
    call: async () => bridge('check'),
  },
  {
    name: 'designos_context',
    description:
      'Refresh .designos/ai-context.json with current content, field approval states (default/approved/locked) and editable fields for every reachable environment, and return a summary. Locked fields must never be changed or bypassed; Production approvals are authoritative.',
    inputSchema: {
      type: 'object',
      properties: {
        full: {
          type: 'boolean',
          description: 'Return the full JSON (large) instead of a summary.',
        },
      },
    },
    call: async ({ full }) => {
      await bridge('context')
      const context = JSON.parse(readFileSync('.designos/ai-context.json', 'utf8'))
      if (full) return JSON.stringify(context, null, 2)
      const summary = Object.fromEntries(
        Object.entries(context).map(([name, value]) => [
          name,
          {
            globals: value.globals.map((g) => ({
              slug: g.slug,
              locked: Object.entries(g.document?.protection || {})
                .filter(([, p]) => p.state === 'locked')
                .map(([k]) => k),
              approved: Object.entries(g.document?.protection || {})
                .filter(([, p]) => p.state === 'approved')
                .map(([k]) => k),
            })),
            collections: value.collections.map((c) => ({
              slug: c.slug,
              total: c.total,
              truncated: c.truncated,
              records: c.documents.map((d) => ({
                id: d.id,
                title: d.title || d.name || d.statement || d.filename || d.from,
                slug: d.slug,
                locked: Object.entries(d.protection || {})
                  .filter(([, p]) => p.state === 'locked')
                  .map(([k]) => k),
              })),
            })),
          },
        ]),
      )
      return JSON.stringify({ file: '.designos/ai-context.json', summary }, null, 2)
    },
  },
  {
    name: 'cms_read',
    description:
      'Read CMS content as the restricted AI account. Collections return drafts (the editable workspace); use where/page for queries (100 per page).',
    inputSchema: {
      type: 'object',
      properties: {
        environment: env(false),
        ...target,
        locale: {
          type: 'string',
          description: 'Language code for translated content, e.g. fr. Omit for the main language.',
        },
        id: { type: ['number', 'string'] },
        where: {
          type: 'object',
          description: 'Payload where query, e.g. {"slug":{"equals":"about"}}',
        },
        page: { type: 'number' },
      },
      required: ['environment'],
    },
    call: async ({ environment, ...request }) =>
      bridge('request', environment, { action: 'read', ...request }),
  },
  {
    name: 'cms_write',
    description:
      'Create or update CMS content (saved as a workspace draft). Locked fields are rejected; AI accounts cannot approve, delete or publish. A person reviews, saves a site Preview and publishes. Validate page compositions with validate_composition first.',
    inputSchema: {
      type: 'object',
      properties: {
        environment: env(true),
        action: { type: 'string', enum: ['create', 'update'] },
        ...target,
        locale: {
          type: 'string',
          description: 'Language code to write a translation, e.g. fr. Omit for the main language.',
        },
        id: { type: ['number', 'string'], description: 'Required for collection updates.' },
        data: { type: 'object' },
      },
      required: ['environment', 'action', 'data'],
    },
    call: async ({ environment, ...request }) => bridge('request', environment, request),
  },
  {
    name: 'cms_upload_image',
    description:
      'Upload an image file from inside this website folder into the media library with its description (alt text).',
    inputSchema: {
      type: 'object',
      properties: {
        environment: env(true),
        file: { type: 'string', description: 'Path relative to the website folder.' },
        alt: { type: 'string', description: 'What the image shows, for people who cannot see it.' },
        decorative: { type: 'boolean' },
        caption: { type: 'string' },
      },
      required: ['environment', 'file'],
    },
    call: async ({ environment, file, alt = '', decorative = false, caption }) =>
      bridge('request', environment, {
        action: 'upload',
        collection: 'media',
        file,
        data: { alt, decorative, ...(caption ? { caption } : {}) },
      }),
  },
  {
    name: 'list_sections',
    description:
      'The page section library: every section type with its label, purpose, default props and JSON schema. Use it to compose pages (Pages.composition = {root:{props:{}},content:[{type,props:{id,...}}]}). Bespoke site sections appear here once registered.',
    inputSchema: { type: 'object', properties: {} },
    call: async () => {
      const r = await run([tsx, 'scripts/sections.ts', 'catalog'])
      if (r.code) throw new Error(r.stderr)
      return r.stdout
    },
  },
  {
    name: 'validate_composition',
    description:
      'Validate a page composition against the section schemas and run content checks (links, alt text, evidence, empty sections) before saving it.',
    inputSchema: {
      type: 'object',
      properties: { composition: { type: 'object' } },
      required: ['composition'],
    },
    call: async ({ composition }) => {
      mkdirSync('.designos/tmp', { recursive: true })
      const file = `.designos/tmp/composition-${randomBytes(6).toString('hex')}.json`
      writeFileSync(file, JSON.stringify(composition))
      try {
        const r = await run([tsx, 'scripts/sections.ts', 'validate', file])
        return r.stdout || r.stderr
      } finally {
        rmSync(file, { force: true })
      }
    },
  },
  {
    name: 'site_health',
    description:
      'Whole-site CMS checks on the editable workspace: broken internal links, orphan pages, duplicate titles/descriptions, missing alt text, unsupported claims, missing brand/contact details. Returns findings with admin links.',
    inputSchema: {
      type: 'object',
      properties: { environment: env(false) },
      required: ['environment'],
    },
    call: async ({ environment }) => bridge('health', environment),
  },
  {
    name: 'audit_site',
    description:
      'Crawl a deployed or local URL of this site and measure SEO, AEO (answer engines), GEO (generative engines), structured data, accessibility, crawler policy (search/answer/training bots), sitemap and llms.txt. Writes report.md and report.json under .designos/audits and returns the Markdown report. Non-production sites are noindex, so launch-only checks are skipped there.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Origin to crawl, e.g. http://localhost:3000 or the Production URL.',
        },
        maxPages: { type: 'number', description: 'Default 200.' },
      },
    },
    call: async ({ url, maxPages = 200 }) => {
      const r = await run(
        [tsx, 'scripts/audit.ts', ...(url ? [url] : []), '--max', String(maxPages), '--json'],
        900_000,
      )
      if (r.code) throw new Error(r.stderr || r.stdout)
      const { dir } = JSON.parse(r.stdout.split('\n').pop())
      const report = readFileSync(path.join(dir, 'report.md'), 'utf8')
      return `${report}\nFull data: ${path.join(dir, 'report.json')}`
    },
  },
]

const send = (message) => process.stdout.write(JSON.stringify(message) + '\n')
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version
createInterface({ input: process.stdin }).on('line', async (line) => {
  if (!line.trim()) return
  let message
  try {
    message = JSON.parse(line)
  } catch {
    return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
  }
  const { id, method, params = {} } = message
  if (id === undefined) return // notifications (initialized, cancelled) need no reply
  const reply = (result) => send({ jsonrpc: '2.0', id, result })
  const fail = (code, text) => send({ jsonrpc: '2.0', id, error: { code, message: text } })
  if (method === 'initialize')
    return reply({
      protocolVersion: params.protocolVersion || '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'design-os', version },
      instructions:
        'Design OS website tools. Start with designos_check and designos_context. Never change locked fields; AI cannot approve, delete or publish. Read AI_SITE_CONTRACT.md in this folder before building. Facts must come from approved records or the owner.',
    })
  if (method === 'ping') return reply({})
  if (method === 'tools/list')
    return reply({
      tools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    })
  if (method === 'tools/call') {
    const tool = tools.find((t) => t.name === params.name)
    if (!tool) return fail(-32602, `Unknown tool: ${params.name}`)
    try {
      const text = await tool.call(params.arguments || {})
      return reply({ content: [{ type: 'text', text: clip(String(text)) }] })
    } catch (error) {
      return reply({
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      })
    }
  }
  return fail(-32601, `Method not found: ${method}`)
})
if (!existsSync(path.join(root, 'node_modules')))
  process.stderr.write('Run npm ci in this website folder first.\n')
