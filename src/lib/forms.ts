import { createHmac } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { Agent, fetch as undiciFetch } from 'undici'

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

// Every private, loopback, link-local, shared, benchmarking, multicast and reserved range, plus
// IPv6 forms that can smuggle an IPv4 address (mapped, compatible, NAT64, 6to4).
const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of [
  ['::', 96],
  ['::ffff:0:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(net, prefix, 'ipv6')
blocked.addAddress('::1', 'ipv6')
function privateAddress(address: string) {
  const family = isIP(address)
  if (!family) return true
  return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}
// Resolves a webhook host to one public address, or null when it is not a safe target.
async function publicAddress(url: string) {
  const target = new URL(url)
  if (target.protocol !== 'https:' || target.username || target.password) return null
  const host = target.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true })
  if (!addresses.length || addresses.some((a) => privateAddress(a.address))) return null
  return addresses[0]
}
// Webhooks go only to public https hosts, never to internal or cloud-metadata addresses.
export async function safeWebhookTarget(url: string) {
  return Boolean(await publicAddress(url).catch(() => null))
}
export async function deliverWebhook(url: string, secret: string, body: unknown) {
  const address = await publicAddress(url).catch(() => null)
  if (!address) return 'blocked'
  const json = JSON.stringify(body)
  const signature = createHmac('sha256', secret).update(json).digest('hex')
  // Connect to exactly the address that was checked, so DNS cannot change between check and use.
  const dispatcher = new Agent({
    connect: {
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
    },
  })
  try {
    const res = await undiciFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DesignOS-Webhook/1.0',
        'X-DesignOS-Signature': `sha256=${signature}`,
      },
      body: json,
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      dispatcher,
    })
    return res.ok ? 'delivered' : `failed (${res.status})`
  } catch {
    return 'failed'
  } finally {
    await dispatcher.close().catch(() => {})
  }
}
export { privateAddress }
