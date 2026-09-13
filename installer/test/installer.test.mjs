import test from 'node:test'
import assert from 'node:assert/strict'
import { startWizard } from '../server.mjs'
import { validateSetup, createWorkflow } from '../workflow.mjs'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { hash, planUpgrade } from '../../scripts/upgrade.mjs'
import { setupFailure } from '../recovery.mjs'

test('recovery explains known failures without leaking provider output', () => {
  const data = { owner: 'owner', name: 'site', team: 'team' }
  const terms = setupFailure(
    'Create production database',
    {
      providerOutput:
        'secret=NEVER_SHOW https://vercel.com/team/~/integrations/accept-terms/neon?source=cli',
    },
    data,
  )
  assert.match(terms.reason, /terms/)
  assert(!JSON.stringify(terms).includes('NEVER_SHOW'))
  assert.match(terms.actionURL, /^https:\/\/vercel.com\//)
  const network = setupFailure(
    'Download Design OS',
    { providerOutput: 'token=NEVER_SHOW ECONNRESET' },
    data,
  )
  assert.match(network.recovery, /internet connection/)
  assert(!JSON.stringify(network).includes('NEVER_SHOW'))
})

test('setup rejects shell-like names, weak credentials and missing resource approval', () => {
  const good = {
    name: 'my-site',
    owner: 'my-owner',
    team: 'my-team',
    email: 'me@example.test',
    password: 'long-test-password-123',
    region: 'lhr1',
    approved: true,
  }
  assert.equal(validateSetup(good).name, 'my-site')
  for (const change of [
    { name: 'bad;echo token' },
    { name: '../existing' },
    { owner: '-flag' },
    { password: 'short' },
    { approved: false },
    { region: 'unknown' },
  ])
    assert.throws(() => validateSetup({ ...good, ...change }))
})
test('upgrades preserve site changes and stop on conflicting upstream edits', () => {
  assert.equal(hash(Buffer.from('code\r\n'), 'app.ts'), hash(Buffer.from('code\n'), 'app.ts'))
  assert.notEqual(
    hash(Buffer.from('code\r\n'), 'file.bin'),
    hash(Buffer.from('code\n'), 'file.bin'),
  )
  const baseline = { 'core.ts': 'a', 'custom.ts': 'b', 'removed.ts': 'c' }
  assert.deepEqual(
    planUpgrade(
      baseline,
      { 'core.ts': 'a', 'custom.ts': 'mine', 'removed.ts': 'c' },
      { 'core.ts': 'new', 'custom.ts': 'b' },
    ),
    {
      changes: [
        { path: 'core.ts', action: 'write' },
        { path: 'removed.ts', action: 'remove' },
      ],
      conflicts: [],
    },
  )
  const conflict = planUpgrade(
    baseline,
    { 'core.ts': 'mine', 'custom.ts': 'b', 'removed.ts': 'c' },
    { 'core.ts': 'new', 'custom.ts': 'b', 'removed.ts': 'c' },
  )
  assert.deepEqual(conflict.conflicts, ['core.ts'])
  assert.equal(conflict.changes.length, 0)
})
test('wizard requires its launch token, rejects cross-origin requests and exposes no filesystem routes', async () => {
  let calls = 0
  const workflow = {
    status: () => ({ message: 'Ready' }),
    connect: async () => {
      calls++
    },
    install: () => {
      calls++
    },
    loginVercel: () => {
      calls++
    },
  }
  const { server, origin, token } = await startWizard({ openBrowser: false, workflow })
  try {
    assert.equal((await fetch(`${origin}/api/status`)).status, 401)
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    assert.equal(
      (
        await fetch(`${origin}/api/install`, {
          method: 'POST',
          headers: { ...headers, Origin: 'https://attacker.example' },
          body: '{}',
        })
      ).status,
      403,
    )
    assert.equal(calls, 0)
    assert.equal(
      (
        await fetch(`${origin}/api/connect`, {
          method: 'POST',
          headers: { ...headers, Origin: origin },
          body: '{}',
        })
      ).status,
      200,
    )
    assert.equal(calls, 1)
    assert.equal((await fetch(`${origin}/.env`, { headers })).status, 404)
    const html = await (await fetch(origin)).text()
    assert(!html.includes(token))
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})

for (const mode of ['success', 'shared', 'blocked', 'github-access', 'github-silent']) {
  const sharedDatabase = mode === 'shared'
  test(`installer workflow: ${mode}`, async () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), 'designos-installer-test-'))
    const commands = []
    let repositoryAccess = !['github-access', 'github-silent'].includes(mode)
    let repositoryCreates = 0
    const execute = async (command, args, options = {}) => {
      commands.push({ command, args, options })
      if (
        mode === 'github-access' &&
        !repositoryAccess &&
        args.includes('connect') &&
        args.includes('git')
      )
        throw new Error('GitHub app needs repository access')
      if (args.includes('/v9/projects/test-site'))
        return JSON.stringify({
          link: repositoryAccess ? { type: 'github', org: 'test-owner', repo: 'test-site' } : null,
        })
      if (args.includes('credential')) return 'password=test-only-token\n'
      if (args.includes('teams')) return JSON.stringify({ teams: [{ slug: 'test-team' }] })
      if (args.some((arg) => arg.endsWith('export-starter.mjs'))) {
        mkdirSync(args[1], { recursive: true })
        writeFileSync(
          path.join(args[1], 'designos-installation.json'),
          JSON.stringify({ files: {} }),
        )
        writeFileSync(path.join(args[1], '.gitignore'), '.designos/\n.env*\n')
      }
      if (args.includes('rev-parse')) return 'test-commit'
      if (args.includes('pull') && args.includes('env')) {
        const environment = args[args.indexOf('--environment') + 1]
        const filename = args[args.indexOf('pull') + 1]
        writeFileSync(
          filename,
          `DATABASE_URL=postgresql://test/${sharedDatabase ? 'same' : environment}\nBLOB_READ_WRITE_TOKEN=${environment}-test-token\n`,
        )
      }
      if (args.includes('deploy')) return 'https://test-assigned.vercel.app'
      if (args.includes('inspect'))
        return JSON.stringify({
          readyState: mode === 'blocked' ? 'BLOCKED' : 'READY',
          alias: ['test-assigned.vercel.app'],
        })
      return ''
    }
    const fetcher = async (url, options = {}) => {
      if (options.method === 'POST' && url.endsWith('/repos')) repositoryCreates++
      const value = url.endsWith('/user')
        ? { id: 4242, login: 'test-owner' }
        : url.endsWith('/user/orgs')
          ? []
          : {
              html_url: 'https://github.com/test-owner/test-site',
              clone_url: 'https://github.com/test-owner/test-site.git',
            }
      return new Response(JSON.stringify(value), { status: 200 })
    }
    try {
      const workflow = createWorkflow({ execute, fetcher })
      await workflow.connect()
      const input = {
        name: 'test-site',
        owner: 'test-owner',
        team: 'test-team',
        email: 'owner@example.test',
        password: 'test-only-long-password',
        region: 'lhr1',
        approved: true,
        folder: path.join(temp, 'site'),
      }
      workflow.install(input)
      const deadline = Date.now() + 5000
      while (workflow.status().busy && Date.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 10))
      assert.equal(workflow.status().busy, false)
      const migrations = commands.filter(({ args }) => args.includes('migrate'))
      if (sharedDatabase) {
        assert.match(workflow.status().error, /different resources/)
        assert.equal(migrations.length, 0)
      } else if (['github-access', 'github-silent'].includes(mode)) {
        assert.match(workflow.status().error, /Allow the Vercel GitHub app/)
        assert.equal(workflow.status().authURL, 'https://github.com/settings/installations')
        assert.equal(workflow.status().step, 'paused')
        const failedStep =
          mode === 'github-access'
            ? 'Connect automatic branch previews'
            : 'Verify automatic branch previews'
        assert.equal(workflow.status().failure.step, failedStep)
        assert.equal(migrations.length, 0, 'Permissions are checked before provisioning databases')
        assert(!commands.some(({ args }) => args.includes('integration')))
        const checkpoint = JSON.parse(readFileSync(path.join(temp, 'site', '.designos/setup.json')))
        assert.equal(checkpoint.failure.step, failedStep)
        repositoryAccess = true
        // A fresh installer process resumes the same on-disk checkpoint.
        const resumed = createWorkflow({ execute, fetcher })
        await resumed.connect()
        resumed.install(input)
        const resumeDeadline = Date.now() + 5000
        while (resumed.status().busy && Date.now() < resumeDeadline)
          await new Promise((resolve) => setTimeout(resolve, 10))
        assert.equal(resumed.status().step, 'done')
        assert.equal(resumed.status().error, null)
        assert.equal(resumed.status().failure, null)
        assert.equal(repositoryCreates, 1)
        assert.equal(commands.filter(({ args }) => args.includes('migrate')).length, 2)
        assert.equal(commands.filter(({ args }) => args.includes('scripts/ai-client.ts')).length, 2)
      } else if (mode === 'blocked') {
        assert.match(workflow.status().error, /connected GitHub account/)
        assert.equal(workflow.status().result, null)
      } else {
        assert.equal(workflow.status().error, null)
        assert(
          commands.some(
            ({ args }) =>
              args.includes('user.email') &&
              args.includes('4242+test-owner@users.noreply.github.com'),
          ),
        )
        assert.equal(workflow.status().result.admin, 'https://test-assigned.vercel.app/admin')
        assert.equal(migrations.length, 2)
        assert(
          !commands.some(
            ({ args }) => args.includes('add') && args.some((arg) => arg.startsWith('BOOTSTRAP_')),
          ),
        )
        for (const environment of ['production', 'preview']) {
          const env = readFileSync(path.join(temp, 'site', `.env.${environment}.local`), 'utf8')
          assert(!env.includes('BOOTSTRAP_'))
          assert(env.includes('https://test-assigned.vercel.app'))
        }
        assert(
          !readFileSync(path.join(temp, 'site', '.designos/setup.json'), 'utf8').includes(
            'test-only-long-password',
          ),
        )
      }
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  })
}
