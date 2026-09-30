// Hosted defaults (derived secrets) must apply before PAYLOAD_SECRET is read.
import './env'
import { createHash } from 'node:crypto'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

// The address set by the hosting platform, not one a client can forge. Vercel overwrites
// x-vercel-forwarded-for / x-real-ip; other proxies may set cf-connecting-ip. The first
// x-forwarded-for entry is only a last resort (self-hosting behind a trusted proxy).
// Forwarding headers are only trusted on Vercel or behind a proxy declared with TRUSTED_PROXY=1;
// otherwise every request shares one bucket, which keeps limits effective (if strict).
export function clientIP(headers: Headers) {
  if (process.env.VERCEL)
    return (
      headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip')?.trim() ||
      'unknown'
    )
  if (process.env.TRUSTED_PROXY === '1')
    return (
      headers.get('cf-connecting-ip')?.trim() ||
      headers.get('x-real-ip')?.trim() ||
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    )
  return 'direct'
}
// A salted, truncated hash so addresses are never stored.
export function senderKey(headers: Headers) {
  return createHash('sha256')
    .update(`${clientIP(headers)}|${process.env.PAYLOAD_SECRET}`)
    .digest('hex')
    .slice(0, 32)
}

// Counts one attempt and reports whether it is within `limit` per `windowSeconds`. A single
// upsert does the increment and the check, so concurrent requests cannot slip past the limit.
export async function withinLimit(
  payload: Payload,
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const { rows } = await db.execute(sql`
    INSERT INTO designos_rate_limits (bucket, key, window_start, count)
    VALUES (${bucket}, ${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    ON CONFLICT (bucket, key, window_start)
    DO UPDATE SET count = designos_rate_limits.count + 1
    RETURNING count`)
  if (Math.random() < 0.02)
    await db.execute(
      sql`DELETE FROM designos_rate_limits WHERE window_start < now() - interval '2 days'`,
    )
  return Number((rows[0] as { count: number }).count) <= limit
}
