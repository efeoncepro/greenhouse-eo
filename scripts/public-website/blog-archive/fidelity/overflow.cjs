/**
 * TASK-2055 — Page overflow sweep: `scrollWidth === clientWidth` for every view at 8 widths (320–1920), plus one H1
 * and no H1 word broken mid-word (its line boxes must start at word boundaries).
 *
 *   node fidelity/overflow.cjs <baseUrl>          (local preview: <baseUrl><view>/)   or   --urls <json>
 */
const fs = require('node:fs')

const { chromium } = require('playwright')

const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia']
const WIDTHS = [320, 360, 390, 768, 1024, 1100, 1440, 1920]

;(async () => {
  const mapArg = process.argv.indexOf('--urls')
  const map = mapArg >= 0 ? JSON.parse(fs.readFileSync(process.argv[mapArg + 1], 'utf8')) : null
  const base = process.argv[2]
  const browser = await chromium.launch()
  let failed = 0

  for (const view of VIEWS) {
    const url = map ? map[view] : base + view + '/'

    if (!url) continue
    const row = []

    for (const w of WIDTHS) {
      const page = await (await browser.newContext({ viewport: { width: w, height: 900 }, javaScriptEnabled: false })).newPage()

      await page.goto(url, { waitUntil: 'load', timeout: 60000 })
      await page.evaluate(() => document.fonts.ready)
      const m = await page.evaluate(() => {
        const h1 = document.querySelector('#eoba h1')
        // A word split across lines: some text node's line box starts in the middle of a word.
        let broken = false

        if (h1) {
          const range = document.createRange()
          const text = h1.textContent

          for (let i = 1; i < text.length; i++) {
            if (/\s/.test(text[i - 1]) || /\s/.test(text[i])) continue
            const node = h1.firstChild

            if (!node || node.nodeType !== 3) break
            range.setStart(node, i - 1)
            range.setEnd(node, i)
            const a = range.getBoundingClientRect()

            range.setStart(node, i)
            range.setEnd(node, i + 1)
            const b = range.getBoundingClientRect()

            if (b.top - a.top > a.height / 2) broken = true
          }
        }

        return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, h1: document.querySelectorAll('h1').length, broken }
      })

      if (m.over > 0 || m.h1 !== 1 || m.broken) failed++
      row.push(`${w}:${m.over}${m.h1 !== 1 ? ' h1=' + m.h1 : ''}${m.broken ? ' ROTA' : ''}`)
      await page.context().close()
    }
    console.log(view.padEnd(15), row.join('  '))
  }
  await browser.close()
  console.log(failed ? `✗ ${failed} problems` : '✓ no overflow, one H1, no broken word, 320–1920')
  process.exit(failed ? 1 : 0)
})()
