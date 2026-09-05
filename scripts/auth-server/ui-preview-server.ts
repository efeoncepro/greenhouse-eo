/** TASK-1835 local-only visual harness. Never mounted by auth-server or deployed. */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'

import { renderAuthPreview } from './ui-preview-render'
import { createPreviewStyles } from './ui-preview-styles'

const port = 19035
const origin = `http://127.0.0.1:${port}`
const styles = createPreviewStyles()
const styleHash = createHash('sha256').update(styles).digest('base64')
const fonts = resolve('src/lib/artifact-composer/brand-packs/axis/fonts')

const resources = new Map([
  ['/isotipo.svg', { type: 'image/svg+xml', path: resolve('public/branding/SVG/isotipo-full-efeonce.svg') }],
  ['/fonts/Geist-Regular.ttf', { type: 'font/ttf', path: resolve(fonts, 'geist-400.ttf') }],
  ['/fonts/Geist-SemiBold.ttf', { type: 'font/ttf', path: resolve(fonts, 'geist-600.ttf') }],
  ['/fonts/Poppins-Bold.ttf', { type: 'font/ttf', path: resolve(fonts, 'poppins-700.ttf') }]
])

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; style-src 'sha256-${styleHash}'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
  )

  if (request.headers.host !== `127.0.0.1:${port}` || request.method !== 'GET') {
    response.writeHead(403).end()

return
  }

  const path = new URL(request.url ?? '/', origin).pathname
  const resource = resources.get(path)

  if (resource) {
    response.writeHead(200, { 'Content-Type': resource.type }).end(readFileSync(resource.path))

return
  }

  if (!['/', '/login', '/consent'].includes(path)) {
    response.writeHead(404).end()

return
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
    renderAuthPreview(path === '/consent' ? 'consent' : 'login', {
      styles,
      isotipo: '<img src="/isotipo.svg" alt="" aria-hidden="true">'
    })
  )
})

server.listen(port, '127.0.0.1', () => console.log(`Auth preview: ${origin}/login (synthetic fixtures only)`))
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close())
