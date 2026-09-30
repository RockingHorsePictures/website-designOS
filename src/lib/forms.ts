import { createHmac } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export * from './form-definitions'

// Cloudflare Turnstile, when TURNSTILE_SECRET_KEY is configured.
export async function verifyTurnstile(token: unknown, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (typeof token !== 'string' || !token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    })
    return Boolean(((await res.json()) as { success?: boolean }).success)
  } catch {
    return false
  }
}

function privateAddress(address: string) {
  const v4 = address.replace(/^::ffff:/i, '')
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }
  const v6 = address.toLowerCase()
  return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)
}
// Webhooks go only to public https hosts, never to internal or cloud-metadata addresses.
export async function safeWebhookTarget(url: string) {
  const target = new URL(url)
  if (target.protocol !== 'https:' || target.username || target.password) return false
  const host = target.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  return addresses.length > 0 && addresses.every((a) => !privateAddress(a.address))
}
export async function deliverWebhook(url: string, secret: string, body: unknown) {
  if (!(await safeWebhookTarget(url).catch(() => false))) return 'blocked'
  const json = JSON.stringify(body)
  const signature = createHmac('sha256', secret).update(json).digest('hex')
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DesignOS-Webhook/1.0',
        'X-DesignOS-Signature': `sha256=${signature}`,
      },
      body: json,
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    })
    return res.ok ? 'delivered' : `failed (${res.status})`
  } catch {
    return 'failed'
  }
}
export { privateAddress }
