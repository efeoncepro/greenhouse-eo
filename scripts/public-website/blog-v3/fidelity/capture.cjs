/**
 * TASK-2051 — Captures one PNG per section of a page at the board's viewport.
 *
 *   node fidelity/capture.cjs reference <outDir>            approved canvas (deviated reference), both boards
 *   node fidelity/capture.cjs bound <outDir>                bound template + fixtures (pipeline self-check)
 *   node fidelity/capture.cjs url <outDir> <url> <board>    a real page (local preview or WordPress), one board
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

async function captureSections(browser, url, board, outDir) {
  const spec = BOARDS[board]
  const ctx = await browser.newContext({ viewport: spec.viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  const tagged = await page.locator('[data-capture^="blog-"]').count()
  const rootSel = board === 'Movil-v3' ? '.m3' : '.v3'
  const results = []

  for (const [i, name] of spec.sections.entries()) {
    const loc = tagged ? page.locator(`${rootSel} [data-capture="${name}"]`).first() : page.locator(`${rootSel} > section`).nth(i)
    const file = path.join(outDir, `${board}--${String(i).padStart(2, '0')}-${name}.png`)

    if (!(await loc.count())) {
      results.push({ name, missing: true })
      continue
    }

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
      report[onlyBoard] = await captureSections(browser, url, onlyBoard, outDir)
    } else {
      const fixtures = {
        'Portada-v3': JSON.parse(fs.readFileSync(path.join(SRC, 'fixture.json'), 'utf8')),
        'Movil-v3': JSON.parse(fs.readFileSync(path.join(SRC, 'fixture.mobile.json'), 'utf8')),
      }

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
