import { spawn } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { setupFailure } from './recovery.mjs'

const release = JSON.parse(readFileSync(new URL('./release.json', import.meta.url), 'utf8'))
const npmCLI =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
export function run(command, args, { cwd = process.cwd(), env = {}, input = '', onOutput } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let output = ''
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (chunk) => {
        output += chunk
        onOutput?.(String(chunk))
      })
    child.on('error', () =>
      reject(
        new Error(`Cannot run ${path.basename(command)}. Install Git and Node.js, then retry.`),
      ),
    )
    child.on('close', (code) =>
      code
        ? reject(
            Object.assign(new Error('The provider command did not complete.'), {
              providerOutput: output,
            }),
          )
        : resolve(output),
    )
    child.stdin.end(input)
  })
}
export function validateSetup(data) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(data.name || ''))
    throw new Error(
      'Use a site name containing lowercase letters, numbers and hyphens (up to 48 characters).',
    )
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(data.owner || ''))
    throw new Error('Choose a GitHub owner.')
  if (!/^[a-zA-Z0-9_-]+$/.test(data.team || '')) throw new Error('Choose a Vercel team.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || ''))
    throw new Error('Enter an administrator email.')
  if (typeof data.password !== 'string' || data.password.length < 16)
    throw new Error('Use an administrator password of at least 16 characters.')
  if (!['lhr1', 'iad1', 'fra1', 'syd1', 'sin1', 'pdx1', 'cle1', 'gru1'].includes(data.region))
    throw new Error('Choose a supported region.')
  if (!data.approved) throw new Error('Review and approve the listed resources first.')
  const folder = path.resolve(data.folder || path.join(process.cwd(), data.name))
  if (folder === path.parse(folder).root)
    throw new Error('Choose a website folder, not the filesystem root.')
  return { ...data, folder }
}
export function createWorkflow({ execute = run, fetcher = fetch } = {}) {
  let githubToken = ''
  let busy = false
  let current = {
    step: 'connect',
    message: 'Connect your accounts to begin.',
    events: [],
    github: null,
    teams: [],
    authURL: null,
    result: null,
    error: null,
    failure: null,
  }
  const update = (message) => {
    current.message = message
    current.events = [...current.events.slice(-30), message]
  }
  const npm = (args, options) => execute(process.execPath, [npmCLI, ...args], options)
  const vercel = (args, options) =>
    npm(['exec', '--yes', '--package=vercel@59.16.0', '--', 'vercel', ...args], options)
  const github = async (method, endpoint, body) => {
    const response = await fetcher(`https://api.github.com${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const value = await response.json()
    if (!response.ok) throw new Error(`GitHub: ${value.message || response.status}`)
    return value
  }
  const gitEnv = () => ({
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${githubToken}`).toString('base64')}`,
  })
  const status = () => ({
    ...current,
    busy,
    version: release.version,
    defaultFolder: process.cwd(),
  })
  async function connect(data = {}) {
    if (busy) throw new Error('Wait for the current step to finish.')
    if (data.githubToken) githubToken = data.githubToken.trim()
    if (!githubToken) {
      try {
        const credential = await execute('git', ['credential', 'fill'], {
          input: 'protocol=https\nhost=github.com\n\n',
          env: { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
        })
        githubToken =
          credential
            .split('\n')
            .find((line) => line.startsWith('password='))
            ?.slice(9)
            .trim() || ''
      } catch {}
    }
    if (!githubToken)
      throw new Error(
        'Connect GitHub using the temporary token field, or sign in with GitHub CLI first.',
      )
    const user = await github('GET', '/user')
    const orgs = await github('GET', '/user/orgs').catch(() => [])
    if (!Number.isSafeInteger(user.id))
      throw new Error('GitHub did not return an account identity.')
    current.github = {
      id: user.id,
      login: user.login,
      owners: [user.login, ...orgs.map((org) => org.login)],
    }
    try {
      const output = await vercel(['teams', 'ls', '--json'])
      const start = output.indexOf('{')
      const end = output.lastIndexOf('}')
      const value = JSON.parse(output.slice(start, end + 1))
      current.teams = value.teams || value
      if (!Array.isArray(current.teams)) throw new Error('No teams')
    } catch {
      current.teams = []
      current.message = 'GitHub connected. Sign in to Vercel, then refresh accounts.'
      return
    }
    update('Accounts connected. Choose the website details.')
    current.step = 'details'
  }
  function loginVercel() {
    if (busy) throw new Error('Wait for the current step to finish.')
    busy = true
    current.error = null
    update('Complete Vercel sign-in in your browser.')
    vercel(['login'], {
      onOutput: (chunk) => {
        const url = chunk.match(/https:\/\/(?:vercel\.com|vercel\.link)\/[^\s\u001b]+/)
        if (url) current.authURL = url[0]
      },
    })
      .then(() => {
        current.authURL = null
        update('Vercel connected. Refresh accounts to continue.')
      })
      .catch(() => {
        current.error = 'Vercel sign-in did not finish. Retry sign-in.'
      })
      .finally(() => {
        busy = false
      })
  }
  function install(input) {
    if (busy) throw new Error('Setup is already running.')
    if (!current.github || !current.teams.some((team) => team.slug === input.team))
      throw new Error('Refresh and choose your connected accounts first.')
    const data = validateSetup(input)
    if (!current.github.owners.includes(data.owner))
      throw new Error('Choose a connected GitHub owner.')
    const statePath = path.join(data.folder, '.designos/setup.json')
    if (existsSync(data.folder) && !existsSync(statePath))
      throw new Error(
        'This folder already exists and is not a resumable Design OS setup. Choose a new folder. Existing files will not be overwritten.',
      )
    busy = true
    current.error = null
    current.failure = null
    current.authURL = null
    current.step = 'install'
    current.details = Object.fromEntries(
      ['name', 'owner', 'team', 'region', 'folder', 'email'].map((key) => [key, data[key]]),
    )
    executeInstall(data, statePath)
      .catch((error) => {
        current.failure ||= setupFailure(current.message, error, data)
        current.authURL = current.failure.actionURL
        current.error = `${current.failure.reason} ${current.failure.recovery}`
        current.step = 'paused'
        update(`Setup paused: ${current.failure.step}`)
      })
      .finally(() => {
        busy = false
      })
  }
  async function executeInstall(data, statePath) {
    let state = existsSync(statePath)
      ? JSON.parse(readFileSync(statePath, 'utf8'))
      : {
          version: release.version,
          createdAt: new Date().toISOString(),
          name: data.name,
          owner: data.owner,
          team: data.team,
          region: data.region,
          steps: {},
        }
    for (const key of ['name', 'owner', 'team', 'region'])
      if (state[key] !== data[key])
        throw new Error(
          'This folder belongs to another setup. Use its original details or choose a new folder.',
        )
    mkdirSync(path.dirname(statePath), { recursive: true })
    const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 })
    save()
    const step = async (name, fn) => {
      if (state.steps[name]) return
      update(name)
      try {
        const result = await fn()
        state.steps[name] = result && typeof result === 'object' ? result : true
        delete state.failure
        save()
      } catch (error) {
        current.failure = setupFailure(name, error, data)
        state.failure = current.failure
        save()
        throw error
      }
    }
    const options = { cwd: data.folder }
    const vc = (args, extra = {}) =>
      vercel([...args, '--scope', data.team], { ...options, ...extra })
    const deploy = async (flags = []) => {
      const output = await vc(['deploy', ...flags, '--yes', '--no-wait'])
      const urls = output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g)
      if (!urls?.length)
        throw new Error(
          'Vercel did not return a deployment address. Inspect the project before retrying.',
        )
      const deadline = Date.now() + 20 * 60 * 1000
      while (Date.now() < deadline) {
        const details = await vc(['inspect', urls.at(-1), '--json'])
        const info = JSON.parse(details.slice(details.indexOf('{'), details.lastIndexOf('}') + 1))
        const status = info.readyState || info.status
        if (status === 'READY') return info
        if (status === 'BLOCKED')
          throw new Error(
            'Vercel blocked deployment. Make sure the connected GitHub account can deploy to the selected Vercel team, then resume.',
          )
        if (['ERROR', 'CANCELED'].includes(status))
          throw new Error(
            'Deployment failed. Review the build log in Vercel, correct the issue, then resume.',
          )
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
      throw new Error('Deployment is still pending. Check Vercel before resuming setup.')
    }
    await step('Download Design OS', async () => {
      const temp = mkdtempSync(path.join(os.tmpdir(), 'design-os-source-'))
      await execute('git', [
        'clone',
        '--depth',
        '1',
        '--branch',
        release.ref,
        release.repository,
        temp,
      ])
      const destination = path.join(temp, 'exported')
      await execute(process.execPath, [path.join(temp, 'scripts/export-starter.mjs'), destination])
      const baselinePath = path.join(destination, 'designos-installation.json')
      const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
      baseline.installedAt = state.createdAt
      writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n')
      const { readdirSync } = await import('node:fs')
      const copy = (from, to) => {
        mkdirSync(to, { recursive: true })
        for (const item of readdirSync(from, { withFileTypes: true })) {
          const source = path.join(from, item.name),
            target = path.join(to, item.name)
          if (item.isDirectory()) copy(source, target)
          else if (existsSync(target)) {
            if (!readFileSync(source).equals(readFileSync(target)))
              throw new Error(
                `Existing file differs: ${item.name}. Choose a new folder; it was not overwritten.`,
              )
          } else writeFileSync(target, readFileSync(source))
        }
      }
      copy(destination, data.folder)
      return { commit: (await execute('git', ['rev-parse', 'HEAD'], { cwd: temp })).trim() }
    })
    await step('Create your private GitHub repository', async () => {
      const endpoint =
        data.owner === current.github.login ? '/user/repos' : `/orgs/${data.owner}/repos`
      const repository = await github('POST', endpoint, {
        name: data.name,
        private: true,
        description: 'Website built with Design OS',
        auto_init: false,
      })
      return { url: repository.html_url, cloneURL: repository.clone_url }
    })
    const repository = state.steps['Create your private GitHub repository']
    await step('Initialize your website repository', async () => {
      await execute('git', ['init', '-b', 'main'], options)
      await execute('git', ['config', 'user.name', current.github.login], options)
      await execute(
        'git',
        [
          'config',
          'user.email',
          `${current.github.id}+${current.github.login}@users.noreply.github.com`,
        ],
        options,
      )
      await execute('git', ['remote', 'add', 'origin', repository.cloneURL], options)
    })
    await step('Commit your website foundation', async () => {
      writeFileSync(
        path.join(data.folder, 'site-workspace.json'),
        JSON.stringify({ repositoryUrl: repository.url, foundationBranch: 'main' }, null, 2) + '\n',
      )
      await execute('git', ['add', '.'], options)
      await execute('git', ['commit', '-m', 'Create independent Design OS website'], options)
    })
    await step('Push your website foundation', async () => {
      await execute('git', ['push', '-u', 'origin', 'main'], { ...options, env: gitEnv() })
    })
    await step('Create your Vercel project', () => vc(['project', 'add', data.name]))
    await step('Link your Vercel project', () => vc(['link', '--yes', '--project', data.name]))
    await step('Connect automatic branch previews', () =>
      vc(['git', 'connect', repository.cloneURL, '--yes']),
    )
    await step('Verify automatic branch previews', async () => {
      const linked = async () => {
        const output = await vc(['api', `/v9/projects/${data.name}`, '--raw'])
        const project = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1))
        return (
          project.link?.type === 'github' &&
          project.link.org?.toLowerCase() === data.owner.toLowerCase() &&
          project.link.repo?.toLowerCase() === data.name.toLowerCase()
        )
      }
      if (!(await linked())) {
        // Some CLI failures are printed as warnings with exit code zero.
        await vc(['git', 'connect', repository.cloneURL, '--yes'])
        if (!(await linked()))
          throw new Error('Vercel has not linked the requested GitHub repository.')
      }
    })
    await step('Install application dependencies', () => npm(['ci'], options))
    for (const environment of ['production', 'preview']) {
      await step(`Create ${environment} database`, () =>
        vc([
          'integration',
          'add',
          'neon',
          '--name',
          `${data.name}-${environment}`,
          '--plan',
          'free_v3',
          '--metadata',
          `region=${data.region}`,
          '--metadata',
          'auth=false',
          '--environment',
          environment,
          '--no-env-pull',
          '--non-interactive',
        ]),
      )
      await step(`Create ${environment} upload storage`, () =>
        vc([
          'blob',
          'create-store',
          `${data.name}-${environment}`,
          '--access',
          'public',
          '--environment',
          environment,
          '--region',
          data.region,
          '--yes',
        ]),
      )
      const envFile = path.join(data.folder, `.env.${environment}.local`)
      await step(`Configure ${environment}`, async () => {
        let values = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}
        if (!values.PAYLOAD_SECRET) {
          await vc(['env', 'pull', envFile, '--environment', environment, '--yes'])
          values = parseEnv(readFileSync(envFile, 'utf8'))
        }
        if (!values.DATABASE_URL || !values.BLOB_READ_WRITE_TOKEN)
          throw new Error(
            'Database or upload credentials are missing. Connect both resources to the selected environment.',
          )
        Object.assign(values, {
          SITE_ENV: environment,
          DATABASE_ENV: environment,
          PAYLOAD_SECRET: values.PAYLOAD_SECRET || randomBytes(48).toString('base64url'),
          CRON_SECRET: values.CRON_SECRET || randomBytes(32).toString('base64url'),
          NEXT_PUBLIC_SERVER_URL: `https://${data.name}.vercel.app`,
          BOOTSTRAP_EMAIL: data.email,
          BOOTSTRAP_PASSWORD: data.password,
          AI_ENABLED: 'false',
          DB_PUSH: 'false',
        })
        writeFileSync(
          envFile,
          Object.entries(values)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join('\n') + '\n',
          { mode: 0o600 },
        )
        for (const key of [
          'SITE_ENV',
          'DATABASE_ENV',
          'PAYLOAD_SECRET',
          'CRON_SECRET',
          'NEXT_PUBLIC_SERVER_URL',
          'AI_ENABLED',
          'DB_PUSH',
        ])
          await vc(
            [
              'env',
              'add',
              key,
              environment,
              '--yes',
              '--force',
              ...(key.includes('SECRET') || key.includes('PASSWORD') ? ['--sensitive'] : []),
            ],
            { input: values[key] },
          )
      })
    }
    await step('Verify resource separation', async () => {
      const live = parseEnv(readFileSync(path.join(data.folder, '.env.production.local'), 'utf8'))
      const preview = parseEnv(readFileSync(path.join(data.folder, '.env.preview.local'), 'utf8'))
      if (
        live.DATABASE_URL === preview.DATABASE_URL ||
        live.BLOB_READ_WRITE_TOKEN === preview.BLOB_READ_WRITE_TOKEN ||
        live.PAYLOAD_SECRET === preview.PAYLOAD_SECRET
      )
        throw new Error('Preview and Production must have different resources and signing secrets.')
    })
    for (const environment of ['production', 'preview']) {
      const envFile = path.join(data.folder, `.env.${environment}.local`)
      await step(`Prepare ${environment} database`, async () => {
        const values = parseEnv(readFileSync(envFile, 'utf8'))
        await execute(
          process.execPath,
          [path.join(data.folder, 'node_modules/payload/bin.js'), 'migrate'],
          { ...options, env: values, input: 'y\n' },
        )
        await execute(
          process.execPath,
          [path.join(data.folder, 'node_modules/tsx/dist/cli.mjs'), 'scripts/initialize-site.ts'],
          { ...options, env: { ...values, SETUP_SITE_NAME: data.name } },
        )
      })
      await step(`Connect ${environment} AI access`, async () => {
        const values = parseEnv(readFileSync(envFile, 'utf8'))
        await execute(
          process.execPath,
          [
            path.join(data.folder, 'node_modules/tsx/dist/cli.mjs'),
            'scripts/ai-client.ts',
            'connect',
          ],
          { ...options, env: { ...values, DESIGNOS_AI_PROFILE: environment } },
        )
      })
    }
    await step('Deploy your unpublished website', async () => {
      const info = await deploy(['--prod'])
      const aliases = (info.alias || info.aliases || [])
        .map((alias) => (typeof alias === 'string' ? alias : alias.alias))
        .filter((alias) => typeof alias === 'string' && /^[a-z0-9.-]+\.vercel\.app$/.test(alias))
      if (!aliases.length)
        throw new Error(
          'No stable site address was assigned. Check Vercel project domains before resuming.',
        )
      return { url: `https://${aliases.sort((a, b) => a.length - b.length)[0]}` }
    })
    const siteURL = state.steps['Deploy your unpublished website'].url
    await step('Set the assigned website address', async () => {
      for (const environment of ['production', 'preview'])
        await vc(['env', 'add', 'NEXT_PUBLIC_SERVER_URL', environment, '--yes', '--force'], {
          input: siteURL,
        })
      await deploy(['--prod'])
    })
    await step('Deploy the code testing environment', () => deploy())
    await step('Verify your editor', async () => {
      const response = await fetcher(`${siteURL}/admin/login`)
      if (!response.ok)
        throw new Error(
          'The editor could not be verified. Check the deployment and Vercel access protection, then resume.',
        )
    })
    await step('Remove temporary bootstrap credentials', async () => {
      for (const environment of ['production', 'preview']) {
        const filename = path.join(data.folder, `.env.${environment}.local`)
        const values = parseEnv(readFileSync(filename, 'utf8'))
        delete values.BOOTSTRAP_EMAIL
        delete values.BOOTSTRAP_PASSWORD
        values.NEXT_PUBLIC_SERVER_URL = siteURL
        writeFileSync(
          filename,
          Object.entries(values)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join('\n') + '\n',
          { mode: 0o600 },
        )
      }
    })
    await step('Record your completed setup', async () => {
      writeFileSync(
        path.join(data.folder, 'IMPLEMENTATION_STATUS.md'),
        `# Website setup status\n\nDesign OS ${release.version} was installed into this independent website.\n\n- Repository: ${repository.url}\n- Admin: ${siteURL}/admin\n- Saved content Preview: ${siteURL}/preview\n- Live: ${siteURL}\n- Production and code-testing environments have separate databases, upload stores and signing secrets. Migrations and initial administrator creation completed. The editor URL responded successfully.\n- No company website design has begun. Live starts on Coming soon until publication from the admin.\n- Configure your company identity, content, branding, email delivery and recovery arrangements. Run your own design and launch checks.\n\nRead START_HERE.md and AI_SITE_CONTRACT.md before making changes. Never copy another environment's database over this site's content.\n`,
      )
      const changed = await execute(
        'git',
        ['status', '--porcelain', '--', 'IMPLEMENTATION_STATUS.md'],
        options,
      )
      if (changed.trim()) {
        await execute('git', ['add', 'IMPLEMENTATION_STATUS.md'], options)
        await execute('git', ['commit', '-m', 'Record completed website setup'], options)
      }
      await execute('git', ['push', 'origin', 'main'], { ...options, env: gitEnv() })
    })
    current.result = {
      folder: data.folder,
      repository: repository.url,
      admin: `${siteURL}/admin`,
      preview: `${siteURL}/preview`,
      live: siteURL,
    }
    current.step = 'done'
    update(
      'Your independent website is ready. Live shows Coming soon until you publish from the admin.',
    )
    githubToken = ''
  }
  return { status, connect, loginVercel, install }
}
