import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes, createHash } from 'node:crypto'
import type { Payload, CollectionSlug, GlobalSlug, TypedUser } from 'payload'

let payload: Payload | undefined
const emit = (value: unknown) => console.log('DESIGNOS_RESULT:' + JSON.stringify(value))
try {
  const [command, requestFile] = process.argv.slice(2)
  const profile = process.env.DESIGNOS_AI_PROFILE || process.env.SITE_ENV
  if (
    !['production', 'preview'].includes(profile || '') ||
    process.env.SITE_ENV !== profile ||
    process.env.DATABASE_ENV !== profile
  )
    throw new Error('The AI profile must match this site environment.')
  const readOnly = profile === 'production'
  const database = new URL(process.env.DATABASE_URL!)
  const databaseIdentity = createHash('sha256')
    .update(`${database.hostname.replace('-pooler.', '.')}|${database.port}|${database.pathname}`)
    .digest('hex')
  const filename = `.designos/ai-${profile}.json`
  if (!existsSync(filename) && command !== 'connect')
    throw new Error(
      'AI access is not configured. Run npm run ai:connect in this website folder. It creates restricted accounts without changing your content.',
    )
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config')
  payload = await getPayload({ config })
  if (!existsSync(filename)) {
    mkdirSync('.designos', { recursive: true })
    writeFileSync(
      filename,
      JSON.stringify({
        email: `designos-ai-${profile}-${randomBytes(8).toString('hex')}@connection.invalid`,
        password: randomBytes(48).toString('base64url'),
        readOnly,
        databaseIdentity,
      }),
      { mode: 0o600, flag: 'wx' },
    )
  }
  const credentials = JSON.parse(readFileSync(filename, 'utf8'))
  if (credentials.databaseIdentity !== databaseIdentity)
    throw new Error(
      'The saved AI connection belongs to another database. Restore this site’s own connection files; do not reuse another site’s credentials.',
    )
  if (credentials.readOnly !== readOnly)
    throw new Error('The saved AI connection has the wrong scope. Repair it before continuing.')
  if (command === 'connect') {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: credentials.email } },
      limit: 1,
    })
    if (!existing.totalDocs)
      await payload.create({
        collection: 'users',
        data: {
          name: readOnly ? 'AI — Production reader' : 'AI — code-preview contributor',
          email: credentials.email,
          password: credentials.password,
          role: 'ai',
          aiReadOnly: readOnly,
        },
      })
  }
  const login = await payload.login({
    collection: 'users',
    data: { email: credentials.email, password: credentials.password },
  })
  if (!login.user || login.user.role !== 'ai' || Boolean(login.user.aiReadOnly) !== readOnly)
    throw new Error(
      'The AI account scope changed. Ask the site administrator to review it. No permissions were changed automatically.',
    )
  const user = { ...login.user, collection: 'users' } as TypedUser
  const options = { user, overrideAccess: false, depth: 0 } as const
  if (command === 'context') {
    const { aiContext } = await import('../src/lib/ai-context')
    emit(await aiContext(payload, user))
  } else if (command === 'request') {
    if (!requestFile)
      throw new Error('Provide a JSON request file. See AI_CONNECTION.md for examples.')
    const input = JSON.parse(readFileSync(requestFile, 'utf8'))
    if (!['read', 'create', 'update'].includes(input.action))
      throw new Error('Supported actions: read, create, update.')
    if (readOnly && input.action !== 'read')
      throw new Error('Production AI access is read-only. Use preview for changes.')
    if (Boolean(input.collection) === Boolean(input.global))
      throw new Error('Choose one collection or global.')
    const target = input.collection
      ? payload.collections[input.collection as CollectionSlug]?.config
      : payload.config.globals.find((item) => item.slug === input.global)
    if (!target?.fields.some((field) => 'name' in field && field.name === 'protection'))
      throw new Error('This target is not available to the AI connection.')
    let result
    if (input.global) {
      const slug = input.global as GlobalSlug
      if (input.action === 'create') throw new Error('Globals already exist. Use update.')
      result =
        input.action === 'read'
          ? await payload.findGlobal({ slug, ...options })
          : await payload.updateGlobal({ slug, data: input.data, ...options })
    } else {
      const collection = input.collection as CollectionSlug
      if (input.action === 'read')
        result = input.id
          ? await payload.findByID({ collection, id: input.id, draft: true, ...options })
          : await payload.find({
              collection,
              draft: true,
              where: input.where,
              page: input.page || 1,
              limit: 100,
              ...options,
            })
      else if (input.action === 'create')
        result = await payload.create({ collection, data: input.data, draft: true, ...options })
      else {
        if (!input.id) throw new Error('An individual record ID is required for updates.')
        result = await payload.update({
          collection,
          id: input.id,
          data: input.data,
          draft: true,
          ...options,
        })
      }
    }
    emit(result)
  } else
    emit({
      ready: true,
      scope: readOnly
        ? 'Read Production content and approvals'
        : 'Edit unlocked code-preview content; cannot approve or publish',
    })
} catch (error) {
  // Database/adapter exceptions may contain SQL parameters. Never print them or login tokens.
  const { APIError } = await import('payload')
  const message = error instanceof Error ? error.message : ''
  const safe =
    error instanceof APIError ||
    /^(The AI|The saved|AI access|Production AI|Provide a JSON|Choose one|This target|Supported actions|Globals already|An individual)/.test(
      message,
    )
  emit({
    error: safe
      ? message
      : 'CMS connection failed. Check private environment files, database availability and applied migrations. For a revoked account, ask the administrator to reconnect it; do not use their login.',
  })
  process.exitCode = 1
} finally {
  await payload?.destroy()
  process.exit(process.exitCode || 0)
}
