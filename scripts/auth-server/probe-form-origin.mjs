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

const chromiumOnly = process.argv.length === 3 && process.argv[2] === '--chromium-only'

/** Playwright says this when the browser was never downloaded. It is a missing optional
 * dependency, not a regression of the issuer, and it must not stop the required engine. */
const isMissingExecutable = error =>
  /Executable doesn't exist|please run the following command to download/i.test(String(error?.message ?? ''))

if (process.argv.length !== 2 && !chromiumOnly) throw new Error('Only --chromium-only is supported; no remote targets')
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
  let callbackVisits = 0
  let otherVisits = 0
  let checks = 0

  const form = action => `<form action="${action}" method="post">
<input type="hidden" name="client_id" value="fictional-local-client">
<input type="hidden" name="return_to" value="/oauth/authorize?client_id=fictional-local-client">
<input type="hidden" name="scope" value="efeonce.mcp.read">
<button name="decision" value="allow">Continue local test</button></form>`

  const issuer = await listen(async (req, res) => {
    try {
      if (req.url.startsWith('/redirect-consent')) {
        res.writeHead(302, { Location: `${issuer}/redirect-authorize${new URL(req.url, issuer).search}` })
        res.end()

return
      }

      if (req.url.startsWith('/redirect-authorize')) {
        const target = new URL(req.url, issuer).searchParams.get('other') ? other : attacker

        res.writeHead(302, { Location: `${target}/callback` })
        res.end()

return
      }

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
      const redirectTest = req.url.startsWith('/redirect-test')
      const withClientOrigin = req.url.includes('registered=1')
      const toOther = req.url.includes('other=1')

      const result = htmlResponse(
        200,
        form(redirectTest ? `/redirect-consent${toOther ? '?other=1' : ''}` : '/oauth/consent'),
        oldPolicy ? { 'Referrer-Policy': 'no-referrer' } : {},
        withClientOrigin ? { formActionRedirectUri: `${attacker}/callback?fictional=query` } : {}
      )

      res.writeHead(result.status, result.headers)
      res.end(result.body)
    } catch {
      res.writeHead(500)
      res.end('Local harness failed')
    }
  })

  const attacker = await listen((req, res) => {
    if (req.url === '/callback') callbackVisits++
    res.writeHead(200, { 'Content-Type': 'text/html', 'Referrer-Policy': 'strict-origin' })
    res.end(form(`${issuer}/oauth/consent`))
  })

  const other = await listen((_req, res) => {
    otherVisits++
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Fictional unregistered destination')
  })

  const engines = chromiumOnly
    ? [['chromium', chromium]]
    : [
        ['chromium', chromium],
        ['webkit', webkit]
      ]

  const ran = []
  const skipped = []

  for (const [name, engine] of engines) {
    // Chromium is required: the probe proves nothing without it, so a launch failure is fatal.
    // WebKit is extra coverage; if its executable was never downloaded we skip it loudly instead of
    // aborting, so a missing optional binary can never block validating Chromium. Any OTHER launch
    // failure still fails the run — degrading on a real fault would hide the regression we look for.
    try {
      browser = await engine.launch({ headless: true })
    } catch (error) {
      if (name === 'chromium' || !isMissingExecutable(error)) throw error

      console.warn(`${name}: SKIPPED — executable not installed (npx playwright install ${name})`)
      skipped.push(name)
      browser = undefined
      continue
    }

    const context = await browser.newContext({ serviceWorkers: 'block' })
    let externalRequests = 0

    await context.route('**/*', route => {
      if (![issuer, attacker, other].includes(new URL(route.request().url()).origin)) {
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
      checks++
      console.log(`${name}/${scenario.name}: passed`)
    }

    for (const scenario of [
      { name: 'self-only-redirect-blocked', query: '', allowed: false },
      { name: 'registered-redirect-allowed', query: '?registered=1', allowed: true },
      { name: 'other-redirect-blocked', query: '?registered=1&other=1', allowed: false }
    ]) {
      callbackVisits = 0
      otherVisits = 0
      await page.goto(`${issuer}/redirect-test${scenario.query}`)

      const blocked = page
        .waitForEvent('console', { predicate: message => message.text().includes('form-action'), timeout: 5000 })
        .then(
          () => true,
          () => false
        )

      const arrived = page.waitForURL(`${attacker}/callback`, { timeout: 5000 }).then(
        () => true,
        () => false
      )

      await page.getByRole('button', { name: 'Continue local test' }).click()
      assert.equal(await (scenario.allowed ? arrived : blocked), true, `${name}/${scenario.name}: browser result`)
      assert.equal(callbackVisits, scenario.allowed ? 1 : 0)
      assert.equal(otherVisits, 0)
      checks++
      console.log(`${name}/${scenario.name}: passed`)
    }

    assert.equal(externalRequests, 0)
    await browser.close()
    browser = undefined
    ran.push(name)
  }

  // A green run must never imply coverage it did not get: if Chromium never ran, nothing was proven.
  assert.ok(ran.includes('chromium'), 'chromium did not run: the probe validated nothing')

  console.log(
    `${checks} browser form-origin/redirect checks passed; no external requests; engines=${ran.join(',')}` +
      (skipped.length ? `; skipped=${skipped.join(',')} (executable not installed)` : '')
  )
} finally {
  await browser?.close()
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
  await rm(temporary, { recursive: true, force: true })
}
