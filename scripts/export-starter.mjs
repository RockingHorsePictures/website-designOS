import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (!process.argv[2])
  throw new Error(
    'Provide a new destination folder: npm run starter:export -- .local/new-site-starter',
  )
const destination = path.resolve(process.argv[2])
if (existsSync(destination))
  throw new Error(
    'Destination already exists. Choose a new empty location; existing files will not be overwritten.',
  )
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 20 * 1024 * 1024 })
const revision = git('rev-parse', 'HEAD').toString().trim()
if (git('status', '--porcelain', '--untracked-files=no').toString().trim()) {
  throw new Error(
    'Commit the reviewed foundation changes before exporting. The starter uses committed files only.',
  )
}
const files = git('ls-tree', '-r', '--name-only', '-z', 'HEAD')
  .toString()
  .split('\0')
  .filter(Boolean)
const roots = new Set(['src', 'scripts', 'tests', 'public', '.github', 'installer'])
const allowedRoot = new Set([
  'AGENTS.md',
  'LICENSE',
  'designos-release.json',
  'CLAUDE.md',
  'START_HERE.md',
  'NEW_SITE.md',
  'README.md',
  'AI_SITE_CONTRACT.md',
  'DESIGN_HANDOFF.md',
  'ARCHITECTURE.md',
  'EDITOR_GUIDE.md',
  'OPERATIONS.md',
  'COMPANY_WEBSITE_BUILD_SPEC_V5.md',
  'package.json',
  'package-lock.json',
  'payload.config.ts',
  'next.config.mjs',
  'next-env.d.ts',
  'tsconfig.json',
  'eslint.config.mjs',
  'playwright.config.ts',
  'vitest.config.ts',
  'vercel.json',
  '.gitignore',
  '.vercelignore',
  '.env.example',
  '.prettierrc.json',
  '.prettierignore',
])
let count = 0
for (const name of files) {
  if (
    (!roots.has(name.split('/')[0]) && !allowedRoot.has(name)) ||
    name
      .split('/')
      .some(
        (p) =>
          p === '..' ||
          ['.local', '.vercel', '.git', 'node_modules', 'media', 'font-files'].includes(p) ||
          (p.startsWith('.env') && name !== '.env.example'),
      ) ||
    /\.(pem|key|log)$/i.test(name)
  )
    continue
  const target = path.resolve(destination, name)
  if (!target.startsWith(destination + path.sep)) throw new Error('Invalid source path')
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, git('show', `HEAD:${name}`))
  count++
}
writeFileSync(
  path.join(destination, 'site-workspace.json'),
  JSON.stringify({ repositoryUrl: '', foundationBranch: '' }, null, 2) + '\n',
)
writeFileSync(
  path.join(destination, 'IMPLEMENTATION_STATUS.md'),
  `# Fresh Design OS starter\n\nExported from foundation revision ${revision}. This site has no configured repository, deployment, database, media store or credentials. Read START_HERE.md and NEW_SITE.md. Verify this site's setup independently; source project verification is not proof of a new environment. Visual design has not begun.\n`,
)
for (const name of ['README.md', 'DESIGN_HANDOFF.md', 'AI_SITE_CONTRACT.md', 'START_HERE.md']) {
  const target = path.join(destination, name)
  const text = readFileSync(target, 'utf8')
    .replace(
      /^Verified hosted Preview:.*(?:\r?\n)/m,
      'This is a fresh starter. Configure and verify its own development and Preview environments.\n',
    )
    .replace(
      /Until the foundation PR is merged, start from foundation\/design-os, not main\./g,
      'Start from the branch recorded in site-workspace.json.',
    )
    .replace(
      /Use the existing repository and start a design branch from `foundation\/design-os` until PR #1 is reviewed and merged\. The main branch does not yet contain the foundation\./g,
      'Use this new repository and start a design branch from its completed foundation. Set site-workspace.json to the correct repository and branch.',
    )
    .replace(
      /Until the original foundation PR is merged, `foundation\/design-os` contains the app and `main` does not\./g,
      'Set the workspace branch to the branch containing this site’s foundation.',
    )
    .replace(
      /This project's approved static bootstrap has no public alias or app credentials; the actual application is on Preview\./g,
      'A new Vercel project may need a credential-free bootstrap before Preview; inspect its initial deployment behaviour during setup.',
    )
    .replace(
      /The protected Preview, hosted editing and media persistence after redeploy have been verified\./g,
      'Verify the new Preview, hosted editing and media persistence after redeploy.',
    )
  writeFileSync(target, text)
}

// Only template-owned files participate in upgrades. Site identity and operational records stay local.
const managed = {}
const excluded = new Set(['site-workspace.json', 'IMPLEMENTATION_STATUS.md'])
for (const name of files) {
  if (excluded.has(name)) continue
  const filename = path.join(destination, name)
  if (existsSync(filename))
    managed[name] = createHash('sha256').update(readFileSync(filename)).digest('hex')
}
const release = JSON.parse(readFileSync(path.join(destination, 'designos-release.json'), 'utf8'))
writeFileSync(
  path.join(destination, 'designos-installation.json'),
  JSON.stringify(
    {
      version: release.version,
      sourceCommit: revision,
      installedAt: new Date().toISOString(),
      files: managed,
    },
    null,
    2,
  ) + '\n',
)
console.log(
  `Exported ${count} committed foundation files to ${destination}. No existing site credentials, uploads or deployment links were copied. Open START_HERE.md in the new project.`,
)
