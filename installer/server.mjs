import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createWorkflow } from './workflow.mjs'

export async function startWizard({
  openBrowser = true,
  workflow = createWorkflow(),
  port = 0,
} = {}) {
  const token = randomBytes(32).toString('base64url')
  let origin
  const server = createServer(async (req, res) => {
    const reply = (status, body, type = 'application/json') => {
      res.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy':
          "default-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
      })
      res.end(type === 'application/json' ? JSON.stringify(body) : body)
    }
    if (req.headers.host !== new URL(origin).host) return reply(403, { error: 'Invalid host' })
    const path = new URL(req.url, origin).pathname
    if (req.method === 'GET' && ['/', '/app.js', '/style.css'].includes(path)) {
      const file = path === '/' ? 'index.html' : path.slice(1)
      return reply(
        200,
        await readFile(new URL(`./public/${file}`, import.meta.url)),
        file.endsWith('js') ? 'text/javascript' : file.endsWith('css') ? 'text/css' : 'text/html',
      )
    }
    const supplied = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''))
    const expected = Buffer.from(token)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return reply(401, { error: 'Open the setup link shown in your terminal.' })
    if (req.method === 'POST' && req.headers.origin !== origin)
      return reply(403, { error: 'Invalid origin' })
    try {
      if (req.method === 'GET' && path === '/api/status') return reply(200, workflow.status())
      if (req.method !== 'POST') return reply(404, { error: 'Not found' })
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (raw.length > 16000) return reply(413, { error: 'Request too large' })
      }
      const data = JSON.parse(raw || '{}')
      if (path === '/api/connect') await workflow.connect(data)
      else if (path === '/api/login-vercel') workflow.loginVercel()
      else if (path === '/api/install') workflow.install(data)
      else if (path === '/api/close') {
        reply(200, { ok: true })
        setTimeout(() => server.close(), 100)
        return
      } else return reply(404, { error: 'Not found' })
      reply(200, workflow.status())
    } catch (error) {
      reply(400, { error: error.message || 'Setup could not continue.' })
    }
  })
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
  const url = `${origin}/#${token}`
  console.log(
    `Design OS setup: ${url}\nKeep this terminal open while setup runs. Press Ctrl+C to stop.`,
  )
  if (openBrowser) {
    const child =
      process.platform === 'win32'
        ? spawn('rundll32', ['url.dll,FileProtocolHandler', url], {
            windowsHide: true,
            stdio: 'ignore',
          })
        : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' })
    child.on('error', () => {})
    child.unref()
  }
  return { server, url, origin, token }
}
