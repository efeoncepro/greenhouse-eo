/**
 * TASK-2051 — axe-core (WCAG 2.2 A/AA) over the blog home inside a real page, desktop and mobile. Only violations
 * inside #eobh count: the site shell has its own owner.
 *
 *   node fidelity/a11y.cjs <url>
 */
const { AxeBuilder } = require('@axe-core/playwright')
const { chromium } = require('playwright')

const url = process.argv[2] || 'http://127.0.0.1:8844/blog/'

;(async () => {
  const browser = await chromium.launch()
  let total = 0

  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['tablet', { width: 820, height: 1180 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await (await browser.newContext({ viewport })).newPage()

    await page.goto(url, { waitUntil: 'load' })
    await page.waitForTimeout(1500)

    const res = await new AxeBuilder({ page }).include('#eobh').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()

    total += res.violations.length
    console.log(`${name}: ${res.violations.length} violations, ${res.passes.length} rules passing`)
    for (const v of res.violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0].target.join(' ')}`)
  }

  await browser.close()
  process.exit(total ? 1 : 0)
})()
