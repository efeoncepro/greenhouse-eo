/** Local renderer/controller verification only. All factor responses and credentials are fictional mocks.
 * Run with the GET-only dev-ui-server.ts listening. No storage state, traces or credential logs.
 */
import assert from 'node:assert/strict'

import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:19036'

if (process.argv.length !== 2 || new URL(origin).hostname !== '127.0.0.1') throw new Error('Local harness only')
const browser = await chromium.launch({ headless: true })
let checks = 0
let violations = 0
const contexts = []

async function context() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })

  contexts.push(ctx)
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url())

    if (url.origin !== origin || route.request().method() !== 'GET') {
      violations++
      await route.abort()
    } else await route.continue()
  })
  const page = await ctx.newPage()

  page.on('pageerror', () => {
    violations++
  })
  page.on('console', message => {
    if (/content security policy|refused to (apply|execute|load|connect)/i.test(message.text())) violations++
  })
  
return { ctx, page }
}

async function mockPost(page, path, reply, onRequest = () => {}) {
  await page.route(`${origin}${path}`, async route => {
    const req = route.request()

    if (req.method() !== 'POST' || req.headers()['origin'] !== origin) violations++
    onRequest(req)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) })
  })
}

async function mockReturn(page) {
  await page.route(`${origin}/oauth/authorize?*`, route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Fictional return</title>' })
  )
}

try {
  const { page } = await context()

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })

    for (const path of ['/login', '/consent']) {
      const response = await page.goto(origin + path)

      assert.equal(response.status(), 200)
      assert.ok(response.headers()['content-security-policy'])

      const result = await page.evaluate(async () => {
        await document.fonts.ready
        
return {
          noOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
          fonts: ['400 16px Geist', '600 16px Geist', '700 24px Poppins'].every(font => document.fonts.check(font)),
          loaded: [...document.fonts].filter(font => font.status === 'loaded').length
        }
      })

      assert.equal(result.noOverflow, true)
      assert.equal(result.fonts, true)
      assert.ok(result.loaded >= 3)
      checks++
    }
  }

  const totp = (await context()).page
  let starts = 0,
    finishes = 0

  await mockReturn(totp)
  await mockPost(
    totp,
    '/auth/totp/enroll/start',
    {
      status: 'ready',
      secret: 'JBSWY3DPEHPK3PXP',
      backupCodes: ['fictional-backup-one', 'fictional-backup-two'],
      otpauthUri: 'otpauth://totp/Fictional?secret=JBSWY3DPEHPK3PXP&issuer=Fictional'
    },
    () => {
      starts++
    }
  )
  await mockPost(totp, '/auth/totp/enroll/finish', { status: 'verified' }, () => {
    finishes++
  })
  await totp.goto(origin + '/step-up/enroll')
  await totp.locator('[data-step-enroll]').click()
  await totp.locator('[data-step-setup]').waitFor({ state: 'visible' })
  await totp.waitForFunction(() => {
    const image = document.querySelector('[data-step-qr]')

    
return image.src.startsWith('data:image/') && image.complete && image.naturalWidth > 0
  })
  assert.equal(starts, 1)
  assert.doesNotMatch(await totp.locator('[data-step-code-label]').innerText(), /respaldo/i)
  await totp.locator('[name="code"]').fill('123456')
  await totp.locator('[data-step-submit]').click()
  await totp.waitForFunction(() => document.querySelector('[data-step-status]').textContent.includes('guardaste'))
  assert.equal(finishes, 0)
  await totp.locator('[name="saved"]').check()
  await totp.locator('[data-step-submit]').click()
  await totp.waitForURL(`${origin}/oauth/authorize?*`)
  assert.equal(finishes, 1)
  checks++

  const passkey = (await context()).page

  await passkey.addInitScript(() => {
    Object.defineProperty(navigator, 'credentials', {
      value: {
        get: async options => {
          if (options.publicKey.userVerification !== 'required') throw new Error('UV required')
          const buffer = () => new Uint8Array([1, 2, 3]).buffer

          
return {
            id: 'fictional-passkey',
            rawId: buffer(),
            type: 'public-key',
            getClientExtensionResults: () => ({}),
            response: { authenticatorData: buffer(), clientDataJSON: buffer(), signature: buffer(), userHandle: null }
          }
        }
      }
    })
  })
  let passkeyStarts = 0,
    passkeyFinishes = 0

  await mockReturn(passkey)
  await mockPost(
    passkey,
    '/auth/passkeys/step-up/start',
    {
      status: 'ready',
      options: {
        challenge: 'AQID',
        rpId: '127.0.0.1',
        userVerification: 'required',
        allowCredentials: [{ id: 'AQID', type: 'public-key' }]
      }
    },
    () => {
      passkeyStarts++
    }
  )
  await mockPost(passkey, '/auth/passkeys/step-up/finish', { status: 'verified' }, () => {
    passkeyFinishes++
  })
  await passkey.goto(origin + '/step-up')
  await passkey.locator('[data-step-passkey]').click()
  await passkey.waitForURL(`${origin}/oauth/authorize?*`)
  assert.equal(passkeyStarts, 1)
  assert.equal(passkeyFinishes, 1)
  checks++
  assert.equal(violations, 0)
  console.log(
    JSON.stringify({ passed: checks, violations, evidence: 'local renderers; mocked factors; not real authentication' })
  )
} catch {
  console.error('Local UI verification failed; no request payloads or credentials recorded.')
  process.exitCode = 1
} finally {
  for (const ctx of contexts) await ctx.close()
  await browser.close()
}
