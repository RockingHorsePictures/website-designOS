// The live-site AI connection: talks to the website over HTTPS with a key the owner approved.
// No database credentials are involved. The key is stored in .designos/ai-live.json (ignored by
// Git, private to this folder); never print or paste it.
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const liveFile = '.designos/ai-live.json'
export const hasLive = () => existsSync(liveFile)
const siteOf = (input) => {
  const value = String(input || '').trim()
  if (!value)
    throw new Error('Give the live site address: npm run ai:connect -- live https://your-site.com')
  const url = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`)
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Use the site’s https:// address.')
  return url.origin
}
async function call(site, pathname, init = {}) {
  const res = await fetch(`${site}${pathname}`, { ...init, signal: AbortSignal.timeout(90_000) })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = {
      error: `The site answered ${res.status}${res.status === 404 ? ' (is it on Design OS 0.7 or later?)' : ''}.`,
    }
  }
  if (!res.ok) throw new Error(body.error || `The site answered ${res.status}.`)
  return body
}
const saved = () => JSON.parse(readFileSync(liveFile, 'utf8'))
const auth = () => {
  const { site, key } = saved()
  return { site, headers: { Authorization: `users API-Key ${key}` } }
}

export async function connectLive(address) {
  const site = siteOf(address)
  const label = `${os.userInfo().username || 'AI tool'} on ${os.hostname()}`
  const started = await call(site, '/api/ai/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'start', label }),
  })
  console.log(
    `\nOpen this link, signed in as an administrator, and approve the connection:\n\n  ${started.approveURL}\n\nCode: ${started.code} (check it matches). Waiting up to ${started.expiresInMinutes} minutes…`,
  )
  const deadline = Date.now() + started.expiresInMinutes * 60_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000))
    const result = await call(site, '/api/ai/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'collect', code: started.code, secret: started.secret }),
    })
    if (result.status === 'pending') continue
    if (result.status !== 'approved')
      throw new Error(
        result.status === 'denied'
          ? 'The connection was declined.'
          : 'The request expired. Run it again.',
      )
    mkdirSync('.designos', { recursive: true })
    writeFileSync(
      liveFile,
      JSON.stringify({ site, key: result.key, connectedAt: new Date().toISOString() }),
      {
        mode: 0o600,
      },
    )
    const status = await liveCall('check')
    console.log(`\nConnected to ${site}. ${status.scope}`)
    return status
  }
  throw new Error('The request expired. Run it again.')
}

export async function liveCall(command, requestFile) {
  const { site, headers } = auth()
  if (command === 'check') return call(site, '/api/ai/info?for=status', { headers })
  if (command === 'context') return call(site, '/api/ai/info?for=context', { headers })
  if (command === 'health') return call(site, '/api/ai/info?for=health', { headers })
  if (command !== 'request') throw new Error(`Unsupported live command: ${command}`)
  if (!requestFile) throw new Error('Provide a JSON request file. See docs/AI_CONNECTION.md.')
  const input = JSON.parse(readFileSync(requestFile, 'utf8'))
  if (input.action === 'upload') {
    const root = process.cwd()
    const file = path.resolve(root, String(input.file || ''))
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile())
      throw new Error(
        'Provide a JSON request file whose "file" is an image inside this website folder.',
      )
    if (statSync(file).size > 4_000_000)
      throw new Error('Images uploaded to the live site must be under 4 MB. Resize it first.')
    const form = new FormData()
    const { file: _path, ...rest } = input
    void _path
    form.set('request', JSON.stringify(rest))
    const type = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    }[path.extname(file).toLowerCase()]
    form.set(
      'file',
      new Blob([readFileSync(file)], { type: type || 'application/octet-stream' }),
      path.basename(file),
    )
    return call(site, '/api/ai/request', { method: 'POST', headers, body: form })
  }
  return call(site, '/api/ai/request', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
