// TASK-1427 — Asserción consent-denied del wireframe: SIN consentimiento,
// el renderer sigue emitiendo al dataLayer pero NINGÚN greenhouse_cta_* sale por /g/collect.
import { chromium } from 'playwright'

const PAGE_URL = process.argv[2] ?? 'https://efeoncepro.com/greenhouse-cta-prueba/'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-CL' })
const page = await ctx.newPage()

const gaCtaHits = []

page.on('request', req => {
  const url = req.url()

  if (!url.includes('/g/collect')) return

  const en = new URL(url).searchParams.get('en') ?? ''
  const body = req.method() === 'POST' ? (req.postData() ?? '') : ''

  for (const name of [en, ...[...body.matchAll(/en=([a-z_]+)/g)].map(m => m[1])]) {
    if (name.startsWith('greenhouse_cta')) gaCtaHits.push(name)
  }
})

await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 45000 })

// NO aceptar CMP, NO consent update — estado default (denied/unknown)
const el = page.locator('greenhouse-cta')

await el.waitFor({ state: 'attached', timeout: 20000 })
await el.scrollIntoViewIfNeeded().catch(() => {})
await page.waitForTimeout(3000)

const cta = el.locator('button, a').filter({ hasText: /./ }).first()

await cta.click().catch(() => {})
await page.waitForTimeout(3000)

const dlEvents = await page.evaluate(() =>
  (window.dataLayer || [])
    .filter(e => e && typeof e === 'object' && typeof e.event === 'string' && e.event.startsWith('greenhouse_cta'))
    .map(e => e.event)
)

console.log(JSON.stringify({ url: PAGE_URL, dlEvents, gaCollectCtaHits: gaCtaHits }, null, 2))

await browser.close()
