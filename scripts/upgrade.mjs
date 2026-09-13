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

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
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
export function upgrade(args = process.argv.slice(2), root = process.cwd()) {
  const tag = args.find((arg) => !arg.startsWith('--'))
  if (!/^v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(tag || ''))
    throw new Error('Choose an explicit release: npm run upgrade -- v0.2.1 [--apply]')
  const installationPath = path.join(root, 'designos-installation.json')
  if (!existsSync(installationPath))
    throw new Error(
      'This is not an exported Design OS website. Create a baseline from its original release before upgrading.',
    )
  const installation = JSON.parse(readFileSync(installationPath, 'utf8'))
  const git = (...argv) =>
    execFileSync('git', argv, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  if (git('status', '--porcelain').trim())
    throw new Error('Commit or stash local changes before preparing an upgrade.')
  const temp = mkdtempSync(path.join(os.tmpdir(), 'designos-upgrade-'))
  const source = path.join(temp, 'source')
  const nextRoot = path.join(temp, 'next')
  execFileSync(
    'git',
    [
      'clone',
      '--depth',
      '1',
      '--branch',
      tag,
      'https://github.com/RockingHorsePictures/website-designOS.git',
      source,
    ],
    { stdio: 'pipe' },
  )
  execFileSync(process.execPath, [path.join(source, 'scripts/export-starter.mjs'), nextRoot], {
    stdio: 'pipe',
  })
  const nextInstallation = JSON.parse(
    readFileSync(path.join(nextRoot, 'designos-installation.json'), 'utf8'),
  )
  const current = {}
  for (const name of new Set([
    ...Object.keys(installation.files),
    ...Object.keys(nextInstallation.files),
  ])) {
    const filename = safePath(root, name)
    if (existsSync(filename)) current[name] = hash(readFileSync(filename))
  }
  const plan = planUpgrade(installation.files, current, nextInstallation.files)
  mkdirSync(path.join(root, '.designos'), { recursive: true })
  writeFileSync(
    path.join(root, '.designos/upgrade-review.json'),
    JSON.stringify({ from: installation.version, to: tag, ...plan }, null, 2),
  )
  if (plan.conflicts.length)
    throw new Error(
      `Upgrade stopped: ${plan.conflicts.length} customised files also changed upstream. Review .designos/upgrade-review.json; no website files were changed.`,
    )
  if (!args.includes('--apply')) {
    console.log(
      `Plan ready: ${plan.changes.length} changes, no conflicts. Review .designos/upgrade-review.json. Run again with --apply to prepare an upgrade branch.`,
    )
    return plan
  }
  const branch = `upgrade/design-os-${tag}`
  git('switch', '-c', branch)
  for (const change of plan.changes) {
    const destination = safePath(root, change.path)
    if (change.action === 'remove') unlinkSync(destination)
    else {
      mkdirSync(path.dirname(destination), { recursive: true })
      writeFileSync(destination, readFileSync(safePath(nextRoot, change.path)))
    }
  }
  writeFileSync(
    installationPath,
    JSON.stringify({ ...nextInstallation, installedAt: installation.installedAt }, null, 2) + '\n',
  )
  console.log(
    `Prepared ${branch}. Nothing has been deployed or migrated. Install dependencies, run checks against a disposable database, review a code Preview, back up Production, and apply reviewed migrations before releasing. Your previous branch remains available.`,
  )
  return plan
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) upgrade()
