import assert from 'node:assert/strict'
import { writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium } from 'playwright'

const out = resolve('.captures/2026-10-20-blog-growth-form')

/** --submit: one controlled internal subscription. Captcha stays real, no token interception or bypass. */
async function main() {
  const submit = process.argv.includes('--submit')
  const browser = await chromium.launch({ channel: 'chrome', headless: !submit })
  const evidence: any[] = []

  try {
    for (const width of submit ? [1440] : [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      const hits: any[] = []
      const responses: any[] = []
      const consoleErrors: string[] = []

      page.on('pageerror', e => consoleErrors.push(e.message.slice(0, 250)))
      page.on('response', async r => {
        const u = new URL(r.url())

        if (/\/(g\/)?collect$/.test(u.pathname)) {
          const p = new URLSearchParams(r.request().postData() ?? '')
          const get = (k: string) => p.get(k) ?? u.searchParams.get(k)

          hits.push({
            host: u.hostname,
            status: r.status(),
            event: get('en'),
            tid: get('tid'),
            formSlug: get('ep.form_slug'),
            formKind: get('ep.form_kind'),
            surface: get('ep.surface_id'),
            eventId: get('evnid') ?? get('ep.event_id'),
            gcs: get('gcs')
          })
        }

        if (u.pathname.includes('/api/public/growth/forms/') && r.request().method() === 'POST') {
          const d = await r.json().catch(() => ({}))

          responses.push({
            httpStatus: r.status(),
            outcome: d.outcome,
            submissionId: d.submissionId,
            reasonClass: d.reasonClass
          })
        }
      })
      await page.goto('https://efeoncepro.com/blog/', { waitUntil: 'domcontentloaded' })
      const target = page.locator('.elementor-element-4246f0d')

      await target.locator('input[type=email]').waitFor({ timeout: 30000 })
      const cookie = page.getByRole('button', { name: submit ? 'Aceptar todas' : 'Solo esenciales', exact: true })

      await cookie.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined)
      if (await cookie.isVisible()) await cookie.click()
      await target.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)

      const info = await target.evaluate(n => ({
        formKey: n.querySelector('greenhouse-form')?.getAttribute('form-key'),
        emailCount: n.querySelectorAll('input[type=email]').length,
        checkboxes: n.querySelectorAll('input[type=checkbox]').length,
        checked: (n.querySelector('input[type=checkbox]') as HTMLInputElement)?.checked,
        text: n.textContent,
        overflow: n.scrollWidth > n.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        topEmail: n.querySelector('input[type=email]')!.getBoundingClientRect().top,
        topButton: n.querySelector('button[type=submit]')!.getBoundingClientRect().top
      }))

      assert.equal(info.formKey, '6bc62588-a4a0-4214-9501-13b0c2948c81')
      assert.equal(info.emailCount, 1)
      assert.equal(info.checkboxes, 1)
      assert.equal(info.checked, false)
      assert(!info.overflow && !info.pageOverflow)
      assert(Math.abs(info.topEmail - info.topButton) < 1)
      await target.screenshot({ path: resolve(out, `live-form-${width}.png`) })

      if (submit) {
        const prior = JSON.parse(await readFile(resolve(out, 'browser-submit.json'), 'utf8').catch(() => '{}'))

        assert(
          !prior.responses?.some((r: any) => r.submissionId),
          'An accepted occurrence exists: inspect, never resubmit'
        )
        const email = 'greenhouse-smoke+forms-blog-20261020@efeonce.org'

        await target.locator('input[type=email]').fill(email)
        await target.locator('input[type=checkbox]').check()
        await target.locator('button[type=submit]').click()
        await page.waitForTimeout(22000)

        const events = await page.evaluate(() =>
          ((window as any).dataLayer ?? [])
            .filter((e: any) => e?.event?.startsWith('gh_form_'))
            .map((e: any) => ({
              event: e.event,
              form_kind: e.form_kind,
              form_slug: e.form_slug,
              correlation_id: e.correlation_id,
              reason_class: e.reason_class
            }))
        )

        const result = {
          at: new Date().toISOString(),
          responses,
          hits,
          events,
          visibleText: await target.innerText(),
          consoleErrors
        }

        await writeFile(resolve(out, 'browser-submit.json'), JSON.stringify(result, null, 2))
        console.log(JSON.stringify(result))
        assert(
          responses.some(r => r.submissionId),
          'No accepted public submission; inspect captcha/network before retry'
        )
      } else {
        await target.locator('button[type=submit]').click()
        assert.equal(responses.length, 0)
        assert((await target.locator('[aria-invalid=true]').count()) > 0)
        evidence.push({ width, ...info, consoleErrors, network: hits })
      }

      await page.close()
    }
  } finally {
    await browser.close()
  }

  if (!submit) {
    await writeFile(resolve(out, 'live-visual.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  }
}

main().catch(e => {
  console.error(e.message)
  process.exitCode = 1
})
