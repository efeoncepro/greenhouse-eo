import { writeFileSync } from 'node:fs'

import { chromium, type Page } from 'playwright'

const url = 'https://efeoncepro.com/aeo-2/'
const screenshotDir = '.captures'

type CapturedRequest = {
  url: string
  method: string
  body: unknown
}

const piiNeedles = [
  'Ana Publica',
  'ana@gmail.com',
  'Julio Empresa',
  'julio@empresa-demo.com',
  'empresa-demo.com',
]

const fillRequiredFields = async (page: Page, email: string) => {
  await page.locator('.gh-aeo-conversion greenhouse-form [name="fullName"]').fill(email.includes('gmail') ? 'Ana Publica' : 'Julio Empresa')
  await page.locator('.gh-aeo-conversion greenhouse-form [name="email"]').fill(email)
  await page.locator('.gh-aeo-conversion greenhouse-form [name="brandName"]').fill('Empresa Demo')
  await page.locator('.gh-aeo-conversion greenhouse-form [name="brandWebsite"]').fill('empresa-demo.com')
}

const readFirstChevronState = async (page: Page, label: string) => page
  .locator('.gh-aeo-conversion greenhouse-form [role="combobox"]')
  .first()
  .evaluate((trigger, stateLabel) => {
    const icon = trigger.querySelector('.ghf-select-icon')
    const iconStyle = icon ? getComputedStyle(icon) : null
    const beforeStyle = icon ? getComputedStyle(icon, '::before') : null

    return {
      label: stateLabel,
      expanded: trigger.getAttribute('aria-expanded'),
      iconTransform: iconStyle?.transform ?? null,
      beforeTransform: beforeStyle?.transform ?? null,
    }
  }, label)

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
  const captured: CapturedRequest[] = []

  try {
    await page.addInitScript(() => {
      ;(window as unknown as { dataLayer: unknown[] }).dataLayer = []
    })

    await page.route('**/api/public/growth/forms/**/verify-email', async route => {
      const request = route.request()
      const body = request.postDataJSON() as { email?: string } | null
      const email = body?.email ?? ''

      captured.push({ url: request.url(), method: request.method(), body })

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          email.endsWith('@gmail.com')
            ? { outcome: 'ok', syntaxValid: true, isCorporate: false, isDisposable: false, isRoleBased: false, isFreeProvider: true, deliverable: 'unknown', quality: 'suspect', suggestion: null, reasonCode: 'email_not_corporate' }
            : { outcome: 'ok', syntaxValid: true, isCorporate: true, isDisposable: false, isRoleBased: false, isFreeProvider: false, deliverable: 'unknown', quality: 'verified', suggestion: null, reasonCode: null }
        ),
      })
    })

    await page.route('**/api/public/growth/forms/**/submit', async route => {
      const request = route.request()

      captured.push({ url: request.url(), method: request.method(), body: request.postDataJSON() })

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, submissionId: 'sub-live-behavior-smoke' }),
      })
    })

    await page.goto(`${url}?gh_aeo_live_behavior_gate=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('.gh-aeo-conversion greenhouse-form .ghf-btn', { timeout: 30000 })
    await page.locator('.gh-aeo-conversion').scrollIntoViewIfNeeded()

    const comboboxes = page.locator('.gh-aeo-conversion greenhouse-form [role="combobox"]')
    const comboboxCount = await comboboxes.count()

    if (comboboxCount !== 2) {
      throw new Error(`Expected 2 premium combobox dropdowns; found ${comboboxCount}`)
    }

    await comboboxes.nth(0).click()
    await page.waitForSelector('.gh-aeo-conversion greenhouse-form [role="listbox"]:not([hidden])', { timeout: 5000 })
    await page.waitForTimeout(220)

    const dropdownAria = await comboboxes.nth(0).evaluate(element => ({
      role: element.getAttribute('role'),
      expanded: element.getAttribute('aria-expanded'),
      hasControls: Boolean(element.getAttribute('aria-controls')),
      hasActiveDescendant: Boolean(element.getAttribute('aria-activedescendant')),
      optionCount: document.querySelectorAll('.gh-aeo-conversion greenhouse-form [role="listbox"]:not([hidden]) [role="option"]').length,
    }))

    if (dropdownAria.expanded !== 'true' || !dropdownAria.hasControls || dropdownAria.optionCount < 4) {
      throw new Error(`Premium dropdown ARIA/listbox contract failed: ${JSON.stringify(dropdownAria)}`)
    }

    const chevronOpen = await readFirstChevronState(page, 'open')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(220)

    const chevronClosed = await readFirstChevronState(page, 'closedAfterOpen')

    if (
      chevronOpen.iconTransform !== 'none' ||
      chevronClosed.iconTransform !== 'none' ||
      chevronOpen.beforeTransform === chevronClosed.beforeTransform ||
      chevronClosed.expanded !== 'false'
    ) {
      throw new Error(`Premium dropdown chevron contract failed: ${JSON.stringify({ chevronOpen, chevronClosed })}`)
    }

    const fullName = page.locator('.gh-aeo-conversion greenhouse-form [name="fullName"]').first()

    await fullName.focus()

    const focus = await fullName.evaluate(node => {
      const element = node as HTMLInputElement
      const style = getComputedStyle(element)

      return {
        activeName: document.activeElement instanceof HTMLInputElement ? document.activeElement.name : null,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      }
    })

    if (focus.activeName !== 'fullName' || (focus.outlineStyle === 'none' && focus.boxShadow === 'none')) {
      throw new Error(`Focus affordance failed: ${JSON.stringify(focus)}`)
    }

    await fillRequiredFields(page, 'ana@gmail.com')
    await page.locator('.gh-aeo-conversion greenhouse-form [name="email"]').blur()
    await page.waitForSelector('.gh-aeo-conversion greenhouse-form .ghf-error', { timeout: 8000 })
    await page.locator('.gh-aeo-conversion greenhouse-form .ghf-btn').click()
    await page.waitForTimeout(500)

    const submitAfterPublicEmail = captured.filter(entry => entry.url.includes('/submit')).length

    if (submitAfterPublicEmail !== 0) {
      throw new Error('Public email gate allowed a submit request')
    }

    await page.evaluate(`
      window.turnstile = {
        render: function (_container, options) {
          setTimeout(function () {
            if (options && typeof options.callback === 'function') {
              options.callback('turnstile-live-behavior-token');
            }
          }, 0);

          return 'widget-live-behavior';
        },
        execute: function () {},
        reset: function () {}
      };
    `)

    await page.locator('.gh-aeo-conversion greenhouse-form [name="email"]').fill('julio@empresa-demo.com')
    await page.locator('.gh-aeo-conversion greenhouse-form [name="email"]').blur()
    await page.waitForTimeout(250)
    await page.locator('.gh-aeo-conversion greenhouse-form .ghf-btn').click()
    await page.waitForFunction(
      `Boolean(document.querySelector('.gh-aeo-conversion greenhouse-form .ghf-success-card, .gh-aeo-conversion greenhouse-form .ghf-status--success'))`,
      null,
      { timeout: 10000 }
    )

    const submit = captured.find(entry => entry.url.includes('/submit'))

    if (!submit || typeof submit.body !== 'object' || submit.body === null) {
      throw new Error('Expected captured submit body')
    }

    const submitBody = submit.body as { captchaToken?: string }

    if (submitBody.captchaToken !== 'turnstile-live-behavior-token') {
      throw new Error(`Submit captchaToken is ${submitBody.captchaToken}; expected fake Turnstile token`)
    }

    const dataLayer = await page.evaluate(() => (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [])
    const dataLayerJson = JSON.stringify(dataLayer)
    const piiLeaks = piiNeedles.filter(needle => dataLayerJson.includes(needle))

    if (piiLeaks.length > 0) {
      throw new Error(`dataLayer leaked PII needles: ${piiLeaks.join(', ')}`)
    }

    const overflowX = await page.evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)

    if (overflowX !== 0) {
      throw new Error(`Live behavior page has horizontal overflow: ${overflowX}px`)
    }

    const screenshot = `${screenshotDir}/aeo-form-live-behavior-desktop.png`

    await page.screenshot({ path: screenshot, fullPage: false })

    const payload = {
      ok: true,
      url,
      contract: 'AEO live renderer behavior: premium dropdown ARIA, focus, corporate email gate, Turnstile captchaToken boundary, no PII in dataLayer',
      dropdownAria,
      chevron: {
        open: chevronOpen,
        closedAfterOpen: chevronClosed,
      },
      focus,
      capturedRequests: captured.map(entry => ({
        url: entry.url.split('?')[0],
        method: entry.method,
        bodyKeys: typeof entry.body === 'object' && entry.body !== null ? Object.keys(entry.body as Record<string, unknown>).sort() : [],
      })),
      dataLayerEventCount: dataLayer.length,
      overflowX,
      screenshot,
    }

    writeFileSync(`${screenshotDir}/aeo-form-live-behavior-manifest.json`, `${JSON.stringify(payload, null, 2)}\n`)
    console.log(JSON.stringify(payload, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(`public-website:verify-aeo-form-live-behavior failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
