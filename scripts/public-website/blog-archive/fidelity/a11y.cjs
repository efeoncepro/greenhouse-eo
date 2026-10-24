/**
 * TASK-2055 — axe-core (WCAG 2.2 A/AA) over every archive view inside a real page, at 1440, 820 and 390. Only
 * violations inside #eoba count: the site shell has its own owner.
 *
 *   node fidelity/a11y.cjs <baseUrl>          (local preview: <baseUrl><view>/)   or   --urls <json>
 */
const fs = require('node:fs')

const { AxeBuilder } = require('@axe-core/playwright')
const { chromium } = require('playwright')

const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia', 'tema-glitch']

;(async () => {
  const mapArg = process.argv.indexOf('--urls')
  const map = mapArg >= 0 ? JSON.parse(fs.readFileSync(process.argv[mapArg + 1], 'utf8')) : null
  const browser = await chromium.launch()
  let total = 0

  for (const view of VIEWS) {
    const url = map ? map[view] : process.argv[2] + view + '/'

    if (!url) continue
    for (const [name, viewport] of [['1440', { width: 1440, height: 900 }], ['820', { width: 820, height: 1180 }], ['390', { width: 390, height: 844 }]]) {
      const page = await (await browser.newContext({ viewport })).newPage()

      await page.goto(url, { waitUntil: 'load' })
      await page.waitForTimeout(800)
      const res = await new AxeBuilder({ page }).include('#eoba').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()

      total += res.violations.length
      if (res.violations.length) console.log(`${view} ${name}: ${res.violations.length} violations`)
      for (const v of res.violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0].target.join(' ')}`)
      await page.context().close()
    }
  }
  await browser.close()
  console.log(total ? `✗ ${total} violations` : `✓ axe WCAG 2.2 AA: 0 violations in ${VIEWS.length} views × 3 widths`)
  process.exit(total ? 1 : 0)
})()
