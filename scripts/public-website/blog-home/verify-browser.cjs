/**
 * Browser check of the live blog home (`pnpm public-website:blog-home verify --browser`): at every width from phone
 * to wide desktop the page has no horizontal scroll, exactly one H1 and the board for that width is the visible one.
 *
 *   node scripts/public-website/blog-home/verify-browser.cjs [url]
 */
const { chromium } = require('playwright')

const url = process.argv[2] || 'https://efeoncepro.com/blog/'
const WIDTHS = [320, 390, 768, 820, 1024, 1100, 1440, 1920]

const board = w => (w >= 1100 ? '.eobh-d' : w >= 768 ? '.eobh-t' : '.eobh-m')

;(async () => {
  const browser = await chromium.launch()
  let failed = false

  for (const width of WIDTHS) {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage()

    await page.goto(`${url}${url.includes('?') ? '&' : '?'}vb=${Date.now()}`, { waitUntil: 'load', timeout: 90000 })
    await page.waitForTimeout(1500)

    const r = await page.evaluate(sel => {
      const el = document.querySelector(`#eobh ${sel}`)

      return {
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: document.querySelectorAll('h1').length,
        board: Boolean(el && el.getBoundingClientRect().height > 0)
      }
    }, board(width))

    const ok = r.scroll === 0 && r.h1 === 1 && r.board

    failed ||= !ok
    console.log(`${ok ? '✓' : '✗'} ${width}px · overflow ${r.scroll}px · H1 ${r.h1} · board ${r.board ? 'visible' : 'missing'}`)
  }

  await browser.close()
  process.exit(failed ? 1 : 0)
})()
