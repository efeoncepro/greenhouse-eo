/** Browser regression for the real HTML policy and consent CSRF guard.
 * Run: node scripts/auth-server/probe-form-origin.mjs
 * Loopback only; fictional forms, no credentials, database, storage state or traces.
 * Reaching the fictional client lookup proves the actual CSRF guard accepted the request;
 * the nonexistent client then fails closed, so this does not grant consent.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'

if (process.argv.length !== 2) throw new Error('No remote targets or custom arguments supported')
const root = fileURLToPath(new URL('../../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'auth-form-origin-'))
const servers = []
let browser

async function listen(handler) {
  const server = createServer(handler)

  servers.push(server)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  
return `http://127.0.0.1:${server.address().port}`
}

try {
  const bundle = join(temporary, 'harness.cjs')

  await build({
    stdin: {
      contents: `export { htmlResponse, headersFromRecord } from './src/lib/auth-server/oauth/http';
export { handleConsent } from './src/lib/auth-server/oauth/consent-endpoint';`,
      resolveDir: root,
      loader: 'ts'
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundle,
    logLevel: 'silent'
  })
  const { htmlResponse, headersFromRecord, handleConsent } = createRequire(import.meta.url)(bundle)
  let observation

  const form = action => `<form action="${action}" method="post">
<input type="hidden" name="client_id" value="fictional-local-client">
<input type="hidden" name="return_to" value="/oauth/authorize?client_id=fictional-local-client">
<input type="hidden" name="scope" value="efeonce.mcp.read">
<button name="decision" value="allow">Continue local test</button></form>`

  const issuer = await listen(async (req, res) => {
    try {
      if (req.method === 'POST' && req.url === '/oauth/consent') {
        let body = ''

        for await (const chunk of req) body += chunk
        let lookups = 0

        const result = await handleConsent(
          {
            method: req.method,
            url: new URL(req.url, issuer),
            headers: headersFromRecord(req.headers),
            body
          },
          {
            config: { issuer },
            store: {
              getClient: async () => {
                lookups++
                
return null
              }
            },
            cimd: {}
          }
        )

        observation = {
          origin: req.headers.origin ?? null,
          referer: req.headers.referer ?? null,
          fetchSite: req.headers['sec-fetch-site'] ?? null,
          lookups
        }
        res.writeHead(result.status, result.headers)
        res.end(result.body)
        
return
      }

      const oldPolicy = req.url.startsWith('/negative')
      const result = htmlResponse(200, form('/oauth/consent'), oldPolicy ? { 'Referrer-Policy': 'no-referrer' } : {})

      res.writeHead(result.status, result.headers)
      res.end(result.body)
    } catch {
      res.writeHead(500)
      res.end('Local harness failed')
    }
  })

  const attacker = await listen((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Referrer-Policy': 'strict-origin' })
    res.end(form(`${issuer}/oauth/consent`))
  })

  for (const [name, engine] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    browser = await engine.launch({ headless: true })
    const context = await browser.newContext({ serviceWorkers: 'block' })
    let externalRequests = 0

    await context.route('**/*', route => {
      if (![issuer, attacker].includes(new URL(route.request().url()).origin)) {
        externalRequests++
        
return route.abort()
      }

      
return route.continue()
    })
    const page = await context.newPage()

    for (const scenario of [
      {
        name: 'real-policy',
        url: `${issuer}/positive/private-path?private=fake`,
        accepted: true,
        referer: `${issuer}/`
      },
      { name: 'old-policy', url: `${issuer}/negative/private-path?private=fake`, accepted: false, referer: null },
      { name: 'cross-origin', url: `${attacker}/private-path?private=fake`, accepted: false, referer: `${attacker}/` }
    ]) {
      observation = undefined
      await page.goto(scenario.url)
      await Promise.all([
        page.waitForURL(`${issuer}/oauth/consent`),
        page.getByRole('button', { name: 'Continue local test' }).click()
      ])
      assert.ok(observation, `${name}/${scenario.name}: POST reached local server`)
      assert.equal(observation.lookups, scenario.accepted ? 1 : 0, `${name}/${scenario.name}: actual CSRF decision`)
      assert.equal(observation.referer, scenario.referer, `${name}/${scenario.name}: origin-only Referer`)
      if (scenario.name === 'real-policy') assert.equal(observation.origin, issuer)
      if (scenario.name === 'old-policy') assert.equal(observation.origin, 'null')
      if (scenario.name === 'cross-origin') assert.equal(observation.origin, attacker)
      console.log(`${name}/${scenario.name}: passed`)
    }

    assert.equal(externalRequests, 0)
    await browser.close()
    browser = undefined
  }

  console.log('6 browser form-origin checks passed; no external requests')
} finally {
  await browser?.close()
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
  await rm(temporary, { recursive: true, force: true })
}
