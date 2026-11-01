/** TASK-2064 targeted browser contracts that GVC does not model: JS-disabled fallback and HTTP400 semantics.
 * Only the local fictional harness. No credentials, auth commands, external requests or state writes.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:19064'
const output = '.captures/task2064-local-contract-checks'
const browser = await chromium.launch({ headless: true })
const checks = []

await mkdir(output, { recursive: true })

try {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled, colorScheme: 'dark', reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const errors = []

    page.on('pageerror', error => errors.push(error.message))
    await context.route('**/*', route => {
      const req = route.request()

      assert.equal(new URL(req.url()).origin, origin)
      assert.equal(req.method(), 'GET')

      return route.continue()
    })

    for (const path of ['/login', '/login/rooms', '/login/invalid-email', '/consent']) {
      const response = await page.goto(origin + path)

      assert.equal(response.status(), path.endsWith('invalid-email') ? 400 : 200)
      assert.ok(response.headers()['content-security-policy'])
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true)

      if (path.startsWith('/login')) {
        assert.equal(await page.locator('form').getAttribute('action'), '/auth/magic-link/request')
        assert.equal(await page.locator('form').getAttribute('method'), 'post')
        if (!javaScriptEnabled) assert.equal(await page.locator('[data-login-passkey]').isVisible(), false)

        if (path.endsWith('invalid-email')) {
          assert.equal(await page.locator('#email').getAttribute('aria-invalid'), 'true')
          assert.equal(await page.locator('#email').getAttribute('aria-describedby'), 'email-error')
          assert.equal(await page.locator('#email-error').isVisible(), true)
        }

        const typography = await page.evaluate(() => ({ family: getComputedStyle(document.querySelector('.id-v4-form')).fontFamily, fonts: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family) }))

        assert.ok(typography.family.includes('Geist Web'))
        assert.ok(typography.fonts.includes('Geist Web'))
      }

      if (path === '/login/invalid-email' || path === '/consent') await page.screenshot({ path: `${output}/${javaScriptEnabled ? 'scripted' : 'no-js'}-${path.replaceAll('/', '-')}.png`, fullPage: true })
      checks.push({ path, javaScriptEnabled, colorScheme: 'dark', reducedMotion: 'reduce', status: response.status(), result: 'pass' })
    }

    assert.deepEqual(errors, [])
    await context.close()
  }

  await writeFile(`${output}/results.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), scope: 'fictional-local-renderers-no-authentication', checks }, null, 2))
  console.log(`${checks.length} local browser contracts passed; ${output}/results.json`)
} finally {
  await browser.close()
}
