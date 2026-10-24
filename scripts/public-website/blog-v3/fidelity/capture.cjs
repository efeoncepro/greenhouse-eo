/**
 * TASK-2051 — Captures one PNG per section of a page at the board's viewport.
 *
 *   node fidelity/capture.cjs reference <outDir>            approved canvas (deviated reference), both boards
 *   node fidelity/capture.cjs bound <outDir>                bound template + fixtures (pipeline self-check)
 *   node fidelity/capture.cjs url <outDir> <url> <board>    a real page (local preview or WordPress), one board
 *
 * In `url` mode the page is captured as served (JavaScript off: the browser's first render is byte-identical to the
 * server HTML, see test-php-parity.cjs) and the site chrome that floats over the content (canonical header,
 * theme switcher, social bar: every fixed or sticky element outside #eobh) is hidden, since it is an allowed
 * deviation. Serve the page with the frozen clock (preview/serve.cjs --now) so the countdown matches.
 *
 * Sections are located by `[data-capture]` when present, otherwise by order of the board root's <section> children.
 * Animations are fast-forwarded to their end state (Playwright `animations: 'disabled'`) and fonts are awaited.
 */
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const { chromium } = require('playwright')

const { BOARDS } = require('./sections.cjs')
const { boardPage, SRC } = require('./page.cjs')

const assets = JSON.parse(fs.readFileSync(path.join(SRC, 'assets.json'), 'utf8'))
const byId = Object.fromEntries(Object.values(assets).map(a => [a.id, a.file]))
const TYPES = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' }

function serve(pages) {
  const server = http.createServer((req, res) => {
    const blob = req.url.match(/^\/_blob\/([0-9a-f]{32})/)

    if (blob && byId[blob[1]]) {
      const f = byId[blob[1]]

      res.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' })

      return fs.createReadStream(path.join(SRC, 'assets', f)).pipe(res)
    }

    const page = pages[req.url.replace(/^\//, '')]

    if (page) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })

      return res.end(page)
    }

    res.writeHead(404).end()
  })

  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function captureSections(browser, url, board, outDir, { site = false } = {}) {
  const spec = BOARDS[board]
  const ctx = await browser.newContext({ viewport: spec.viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference', javaScriptEnabled: !site })
  const page = await ctx.newPage()

  if (process.env.CAPTURE_DEBUG) console.error('goto', url, board)
  // The live shell never goes network-idle (third-party embeds): wait for load and let late images settle.
  await page.goto(url, { waitUntil: site ? 'load' : 'networkidle', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)

  if (site) {
    await page.waitForTimeout(1500)
    // addStyleTag waits on page scripts, which are off here: inject through the protocol instead.
    await page.evaluate(() => {
      const st = document.createElement('style')

      st.textContent = '#site-nav,.axis-site-nav{visibility:hidden !important}'
      document.head.appendChild(st)

      for (const el of document.querySelectorAll('body *')) {
        const pos = getComputedStyle(el).position

        if ((pos === 'fixed' || pos === 'sticky') && !el.closest('#eobh')) el.style.setProperty('visibility', 'hidden', 'important')
      }
    })
  }

  const tagged = await page.locator('[data-capture^="blog-"]').count()
  const rootSel = site ? { 'Portada-v3': '#eobh .eobh-d > .v3', 'Tablet-v3': '#eobh .eobh-t > .v3', 'Movil-v3': '#eobh .eobh-m > .m3' }[board] : board === 'Movil-v3' ? '.m3' : '.v3'
  const results = []

  for (const [i, name] of spec.sections.entries()) {
    const loc = tagged ? page.locator(`${rootSel} [data-capture="${name}"]`).first() : page.locator(`${rootSel} > section`).nth(i)
    const file = path.join(outDir, `${board}--${String(i).padStart(2, '0')}-${name}.png`)

    if (!(await loc.count())) {
      results.push({ name, missing: true })
      continue
    }

    if (process.env.CAPTURE_DEBUG) console.error('section', board, name)
    await loc.scrollIntoViewIfNeeded()
    await loc.screenshot({ path: file, animations: 'disabled', caret: 'hide' })
    results.push({ name, file: path.basename(file) })
  }

  await ctx.close()

  return results
}

async function main() {
  const [mode, outDir, url, onlyBoard] = process.argv.slice(2)

  if (!mode || !outDir) throw new Error('Usage: capture.cjs <reference|bound|url> <outDir> [url board]')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const report = {}

  try {
    if (mode === 'url') {
      for (const b of onlyBoard ? [onlyBoard] : Object.keys(BOARDS)) report[b] = await captureSections(browser, url, b, outDir, { site: true })
    } else {
      const fixtures = {
        'Portada-v3': JSON.parse(fs.readFileSync(path.join(SRC, 'fixture.json'), 'utf8')),
        'Movil-v3': JSON.parse(fs.readFileSync(path.join(SRC, 'fixture.mobile.json'), 'utf8')),
      }

      fixtures['Tablet-v3'] = fixtures['Portada-v3']

      const pages = Object.fromEntries(Object.keys(BOARDS).map(b => [b, boardPage(b, { bound: mode === 'bound', data: fixtures[b] })]))
      const server = await serve(pages)
      const base = `http://127.0.0.1:${server.address().port}/`

      for (const b of Object.keys(BOARDS)) report[b] = await captureSections(browser, base + b, b, outDir)
      server.close()
    }
  } finally {
    await browser.close()
  }

  fs.writeFileSync(path.join(outDir, 'capture.json'), JSON.stringify({ mode, url: url || null, capturedAt: new Date().toISOString(), report }, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 1))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
