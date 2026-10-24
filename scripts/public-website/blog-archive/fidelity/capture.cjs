/**
 * TASK-2055 — Captures one PNG per section of each archive view at 1440×900 and 390×844.
 *
 *   node fidelity/capture.cjs reference <outDir>          approved boards (deviated references), canvas assets
 *   node fidelity/capture.cjs bound <outDir>              bound template + fixtures (pipeline self-check)
 *   node fidelity/capture.cjs url <outDir> <baseUrl>      a served page per view: <baseUrl><view>/ (local preview) or
 *                                                         a map file `--urls <json>` {view: url} (WordPress)
 *
 * In `url` mode JavaScript is off (the archive ships none) and the site chrome that floats over the content (every
 * fixed or sticky element outside #eoba) is hidden: the canonical header and footer are an allowed deviation.
 * Sections: header.ah, section.fb, section.al, section.mt, section.ot of the board root (`.v3.arc`), by name.
 */
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const { chromium } = require('playwright')

const { renderBoard } = require('../../blog-v3/lib/render-node.cjs')

const SRC = path.join(__dirname, '..', 'source')
const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia']
const WIDTHS = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }
const SECTIONS = [
  ['archive-head', ':scope > header.ah'],
  ['archive-filter', ':scope > section.fb'],
  ['archive-list', ':scope > section.al'],
  ['archive-meanwhile', ':scope > section.mt'],
  ['archive-topics', ':scope > section.ot'],
]
const assets = JSON.parse(fs.readFileSync(path.join(SRC, 'assets.json'), 'utf8'))
const byId = Object.fromEntries(Object.values(assets).map(a => [a.id, a.file]))
const TYPES = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' }

function standalone(file, data) {
  const r = renderBoard(file, data ? { data } : {})
  const fonts = r.fontLinks.filter(h => h.includes('/css2')).map(h => `<link rel="stylesheet" href="${h}">`).join('\n')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${fonts}<style>${r.css}</style></head><body>${r.html}</body></html>`
}

function serve(pages) {
  const server = http.createServer((req, res) => {
    const blob = req.url.match(/^\/_blob\/([0-9a-f]{32})/)

    if (blob && byId[blob[1]]) {
      const f = byId[blob[1]]

      res.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' })

      return fs.createReadStream(path.join(SRC, 'assets', f)).pipe(res)
    }
    const page = pages[req.url.replace(/^\/|\/$/g, '')]

    if (page) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })

      return res.end(page)
    }
    res.writeHead(404).end()
  })

  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function capture(browser, url, view, width, outDir, site) {
  const ctx = await browser.newContext({ viewport: WIDTHS[width], deviceScaleFactor: 1, javaScriptEnabled: !site })
  const page = await ctx.newPage()

  await page.goto(url, { waitUntil: site ? 'load' : 'networkidle', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  if (site) {
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const pos = getComputedStyle(el).position

        if ((pos === 'fixed' || pos === 'sticky') && !el.closest('#eoba')) el.style.setProperty('visibility', 'hidden', 'important')
      }
    })
  }

  const root = page.locator(site ? '#eoba > .v3.arc' : 'body > .v3.arc').first()
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, h1: document.querySelectorAll('h1').length }))
  const out = { metrics, sections: [] }

  for (const [i, [name, sel]] of SECTIONS.entries()) {
    const loc = root.locator(sel).first()

    if (!(await loc.count())) continue
    // The year column is sticky: always shoot a section from the same scroll position (its top at the viewport top).
    await loc.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY))
    await loc.evaluate(el => Promise.all([...el.querySelectorAll('img')].map(im => { im.loading = 'eager'; return im.decode().catch(() => {}) })))
    const file = path.join(outDir, `${view}-${width}--${String(i).padStart(2, '0')}-${name}.png`)

    // Clip of the full page (an element shot waits for «stable», which the live shell's own CSS animations never are).
    const clip = await loc.evaluate(el => {
      const r = el.getBoundingClientRect()

      // Edges are rounded, not the size: a section at a fractional offset keeps the height it paints with.
      const top = Math.round(r.top + window.scrollY)

      return { x: Math.round(r.left + window.scrollX), y: top, width: Math.round(r.width), height: Math.round(r.bottom + window.scrollY) - top }
    })

    await page.screenshot({ path: file, fullPage: true, clip, animations: 'disabled', caret: 'hide' })
    out.sections.push(path.basename(file))
  }

  await ctx.close()

  return out
}

async function main() {
  const [mode, outDir, base] = process.argv.slice(2)

  if (!mode || !outDir) throw new Error('Usage: capture.cjs <reference|bound|url> <outDir> [baseUrl]')
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const report = {}

  try {
    let urlOf
    let server = null

    if (mode === 'url') {
      const mapArg = process.argv.indexOf('--urls')
      const map = mapArg >= 0 ? JSON.parse(fs.readFileSync(process.argv[mapArg + 1], 'utf8')) : null

      urlOf = view => (map ? map[view] : base + view + '/')
    } else {
      const pages = {}

      for (const view of VIEWS) {
        pages[view] = mode === 'bound'
          ? standalone(path.join(SRC, 'Archivo.bound.dc.html'), JSON.parse(fs.readFileSync(path.join(SRC, `fixture.${view}.json`), 'utf8')))
          : standalone(path.join(SRC, `Archivo-${view}.reference.dc.html`))
      }
      server = await serve(pages)
      urlOf = view => `http://127.0.0.1:${server.address().port}/${view}`
    }

    for (const view of VIEWS) {
      if (!urlOf(view)) continue
      for (const width of Object.keys(WIDTHS)) report[`${view}-${width}`] = await capture(browser, urlOf(view), view, width, outDir, mode === 'url')
    }
    if (server) server.close()
  } finally {
    await browser.close()
  }

  fs.writeFileSync(path.join(outDir, 'capture.json'), JSON.stringify({ mode, base: base || null, capturedAt: new Date().toISOString(), report }, null, 2) + '\n')
  for (const [k, v] of Object.entries(report)) console.log(k, JSON.stringify(v.metrics), v.sections.length, 'sections')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
