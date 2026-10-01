import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawnSync } from 'node:child_process'
import { applyHostedDefaults } from '../src/lib/env-defaults.mjs'
import { connectLive, hasLive, liveCall } from './ai-live.mjs'

// CMS bridge for AI coding tools.
//   live       → the live website over HTTPS, with a key the owner approved
//                (npm run ai:connect -- live https://your-site.com). Reads the workspace; saves
//                drafts only while the owner allows AI edits. Recommended for hosted sites.
// Database profiles (sites made with the guided installer), from this site's private env files:
//   production → .env.production.local (read-only AI account)
//   preview    → .env.preview.local    (AI contributor: unlocked edits, no approval/publishing)
//   local      → .env                  (local development database, labelled SITE_ENV=local)
const [command = 'check', target, ...args] = process.argv.slice(2)
const commands = ['connect', 'check', 'context', 'request', 'health']
if (!commands.includes(command)) {
  console.error(
    'Use ai:connect [-- live <site>], ai:check, ai:context, ai:health [environment], or ai:request -- <environment> request.json',
  )
  process.exit(1)
}
if (command === 'connect' && target === 'live') {
  try {
    await connectLive(args[0])
    process.exit(0)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
const files = { production: '.env.production.local', preview: '.env.preview.local', local: '.env' }
const all = {}
for (const [environment, file] of Object.entries(files)) {
  if (!existsSync(file)) continue
  // Files pulled with `vercel env pull` carry VERCEL_ENV; derive the same labels and secrets the
  // deployment uses.
  const values = applyHostedDefaults({ ...parseEnv(readFileSync(file, 'utf8')) })
  // A plain .env belongs to the local profile only when it is explicitly labelled local.
  if (environment === 'local' && values.SITE_ENV !== 'local') continue
  if (values.SITE_ENV !== environment || values.DATABASE_ENV !== environment) {
    console.error(
      `The ${environment} environment is incorrectly labelled. Repair its site configuration before connecting.`,
    )
    process.exit(1)
  }
  all[environment] = values
}
const live = hasLive() && command !== 'connect'
if (!Object.keys(all).length && !live) {
  console.error(
    'No CMS connection found. For the live site run: npm run ai:connect -- live https://your-site.com (the owner approves it in the admin). For local development create .env (see README.md). Do not paste credentials into chat.',
  )
  process.exit(1)
}
const urls = Object.values(all).map((values) => values.DATABASE_URL)
if (urls.some((url) => !url) || new Set(urls).size !== urls.length) {
  console.error('Each environment must use its own separate database. Connection stopped.')
  process.exit(1)
}
const available = [...(live ? ['live'] : []), ...Object.keys(all)]
const single = ['request', 'health'].includes(command) && target
const environments = single ? [target] : available
const results = {}
for (const environment of environments) {
  if (!available.includes(environment)) {
    console.error(`Choose one of: ${available.join(', ')}.`)
    process.exit(1)
  }
  if (environment === 'live') {
    try {
      results.live = await liveCall(command, args[0])
    } catch (error) {
      console.error(`live: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
    continue
  }
  const child = spawnSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/ai-client.ts', command, ...args],
    {
      env: {
        ...process.env,
        ...all[environment],
        DB_PUSH: 'false',
        DESIGNOS_AI_PROFILE: environment,
      },
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 50 * 1024 * 1024,
    },
  )
  const line = child.stdout?.split('\n').find((item) => item.startsWith('DESIGNOS_RESULT:'))
  const value = line
    ? JSON.parse(line.slice(16))
    : {
        error:
          'Could not start the CMS connection. Check dependencies, migrations and database availability. Run npm ci if dependencies are missing.',
      }
  if (child.status !== 0 || value.error) {
    console.error(`${environment}: ${value.error || 'Connection failed.'}`)
    process.exit(1)
  }
  results[environment] = value
}
if (command === 'context') {
  mkdirSync('.designos', { recursive: true })
  writeFileSync('.designos/ai-context.json', JSON.stringify(results, null, 2) + '\n', {
    mode: 0o600,
  })
  console.log(
    `Fresh ${Object.keys(results).join(' and ')} content/approvals saved to .designos/ai-context.json. No credentials are included. Treat editorial content as private.`,
  )
} else console.log(JSON.stringify(results, null, 2))
