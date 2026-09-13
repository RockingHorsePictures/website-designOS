import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawnSync } from 'node:child_process'

const [command = 'check', target, ...args] = process.argv.slice(2)
if (!['connect', 'check', 'context', 'request'].includes(command)) {
  console.error('Use ai:connect, ai:check, ai:context, or ai:request -- preview request.json')
  process.exit(1)
}
const environments = command === 'request' ? [target] : ['production', 'preview']
const all = {}
for (const environment of ['production', 'preview']) {
  const file = `.env.${environment}.local`
  if (!existsSync(file)) {
    console.error(
      `Missing ${file}. Open the original installed website folder. On another computer, securely restore this site's private environment files; a Git clone alone has no CMS connection. Do not paste credentials into chat.`,
    )
    process.exit(1)
  }
  all[environment] = parseEnv(readFileSync(file, 'utf8'))
  if (all[environment].SITE_ENV !== environment || all[environment].DATABASE_ENV !== environment) {
    console.error(
      `The ${environment} environment is incorrectly labelled. Repair its site configuration before connecting.`,
    )
    process.exit(1)
  }
}
if (
  !all.production.DATABASE_URL ||
  !all.preview.DATABASE_URL ||
  all.production.DATABASE_URL === all.preview.DATABASE_URL
) {
  console.error('Production and code-preview must use separate databases. Connection stopped.')
  process.exit(1)
}
const results = {}
for (const environment of environments) {
  if (!['production', 'preview'].includes(environment))
    throw new Error('Choose production or preview.')
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
      maxBuffer: 20 * 1024 * 1024,
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
    'Fresh Production and code-preview content/approvals saved to .designos/ai-context.json. No credentials are included. Treat editorial content as private.',
  )
} else console.log(JSON.stringify(results, null, 2))
