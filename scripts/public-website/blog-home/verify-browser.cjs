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

// Each width busts the Kinsta cache (`vb=`), so eight uncached hits in a row reach the origin and the site sometimes
// cuts one off before it loads (2026-10-24: ERR_CONNECTION_TIMED_OUT at 1920, page fine on its own). Retry ONLY a
// network failure while opening the page; a page that loads and fails a check is never retried.
const RETRY_WAITS_MS = [5000, 15000]
// Only `page.goto` failures count (connection errors or the navigation timing out); a missing `#eobh` is a real failure.
const isNetworkFailure = error => /^page\.goto: (net::ERR_|Timeout \d+ms exceeded)/.test(String(error && error.message))

const open = async (browser, width) => {
  for (let attempt = 0; ; attempt++) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()

    try {
      // The page's own third parties (tag manager, chat) can hold the load event for minutes: wait for the home itself.
      await page.goto(`${url}${url.includes('?') ? '&' : '?'}vb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForSelector('#eobh', { timeout: 30000 })

      return { page, retries: attempt }
    } catch (error) {
      await context.close()
      if (!isNetworkFailure(error) || attempt >= RETRY_WAITS_MS.length) throw error
      console.log(`… ${width}px · ${String(error.message).split('\n')[0]} · reintento en ${RETRY_WAITS_MS[attempt] / 1000}s`)
      await new Promise(resolve => setTimeout(resolve, RETRY_WAITS_MS[attempt]))
    }
  }
}

;(async () => {
  const browser = await chromium.launch()
  let failed = false

  for (const width of WIDTHS) {
    let opened

    try {
      opened = await open(browser, width)
    } catch (error) {
      failed = true
      console.log(`✗ ${width}px · no abrió: ${String(error.message).split('\n')[0]}`)
      continue
    }

    const { page, retries } = opened

    await page.waitForTimeout(2500)

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
    console.log(
      `${ok ? '✓' : '✗'} ${width}px · overflow ${r.scroll}px · H1 ${r.h1} · board ${r.board ? 'visible' : 'missing'}` +
        (retries ? ` · ${retries} reintento(s) de red` : '')
    )
    await page.context().close()
  }

  await browser.close()
  process.exit(failed ? 1 : 0)
})()
