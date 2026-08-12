// Rollout TASK-1688/1689 — submit E2E en staging por el form nativo Growth Forms.
// Postulación de PRUEBA claramente marcada (HR la descarta en el Desk, precedente TASK-1378).
import { chromium } from 'playwright'

const BASE = 'https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app'
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const URL = `${BASE}/public/careers/EO-OPN-0061/apply`

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

const run = async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ extraHTTPHeaders: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {} })

  page.on('response', res => {
    if (res.url().includes('/api/public/growth') || res.url().includes('/api/public/hiring')) {
      log('HTTP', res.status(), res.request().method(), res.url().replace(BASE, ''))
      if (res.status() >= 400) res.text().then(t => log('  body:', t.slice(0, 300))).catch(() => {})
    }
  })

  log('abriendo', URL)
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Esperar el render del form nativo
  await page.waitForSelector('greenhouse-form input[name="firstName"], greenhouse-form [data-ghf-field-key="firstName"] input', { timeout: 45000 })
  log('form nativo renderizado')

  const within = page.locator('greenhouse-form')

  await within.locator('input[name="firstName"]').fill('Prueba')
  await within.locator('input[name="lastName"]').fill('TASK-1689 NO CONTACTAR')
  await within.locator('input[name="email"]').fill('task-1689-rollout@efeonce.org')

  // Campo nuevo TASK-1688 — país de residencia (premium composite select: combobox + listbox)
  const countryWrap = within.locator('[data-ghf-field-key="residenceCountryCode"]')

  await countryWrap.waitFor({ timeout: 15000 })
  await countryWrap.locator('button[role="combobox"]').click()
  await countryWrap.locator('.ghf-select-option', { hasText: 'Venezuela' }).first().click()
  log('país seleccionado: Venezuela')

  await within.locator('input[name="phone"]').fill('+56 9 4444 5555')

  const message = within.locator('textarea[name="message"]')

  if (await message.count()) {
    await message.fill('POSTULACIÓN DE PRUEBA del rollout TASK-1688/1689 — NO CONTACTAR. Verifica contacto completo + emails.')
  }

  // Consent
  const consent = within.locator('input[type="checkbox"]').first()

  await consent.check()
  log('consent marcado')

  // Submit
  await within.locator('button[type="submit"]').click()
  log('submit enviado — esperando success card (Turnstile invisible)')

  try {
    await page.waitForSelector('[data-capture="careers-apply-success"], .ghf-success', { timeout: 90000 })
    log('SUCCESS card visible')
  } catch {
    const errors = await page.locator('greenhouse-form .ghf-error').allInnerTexts().catch(() => [])

    log('sin success card; errores visibles:', JSON.stringify(errors))
    await page.screenshot({ path: 'scripts/hiring/_sanity-task1689-e2e-fail.png', fullPage: true }).catch(() => {})
    log('screenshot: scripts/hiring/_sanity-task1689-e2e-fail.png')
  }

  await browser.close()
}

run().catch(err => { console.error('E2E FAIL:', err.message); process.exit(1) })
