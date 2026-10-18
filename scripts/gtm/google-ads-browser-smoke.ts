/**
 * Chromium + real renderers/API clients; every request intercepted, zero external delivery.
 * pnpm exec tsx scripts/gtm/google-ads-browser-smoke.ts
 * Not a GTM runtime, CAPTCHA/provider or Ads attribution certification.
 */
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { build } from 'esbuild'
import { chromium } from 'playwright'

import {
  meetingAvailabilityFixture,
  meetingConfigFixture,
  meetingConfirmedFixture
} from '../../src/growth-meeting-renderer/fixtures'
import { GOOGLE_ADS_CONSENT_GETTER, GOOGLE_ADS_USER_DATA_GETTER } from './google-ads-plan'

async function main() {
  const output = resolve('.captures/google-ads-prerelease-20261018')

  mkdirSync(output, { recursive: true })
  // A failed rerun must never leave an older successful verdict at the same path.
  rmSync(resolve(output, 'result.json'), { force: true })

  const bundle = await build({
    entryPoints: ['scripts/gtm/fixtures/google-ads-browser-entry.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2021',
    alias: { '@': resolve('src') }
  })

  const scenarios = ['accepted', 'no_receipt', 'failed', 'denied', 'unknown', 'gpc', 'expired', 'wrong_key'] as const
  const results: Array<Record<string, unknown>> = []
  const browser = await chromium.launch()

  try {
    for (const host of ['efeoncepro.com', 'think.efeoncepro.com']) {
      for (const kind of ['form', 'meeting'] as const) {
        for (const scenario of scenarios) {
          const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            serviceWorkers: 'block',
            reducedMotion: 'reduce',
            timezoneId: 'America/Santiago'
          })

          const page = await context.newPage()
          const errors: string[] = []
          const requests: Array<{ method: string; path: string; context?: Record<string, unknown> }> = []
          let blocked = 0
          const id = crypto.randomUUID()
          const now = Date.now()

          const receipt = {
            version: 1,
            transactionId: id,
            conversionKey: kind === 'form' ? 'commercial_lead' : 'meeting_booking',
            issuedAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 600000).toISOString(),
            userData: { sha256_email_address: 'a'.repeat(64) }
          }

          if (scenario === 'expired') {
            receipt.issuedAt = new Date(now - 700000).toISOString()
            receipt.expiresAt = new Date(now - 100000).toISOString()
          }

          if (scenario === 'wrong_key') receipt.conversionKey = kind === 'form' ? 'meeting_booking' : 'commercial_lead'
          page.on('pageerror', () => errors.push('page_error'))
          await context.route('**/*', async route => {
            const req = route.request()
            const url = new URL(req.url())

            if (url.origin !== `https://${host}`) {
              blocked++
              await route.abort()

              return
            }

            if (url.pathname === '/__ads-smoke') {
              await route.fulfill({
                contentType: 'text/html',
                body: '<!doctype html><html lang="es"><title>Ads local verification</title><main></main></html>'
              })

              return
            }

            if (!url.pathname.startsWith('/api/public/growth/')) {
              blocked++
              await route.abort()

              return
            }

            const payload = req.postDataJSON() as { measurementContext?: Record<string, unknown> } | null

            requests.push({ method: req.method(), path: url.pathname, context: payload?.measurementContext })
            let body: unknown
            let status = 200

            if (url.pathname.endsWith('/config')) body = meetingConfigFixture()
            else if (url.pathname.endsWith('/availability')) body = meetingAvailabilityFixture()
            else if (url.pathname.endsWith('/verify-email'))
              body = { outcome: 'ok', accepted: true, syntaxValid: true, isCorporate: true, isDisposable: false }
            else if (url.pathname.endsWith('/submit')) {
              status = scenario === 'failed' ? 422 : 202
              body = {
                outcome: scenario === 'failed' ? 'invalid' : 'accepted',
                submissionId: 'local-smoke',
                ...(scenario === 'no_receipt' ? {} : { googleAdsConversion: receipt })
              }
            } else if (url.pathname.endsWith('/book')) {
              body =
                scenario === 'failed'
                  ? {
                      outcome: 'error',
                      error: { code: 'provider_degraded', recovery: 'check_email', retryable: false }
                    }
                  : {
                      ...meetingConfirmedFixture(),
                      ...(scenario === 'no_receipt'
                        ? { conversionEligible: false, conversionReceipt: null }
                        : { googleAdsConversion: receipt })
                    }
            } else {
              blocked++
              await route.abort()

              return
            }

            await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
          })
          await page.goto(`https://${host}/__ads-smoke`)
          await page.evaluate(
            ({ scenario }) => {
              const root = document.documentElement

              for (const key of ['ads-consent', 'analytics-consent'])
                root.setAttribute(`data-efeonce-${key}`, 'granted')

              if (scenario !== 'unknown')
                for (const key of ['ad-storage', 'analytics-storage', 'ad-user-data', 'ad-personalization']) {
                  root.setAttribute(`data-efeonce-google-${key}`, scenario === 'denied' ? 'denied' : 'granted')
                }

              Object.defineProperty(navigator, 'globalPrivacyControl', { value: scenario === 'gpc' })
              ;(window as unknown as Window & { dataLayer?: unknown[] }).dataLayer = []
            },
            { scenario }
          )
          await page.addScriptTag({ content: bundle.outputFiles[0].text })
          await page.evaluate(kind => window.mountAdsSmoke(kind), kind)

          if (kind === 'form') {
            await page.locator('[name=work_email]').fill('qa@example.test')
            await page.locator('[name=brand]').fill('Local QA')
            await page.locator('[data-ghf-consent=tos]').check()
            await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
          } else {
            await page.locator('.ghm-calendar-day[aria-pressed=true]').click()
            await page.locator('.ghm-slot').first().click()
            await page.locator('.ghm-agenda .ghm-primary').click()

            for (const [name, value] of Object.entries({
              firstName: 'Local',
              lastName: 'QA',
              email: 'qa@example.test',
              company: 'Local QA'
            })) {
              await page.locator(`[name=${name}]`).fill(value)
            }

            await page.locator('.ghm-check input[type=checkbox]').first().check()
            await page.locator('.ghm-form').evaluate((form: HTMLFormElement) => form.requestSubmit())
          }

          await page.waitForFunction(
            ({ kind, scenario }) => {
              if (kind === 'form') {
                const events = (window as unknown as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer ?? []

                return events.some(
                  e =>
                    e.event === (scenario === 'failed' ? 'gh_form_submission_rejected' : 'gh_form_submission_accepted')
                )
              }

              return ['confirmed', 'ambiguous', 'error'].includes(
                document.querySelector('main')?.dataset.ghmState ?? ''
              )
            },
            { kind, scenario }
          )
          assert.equal(requests.filter(r => r.path.endsWith(kind === 'form' ? '/submit' : '/book')).length, 1)

          const state = await page.evaluate(
            ({ id }) => {
              const win = window as unknown as Window & {
                dataLayer?: Array<Record<string, unknown>>
                efeonceReadGoogleAdsUserData?: (id: string) => unknown
                efeonceEmitGoogleAdsConversion?: (r: unknown, k: string) => boolean
              }

              const events = win.dataLayer ?? []

              return {
                ads: events.filter(e => e.event === 'gh_ads_conversion').length,
                hasReserved: Boolean(win.efeonceReadGoogleAdsUserData?.(id)),
                leaked:
                  JSON.stringify(events).includes('a'.repeat(64)) || JSON.stringify(events).includes('qa@example.test')
              }
            },
            { id }
          )

          const positive = scenario === 'accepted'

          assert.equal(state.ads, positive ? 1 : 0, `${host}/${kind}/${scenario}: Ads count`)
          assert.equal(state.hasReserved, positive)
          assert.equal(state.leaked, false)

          const consentAllowed = await page.evaluate(source => {
            // Only canonical, source-controlled GTM CJS is executed in this isolated browser.
            return Function(`return (${source})()`)()
          }, GOOGLE_ADS_CONSENT_GETTER)

          assert.equal(consentAllowed, ['denied', 'unknown', 'gpc'].includes(scenario) ? '0' : '1')
          const businessContext = requests.find(r => r.path.endsWith(kind === 'form' ? '/submit' : '/book'))?.context

          assert(businessContext, 'API client must read consent at submission time')
          assert.equal(businessContext.globalPrivacyControl, scenario === 'gpc')
          assert.equal(businessContext.googleConsent === undefined, scenario === 'unknown')

          if (positive) {
            const reservedRead = await page.evaluate(
              source => Boolean(Function(`return (${source})()`)()),
              GOOGLE_ADS_USER_DATA_GETTER.replace('{{Efeonce Ads - transaction_id}}', JSON.stringify(id))
            )

            assert.equal(reservedRead, true, 'canonical GTM getter resolves reserved data')

            const extra = await page.evaluate(
              ({ receipt, id }) => {
                const win = window as unknown as Window & {
                  dataLayer?: Array<Record<string, unknown>>
                  efeonceEmitGoogleAdsConversion: (r: unknown, k: string) => boolean
                  efeonceReadGoogleAdsUserData: (id: string) => unknown
                }

                const duplicate = win.efeonceEmitGoogleAdsConversion(receipt, receipt.conversionKey)

                const e = win.dataLayer!.find(e => e.event === 'gh_ads_conversion')!

                ;(e.eventCallback as () => void)()

                return { duplicate, cleared: win.efeonceReadGoogleAdsUserData(id) === undefined }
              },
              { receipt, id }
            )

            assert.deepEqual(extra, { duplicate: false, cleared: true })
            await page.screenshot({ path: resolve(output, `${host}-${kind}-accepted.png`), fullPage: true })
          }

          assert.deepEqual(errors, [])
          assert.equal(blocked, 0)
          results.push({
            host,
            kind,
            scenario,
            status: 'PASS',
            adsEvents: state.ads,
            privacyLeak: state.leaked,
            businessRequests: 1,
            requestContextPresent: Boolean(
              requests.find(r => r.path.endsWith(kind === 'form' ? '/submit' : '/book'))?.context
            ),
            externalRequests: 0
          })
          await context.close()
        }
      }
    }

    writeFileSync(
      resolve(output, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          status: 'PASS',
          scope:
            'local Chromium; real renderers and API clients; simulated business responses; all network intercepted',
          results
        },
        null,
        2
      )
    )
    console.log(JSON.stringify({ status: 'PASS', scenarios: results.length, externalRequests: 0, output }))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
