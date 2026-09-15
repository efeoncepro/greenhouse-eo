import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium } from 'playwright'

import { COUNTRIES_SORTED } from '@/lib/locale/countries'

const root = process.cwd()
const outputDir = resolve(root, '.captures/2026-09-15_contacto-country-select-preview')
const rendererPath = resolve(root, 'public/growth-forms/renderer-latest.js')
const countryDisplayNames = new Intl.DisplayNames(['es-CL', 'es'], { type: 'region' })

const countryOptions = COUNTRIES_SORTED.map(item => {
  const label = countryDisplayNames.of(item.code) ?? item.name

  return { value: label, label, countryCode: item.code }
})

const hostCssPath = resolve(
  root,
  '../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/css/contact-landing.css'
)

async function main() {
  const contractResponse = await fetch('https://greenhouse.efeoncepro.com/api/public/growth/forms/efeonce-contacto', {
    headers: { Origin: 'https://efeoncepro.com' }
  })

  assert(contractResponse.ok, `No se pudo leer el contrato live (${contractResponse.status})`)

  const contract = (await contractResponse.json()) as { fields: Array<Record<string, unknown>> }
  const country = contract.fields.find(field => field.key === 'country')

  assert(country, 'El contrato live no declara country')
  Object.assign(country, {
    type: 'select',
    placeholder: 'Selecciona tu país',
    presentation: { icon: 'globe', control: 'country_select' },
    options: countryOptions
  })

  await mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results: Array<Record<string, unknown>> = []

  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 980 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })

      await page.route('**/api/public/growth/forms/efeonce-contacto*', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(contract) })
      )
      await page.route('**/growth-forms/flags/*.svg', async route => {
        const code = new URL(route.request().url()).pathname.split('/').pop()

        assert(code && /^[a-z]{2}\.svg$/.test(code), 'Solicitud de bandera inválida')
        route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: await readFile(resolve(root, 'node_modules/circle-flags/flags', code))
        })
      })

      await page.setContent(`
      <main style="max-width:${viewport.width >= 1000 ? '860px' : '100%'};margin:0 auto;padding:32px;background:#fff">
        <section class="gh-contact__form-host">
          <greenhouse-form form="efeonce-contacto" surface="fhsf-efeonce-contacto" locale="es-CL"
            appearance="bare" color-scheme="light" base-url="https://greenhouse.efeoncepro.com"></greenhouse-form>
        </section>
      </main>
    `)
      await page.addStyleTag({ path: hostCssPath })
      await page.addScriptTag({ path: rendererPath })

      const trigger = page.locator('[name="country"].ghf-select-trigger')

      await trigger.waitFor({ state: 'visible' })
      await trigger.click()
      await page.locator('[data-value="Chile"] .ghf-country-flag').waitFor({ state: 'visible' })
      await page.waitForTimeout(180)

      const metrics = await page.evaluate(() => ({
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        expanded: document.querySelector('[name="country"]')?.getAttribute('aria-expanded'),
        options: document.querySelectorAll('[role="option"]').length,
        flags: document.querySelectorAll('.ghf-select-option .ghf-country-flag').length,
        triggerHeight: document.querySelector('[name="country"]')?.getBoundingClientRect().height ?? 0,
        overlayOwnsPoint: (() => {
          const option = document.querySelector<HTMLElement>('[data-value="Perú"]')

          if (!option) return false

          const box = option.getBoundingClientRect()

          return (
            document
              .elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
              ?.closest('[role="option"]') === option
          )
        })(),
        chevronOpenAngle: (() => {
          const transform = getComputedStyle(
            document.querySelector<HTMLElement>('.ghf-select-trigger .ghf-select-icon')!
          ).transform

          const matrix = new DOMMatrix(transform)

          return Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI)
        })()
      }))

      assert.equal(metrics.pageOverflow, 0)
      assert.equal(metrics.expanded, 'true')
      assert.equal(metrics.options, COUNTRIES_SORTED.length + 1)
      assert.equal(metrics.flags, COUNTRIES_SORTED.length)
      assert(metrics.triggerHeight >= 47)
      assert.equal(metrics.overlayOwnsPoint, true)
      assert.equal(Math.abs(metrics.chevronOpenAngle), 180)

      await page.screenshot({ path: resolve(outputDir, `${viewport.name}-open.png`), fullPage: true })
      await trigger.press('c')
      await trigger.press('o')
      await trigger.press('Enter')
      await page.screenshot({ path: resolve(outputDir, `${viewport.name}-selected.png`), fullPage: true })

      assert((await trigger.textContent())?.includes('Colombia'))
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
      await page.waitForTimeout(180)
      assert.equal(
        await trigger.locator('.ghf-select-icon').evaluate(element => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform)

          return Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI)
        }),
        0
      )

      results.push({ viewport, ...metrics, selected: 'Colombia' })
      await page.close()
    }
  } finally {
    await browser.close()
  }

  console.log(JSON.stringify({ outputDir, results }, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Falló la verificación visual del selector de país')
  process.exitCode = 1
})
