import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Password-protected pages. Passwords are stored as salted scrypt hashes; a visitor who enters
// the right one gets an HttpOnly cookie bound to that page and hash (changing the password
// signs everyone out of it).
export const hashed = (v: unknown) => typeof v === 'string' && v.startsWith('scrypt$')
export function hashPagePassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString('base64url')}`
}
export function checkPagePassword(password: string, stored: unknown) {
  if (!hashed(stored)) return false
  const [, salt, hash] = String(stored).split('$')
  const expected = Buffer.from(hash, 'base64url')
  const actual = scryptSync(password, salt, expected.length)
  return timingSafeEqual(actual, expected)
}
export const accessCookie = (id: number | string) => `designos-page-${id}`
export function accessToken(id: number | string, stored: unknown) {
  return createHmac('sha256', String(process.env.PAYLOAD_SECRET))
    .update(`${id}|${stored}`)
    .digest('base64url')
}
export function hasPageAccess(
  doc: { id: number | string; pagePassword?: unknown },
  cookie: string | undefined,
) {
  if (!cookie || !hashed(doc.pagePassword)) return false
  const expected = Buffer.from(accessToken(doc.id, doc.pagePassword))
  const given = Buffer.from(cookie)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
