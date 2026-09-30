// Stops a code preview that is connected to the live database. Production builds record a
// fingerprint of their database server; database branches (Neon preview branching) copy that
// record but run on a different server, so a preview that still sees the live server's
// fingerprint would be reading and migrating live data.
import { createHash } from 'node:crypto'
import pg from 'pg'

// Pooled and direct Neon hosts differ only by "-pooler"; both are the same database.
export function databaseFingerprint(connectionString) {
  const host = new URL(connectionString).hostname.toLowerCase().replace('-pooler.', '.')
  return createHash('sha256').update(host).digest('hex').slice(0, 32)
}

const table = (sqlClient) =>
  sqlClient.query(`CREATE TABLE IF NOT EXISTS designos_database_identity (
    environment text PRIMARY KEY,
    fingerprint text NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now())`)

export async function recordProductionDatabase(connectionString, client) {
  await table(client)
  await client.query(
    `INSERT INTO designos_database_identity (environment, fingerprint) VALUES ('production', $1)
     ON CONFLICT (environment) DO UPDATE SET fingerprint = EXCLUDED.fingerprint, recorded_at = now()`,
    [databaseFingerprint(connectionString)],
  )
}

// True when this database is the one production last recorded.
export async function isProductionDatabase(connectionString, client) {
  const { rows } = await client
    .query(`SELECT fingerprint FROM designos_database_identity WHERE environment = 'production'`)
    .catch((error) => {
      if (error.code === '42P01') return { rows: [] } // table not created yet: no production record
      throw error
    })
  return rows[0]?.fingerprint === databaseFingerprint(connectionString)
}

export async function withDatabase(connectionString, action) {
  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    return await action(client)
  } finally {
    await client.end()
  }
}
