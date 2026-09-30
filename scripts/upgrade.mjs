import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  unlinkSync,
  lstatSync,
} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

export const hash = (bytes, name = '') =>
  createHash('sha256')
    .update(
      /\.(?:ts|tsx|js|mjs|cjs|json|md|css|html|yml|yaml|svg|txt)$/.test(name) ||
        /(?:^|\/)(?:\.(?:gitignore|vercelignore|prettierignore|env\.example|npmrc)|LICENSE)$/.test(
          name,
        )
        ? bytes.toString('utf8').replaceAll('\r\n', '\n')
        : bytes,
    )
    .digest('hex')
export function planUpgrade(baseline, current, next) {
  const changes = []
  const conflicts = []
  for (const name of new Set([...Object.keys(baseline), ...Object.keys(next)])) {
    if (next[name] === baseline[name]) continue
    if (current[name] !== baseline[name] && current[name] !== next[name]) conflicts.push(name)
    else if (current[name] !== next[name])
      changes.push({ path: name, action: next[name] === undefined ? 'remove' : 'write' })
  }
  return { changes, conflicts }
}
function safePath(root, name) {
  if (
    name
      .split(/[\\/]/)
      .some((part) =>
        ['..', '.git', '.env', '.designos', 'media', 'font-files', 'node_modules'].includes(part),
      ) ||
    path.isAbsolute(name)
  )
    throw new Error('Unsafe managed path')
  const resolved = path.resolve(root, name)
  if (!resolved.startsWith(root + path.sep)) throw new Error('Path leaves the site directory')
  let cursor = root
  for (const part of path.relative(root, resolved).split(path.sep)) {
    cursor = path.join(cursor, part)
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink())
      throw new Error('Managed paths must not traverse symlinks.')
  }
  return resolved
}
const UPSTREAM = 'https://github.com/RockingHorsePictures/website-designOS.git'
const git = (root, ...argv) =>
  execFileSync('git', argv, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
async function latestTag() {
  const res = await fetch(
    'https://api.github.com/repos/RockingHorsePictures/website-designOS/releases/latest',
    { headers: { Accept: 'application/vnd.github+json' } },
  )
  const body = await res.json()
  if (!res.ok || !body.tag_name) throw new Error('Could not find the latest Design OS release.')
  return body.tag_name
}
// Files and hashes of an upstream release, exactly as a new site would receive them.
function releaseFiles(tag, temp) {
  const source = path.join(temp, `source-${tag}`)
  const out = path.join(temp, `export-${tag}`)
  execFileSync('git', ['clone', '--depth', '1', '--branch', tag, UPSTREAM, source], {
    stdio: 'pipe',
  })
  execFileSync(process.execPath, [path.join(source, 'scripts/export-starter.mjs'), out], {
    stdio: 'pipe',
  })
  return {
    root: out,
    installation: JSON.parse(readFileSync(path.join(out, 'designos-installation.json'), 'utf8')),
  }
}
function pullRequestBody(from, to, plan) {
  return [
    `Design OS **${to}** is available (this site is on ${from}).`,
    '',
    'Vercel builds a Preview of this pull request against a separate database branch. Check the Preview, then **merge** to update the live site; the database is migrated during the production deployment.',
    '',
    `- ${plan.changes.length} file(s) updated without touching your customisations.`,
    plan.conflicts.length
      ? `- ⚠️ ${plan.conflicts.length} file(s) were customised on this site **and** changed upstream. Your version is kept; the new upstream version is saved beside it as \`<file>.designos-upstream\`. Ask Claude Code to "merge the Design OS update conflicts", or merge them by hand, then delete the \`.designos-upstream\` files:\n${plan.conflicts.map((c) => `  - \`${c}\``).join('\n')}`
      : '- No conflicts.',
    '',
    `Release notes: https://github.com/RockingHorsePictures/website-designOS/releases/tag/${to}`,
  ].join('\n')
}

export async function upgrade(args = process.argv.slice(2), root = process.cwd()) {
  let tag = args.find((arg) => !arg.startsWith('--'))
  if (tag === 'latest' || !tag) tag = await latestTag()
  if (!/^v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(tag || ''))
    throw new Error('Choose a release: npm run upgrade -- latest | vX.Y.Z [--apply | --pr]')
  const pr = args.includes('--pr')
  if (git(root, 'status', '--porcelain').trim())
    throw new Error('Commit or stash local changes before preparing an upgrade.')
  const temp = mkdtempSync(path.join(os.tmpdir(), 'designos-upgrade-'))
  const installationPath = path.join(root, 'designos-installation.json')
  const release = JSON.parse(readFileSync(path.join(root, 'designos-release.json'), 'utf8'))
  // Sites made with the guided installer record their baseline; Deploy Button sites start from
  // the published release matching their version.
  const installation = existsSync(installationPath)
    ? JSON.parse(readFileSync(installationPath, 'utf8'))
    : releaseFiles(`v${release.version}`, temp).installation
  if (`v${installation.version}` === tag) {
    console.log(`Already on ${tag}. Nothing to do.`)
    return { changes: [], conflicts: [] }
  }
  const next = releaseFiles(tag, temp)
  const nextRoot = next.root
  const nextInstallation = next.installation
  const current = {}
  for (const name of new Set([
    ...Object.keys(installation.files),
    ...Object.keys(nextInstallation.files),
  ])) {
    const filename = safePath(root, name)
    if (existsSync(filename)) current[name] = hash(readFileSync(filename), name)
  }
  const plan = planUpgrade(installation.files, current, nextInstallation.files)
  mkdirSync(path.join(root, '.designos'), { recursive: true })
  writeFileSync(
    path.join(root, '.designos/upgrade-review.json'),
    JSON.stringify({ from: installation.version, to: tag, ...plan }, null, 2),
  )
  if (plan.conflicts.length && !pr)
    throw new Error(
      `Upgrade stopped: ${plan.conflicts.length} customised files also changed upstream. Review .designos/upgrade-review.json; no website files were changed. (--pr keeps both versions for review.)`,
    )
  if (!args.includes('--apply') && !pr) {
    console.log(
      `Plan ready: ${plan.changes.length} changes, no conflicts. Review .designos/upgrade-review.json. Run again with --apply to prepare an upgrade branch.`,
    )
    return plan
  }
  const branch = pr ? `designos/update-${tag}` : `upgrade/design-os-${tag}`
  if (pr) {
    const remote = git(root, 'ls-remote', '--heads', 'origin', branch).trim()
    if (remote) {
      console.log(`An update branch for ${tag} already exists. Nothing to do.`)
      return plan
    }
  }
  git(root, 'switch', '-c', branch)
  for (const change of plan.changes) {
    const destination = safePath(root, change.path)
    if (change.action === 'remove') unlinkSync(destination)
    else {
      mkdirSync(path.dirname(destination), { recursive: true })
      writeFileSync(destination, readFileSync(safePath(nextRoot, change.path)))
    }
  }
  for (const conflict of plan.conflicts) {
    const upstream = safePath(nextRoot, conflict)
    if (existsSync(upstream))
      writeFileSync(`${safePath(root, conflict)}.designos-upstream`, readFileSync(upstream))
  }
  writeFileSync(
    installationPath,
    JSON.stringify(
      { ...nextInstallation, installedAt: installation.installedAt || new Date().toISOString() },
      null,
      2,
    ) + '\n',
  )
  if (!pr) {
    console.log(
      `Prepared ${branch}. Nothing has been deployed or migrated. Install dependencies, run checks against a disposable database, review a code Preview, back up Production, and apply reviewed migrations before releasing. Your previous branch remains available.`,
    )
    return plan
  }
  git(root, 'add', '-A')
  git(root, 'commit', '-m', `Update Design OS to ${tag}`)
  git(root, 'push', '-u', 'origin', branch)
  const title = `Update Design OS to ${tag}${plan.conflicts.length ? ' (needs review)' : ''}`
  try {
    execFileSync(
      'gh',
      [
        'pr',
        'create',
        '--title',
        title,
        '--body',
        pullRequestBody(installation.version, tag, plan),
        '--head',
        branch,
      ],
      {
        cwd: root,
        stdio: 'pipe',
      },
    )
    console.log(`Opened a pull request: ${title}`)
  } catch {
    console.log(
      `Pushed ${branch}. Open a pull request from it in GitHub (allow GitHub Actions to create pull requests in Settings → Actions to automate this).`,
    )
  }
  return plan
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  upgrade().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
