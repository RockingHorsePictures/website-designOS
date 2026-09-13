import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
export async function advisoryLock(req: PayloadRequest, key: number) {
  const id = await req.transactionID
  if (!id) throw new Error('This operation requires a database transaction.')
  await (req.payload.db as unknown as PostgresAdapter).sessions[id].db.execute(
    sql`SELECT pg_advisory_xact_lock(${key})`,
  )
}
