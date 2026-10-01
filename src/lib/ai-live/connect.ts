import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, type Payload } from 'payload'

// Connecting an AI coding tool to the live site, without passwords or database credentials:
//   1. the tool asks for a connection and gets a short code plus a private secret;
//   2. an administrator opens /connect-ai?code=… and approves it;
//   3. the tool collects a key for the site's "AI — live site" account, once.
// The account reads the workspace and, only while the owner allows AI edits, saves drafts. It can
// never save a Preview, publish, approve, unlock or delete (src/cms/protection.ts).

const db = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle
const minutes = 15
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const sealKey = () =>
  createHash('sha256').update(`${process.env.PAYLOAD_SECRET}|designos-ai-connect`).digest()
function seal(text: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', sealKey(), iv)
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.')
}
function unseal(value: string) {
  const [iv, tag, data] = value.split('.').map((p) => Buffer.from(p, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', sealKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
type Row = {
  code: string
  secret_hash: string
  label: string
  status: string
  sealed_key: string | null
  created_at: string
}
async function find(payload: Payload, code: string) {
  await db(payload).execute(
    sql`DELETE FROM designos_ai_connect WHERE created_at < now() - make_interval(mins => ${minutes})`,
  )
  const { rows } = await db(payload).execute(
    sql`SELECT * FROM designos_ai_connect WHERE code = ${code.toUpperCase().trim()}`,
  )
  return rows[0] as Row | undefined
}

export async function startConnection(payload: Payload, label: string) {
  const random = randomBytes(8)
  const raw = [...random].map((b) => alphabet[b % alphabet.length]).join('')
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`
  const secret = randomBytes(32).toString('base64url')
  await db(payload).execute(sql`INSERT INTO designos_ai_connect (code, secret_hash, label)
    VALUES (${code}, ${hash(secret)}, ${label.slice(0, 80) || 'AI coding tool'})`)
  return { code, secret, expiresInMinutes: minutes }
}

export async function pendingConnection(payload: Payload, code: string) {
  const row = await find(payload, code)
  return row && row.status === 'pending' ? { code: row.code, label: row.label } : null
}

// The site's single live AI account (created on first approval).
export async function liveAIUser(payload: Payload, create = false) {
  const found = (
    await payload.find({
      collection: 'users',
      where: { aiConnection: { equals: 'live' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  ).docs[0]
  if (found || !create) return found || null
  return payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      name: 'AI — live site',
      email: `designos-ai-live-${randomBytes(8).toString('hex')}@connection.invalid`,
      password: randomBytes(48).toString('base64url'),
      role: 'ai',
      aiReadOnly: true,
      aiConnection: 'live',
    },
  })
}

export async function decideConnection(payload: Payload, code: string, allow: boolean) {
  const row = await find(payload, code)
  if (!row || row.status !== 'pending')
    throw new APIError(
      'This connection request has expired. Start it again from your AI tool.',
      410,
    )
  if (!allow) {
    await db(payload).execute(
      sql`UPDATE designos_ai_connect SET status = 'denied' WHERE code = ${row.code}`,
    )
    return { allowed: false }
  }
  const user = await liveAIUser(payload, true)
  // A new key replaces any earlier one: only the most recently approved tool stays connected.
  const key = randomBytes(32).toString('hex')
  await payload.update({
    collection: 'users',
    id: user!.id,
    overrideAccess: true,
    data: { enableAPIKey: true, apiKey: key } as never,
  })
  await db(payload)
    .execute(sql`UPDATE designos_ai_connect SET status = 'approved', sealed_key = ${seal(key)}
    WHERE code = ${row.code}`)
  return { allowed: true }
}

export async function collectConnection(payload: Payload, code: string, secret: string) {
  const row = await find(payload, code)
  if (!row) return { status: 'expired' as const }
  const a = Buffer.from(row.secret_hash)
  const b = Buffer.from(hash(secret || ''))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { status: 'expired' as const }
  if (row.status === 'pending') return { status: 'pending' as const }
  await db(payload).execute(sql`DELETE FROM designos_ai_connect WHERE code = ${row.code}`)
  if (row.status !== 'approved' || !row.sealed_key) return { status: 'denied' as const }
  return { status: 'approved' as const, key: unseal(row.sealed_key) }
}

// Overview → AI editing. `until` null turns AI edits off (the connection stays, read-only).
export async function setAIEditing(payload: Payload, until: Date | null) {
  const user = await liveAIUser(payload)
  if (!user) throw new APIError('Connect your AI first (see Overview → AI editing).', 400)
  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: { aiReadOnly: until === null, aiWriteUntil: until ? until.toISOString() : null },
  })
}

export async function disconnectAI(payload: Payload) {
  const user = await liveAIUser(payload)
  if (!user) return
  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: { enableAPIKey: false, apiKey: null, aiReadOnly: true, aiWriteUntil: null } as never,
  })
}

export async function aiStatus(payload: Payload) {
  const user = (await liveAIUser(payload)) as
    | ({
        enableAPIKey?: boolean | null
        aiReadOnly?: boolean | null
        aiWriteUntil?: string | null
      } & object)
    | null
  const until = user?.aiWriteUntil ? new Date(user.aiWriteUntil) : null
  const editing = Boolean(user && !user.aiReadOnly && until && until.getTime() > Date.now())
  const { rows } = await db(payload).execute(sql`SELECT max(at) AS last FROM designos_ai_changes`)
  return {
    connected: Boolean(user?.enableAPIKey),
    editingUntil: editing ? until!.toISOString() : null,
    lastChange: ((rows[0] as { last?: string | null }) || {}).last || null,
  }
}
