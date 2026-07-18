// TASK-1427 — Evidencia E2E live del CTA en la página de prueba WordPress.
// Temporal (patrón ISSUE-071 sanity script). Corre contra producción, solo lectura + eventos reales.
import { mkdirSync } from 'node:fs'

import { chromium } from 'playwright'

const PAGE_URL = 'https://efeoncepro.com/greenhouse-cta-prueba/'
const OUT = '.captures/task-1427-wp-test'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

const run = async ({ label, viewport, doInteraction }) => {
  const ctx = await browser.newContext({ viewport, locale: 'es-CL' })
  const page = await ctx.newPage()

  const collectHits = []
  const ingestHits = []

  page.on('request', req => {
    const url = req.url()

    if (url.includes('/g/collect')) {
      const en = new URL(url).searchParams.get('en')

      collectHits.push(en ?? '(batch)')

      if (req.method() === 'POST') {
        const body = req.postData() ?? ''

        for (const line of body.split('\n')) {
          const m = line.match(/en=([a-z_]+)/)

          if (m) collectHits.push(m[1])
        }
      }
    }

    if (url.includes('/api/public/growth/ctas/events')) ingestHits.push(req.method())
  })

  const ingestResponses = []

  page.on('response', res => {
    if (res.url().includes('/api/public/growth/ctas/events')) ingestResponses.push(res.status())
  })

  await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 45000 })

  // Consent: aceptar CMP si existe; siempre reforzar con consent update explícito (LEARNINGS §7b).
  for (const sel of ['#cmplz-btn-accept', '.cmplz-accept', '#cookie_action_close_header', 'button:has-text("Aceptar")']) {
    const btn = page.locator(sel).first()

    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {})
      break
    }
  }

  await page.evaluate(() => {
    window.dataLayer = window.dataLayer || []

    function gtag() { window.dataLayer.push(arguments) }

    gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted' })
  })

  // Esperar el card ready (el renderer setea data-state en el element)
  const el = page.locator('greenhouse-cta')

  await el.waitFor({ state: 'attached', timeout: 20000 })
  await page.waitForFunction(
    () => {
      const n = document.querySelector('greenhouse-cta')

      return n && n.getAttribute('data-state') === 'ready' && n.offsetHeight > 0
    },
    { timeout: 25000 }
  ).catch(() => {})

  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(2500) // viewed requiere >=50% visible sostenido

  const state = await page.evaluate(() => document.querySelector('greenhouse-cta')?.getAttribute('data-state'))

  await page.screenshot({ path: `${OUT}/${label}-ready.png`, fullPage: false })

  let formState = 'skipped'

  if (doInteraction) {
    const cta = el.locator('button, a').filter({ hasText: /./ }).first()

    await cta.click().catch(() => {})
    await page.waitForTimeout(3500)
    formState = await page.evaluate(() => {
      const f = document.querySelector('greenhouse-form')

      return f ? `mounted h=${f.offsetHeight}` : 'not-mounted'
    })
    await page.screenshot({ path: `${OUT}/${label}-after-click.png`, fullPage: false })

    // cerrar el form si abrió en modal/overlay
    await page.keyboard.press('Escape').catch(() => {})
  }

  const dlEvents = await page.evaluate(() =>
    (window.dataLayer || [])
      .filter(e => e && typeof e === 'object' && typeof e.event === 'string' && e.event.startsWith('greenhouse_cta'))
      .map(e => ({ event: e.event, cta_slug: e.cta_slug, cta_location: e.cta_location, placement: e.placement }))
  )

  await page.waitForTimeout(2000)

  console.log(JSON.stringify({
    label,
    state,
    formState,
    dlEvents,
    ingest: { requests: ingestHits.length, statuses: ingestResponses },
    gaCollect: [...new Set(collectHits.filter(e => e && e.startsWith('greenhouse_cta')))],
    gaCollectTotal: collectHits.length
  }, null, 2))

  await ctx.close()
}

await run({ label: 'desktop-1440', viewport: { width: 1440, height: 900 }, doInteraction: true })
await run({ label: 'mobile-390', viewport: { width: 390, height: 844 }, doInteraction: false })

await browser.close()
