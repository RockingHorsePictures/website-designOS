import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
// PostgreSQL enforces the budget atomically across serverless instances.
export async function reserveAICall(payload: Payload): Promise<boolean> {
  if (process.env.AI_ENABLED !== 'true') return false
  const limit = Math.min(1000, Math.max(0, Number(process.env.AI_DAILY_LIMIT || 30)))
  if (!Number.isFinite(limit) || !limit) return false
  const key = `daily:${new Date().toISOString().slice(0, 10)}`
  const result = await payload.db.drizzle.execute(
    sql`INSERT INTO ai_usage (key, count, created_at, updated_at) VALUES (${key}, 1, now(), now()) ON CONFLICT (key) DO UPDATE SET count = ai_usage.count + 1, updated_at = now() WHERE ai_usage.count < ${limit} RETURNING count`,
  )
  return result.rows.length > 0
}
