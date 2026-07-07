/**
 * Smoke test de medición (capa delgada de robustez — ADR
 * GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1).
 *
 * Verifica en vivo que la medición sigue funcionando en los hosts/eventos clave:
 * carga cada host con Playwright (User-Agent real + consent + engagement) y confirma
 * que los hits `/g/collect` salen a la propiedad correcta (`G-KYPPY57M14`). Atrapa
 * regresiones (Site Kit cambió, drift de container, consent roto) que de otro modo
 * solo se verían por casualidad. NO despliega nada.
 *
 * Uso:  pnpm measurement:smoke
 * Exit 1 si algún check crítico falla.
 */
import { chromium } from 'playwright'

const TID = 'G-KYPPY57M14'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const grantConsent = (page) =>
  page.evaluate(() => {
    try {
      if (typeof window.gtag === 'function')
        window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' })
    } catch {
      /* noop */
    }
  })

const checkHost = async (browser, url, { fireLead = false } = {}) => {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const hits = new Set()

  page.on('request', (r) => {
    const u = r.url()

    if ((u.includes('/g/collect') || /\/collect\?/.test(u)) && u.includes(`tid=${TID}`)) {
      const en = (u.match(/[?&]en=([^&]+)/) || [])[1]

      if (en) hits.add(decodeURIComponent(en))
    }
  })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await grantConsent(page)
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(1200) }

  if (fireLead) {
    await page.evaluate(() => {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ event: 'gh_form_submission_accepted', form_slug: 'smoke-test', form_kind: 'smoke', surface_id: 'measurement-smoke' })
    })
    await page.waitForTimeout(4000)
  }

  await ctx.close()
  
return hits
}

const main = async () => {
  const browser = await chromium.launch()
  const results = []

  try {
    const wp = await checkHost(browser, 'https://efeoncepro.com/')

    results.push({ name: 'efeoncepro.com page_view', ok: wp.has('page_view'), detail: [...wp].join(', ') })

    const think = await checkHost(browser, 'https://think.efeoncepro.com/', { fireLead: true })

    results.push({ name: 'think.efeoncepro.com page_view', ok: think.has('page_view'), detail: [...think].join(', ') })
    results.push({ name: 'generate_lead (form submit)', ok: think.has('generate_lead'), detail: [...think].join(', ') })
  } finally {
    await browser.close()
  }

  console.log('=== Measurement smoke (property 486264460 / G-KYPPY57M14) ===')
  for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}  (en: ${r.detail || '—'})`)
  const failed = results.filter((r) => !r.ok)

  if (failed.length) { console.error(`\n❌ ${failed.length} check(s) fallaron — revisar container/consent/Site Kit`); process.exit(1) }
  console.log('\n✅ Medición OK en todos los hosts/eventos clave.')
}

main().catch((e) => { console.error('FAIL:', e?.message ?? e); process.exit(1) })
