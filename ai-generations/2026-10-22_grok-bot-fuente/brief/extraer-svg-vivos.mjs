// Toma el outerHTML de cada avatar YA animado por el JS oficial (los ojos sólo tienen `d` en runtime)
// y lo guarda; también captura los estados del sistema de movimiento como SVG.
import { chromium } from 'playwright'
import fs from 'node:fs'
const out = process.argv[2]
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('https://x.ai/news/designing-grok-bot', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(8000)
const h = await page.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < h; y += 700) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(150) }
const figs = await page.$$('figure')
await figs[3].scrollIntoViewIfNeeded(); await page.waitForTimeout(2500)
const hoja = await figs[3].$$eval('svg[class*="grok-bot-module"]', l => l.map(e => e.outerHTML))
hoja.forEach((s, i) => fs.writeFileSync(`${out}/hoja-${String(i + 1).padStart(2, '0')}.svg`, s))
// motion system
await figs[4].scrollIntoViewIfNeeded(); await page.waitForTimeout(1000)
const motionInfo = await figs[4].evaluate(f => [...f.querySelectorAll('svg')].map(e => [e.getAttribute('class'), Math.round(e.getBoundingClientRect().width), e.outerHTML.length]))
fs.writeFileSync(`${out}/motion-info.json`, JSON.stringify(motionInfo))
const labels = ['Idle', 'Working', 'Waiting', 'Blocked', 'Thinking', 'Done']
for (const [n, l] of labels.entries()) {
  const btn = await figs[4].$(`text="${l}"`)
  if (btn) await btn.click()
  for (let k = 0; k < 4; k++) {
    await page.waitForTimeout(500)
    const svgs = await figs[4].$$eval('svg', l => l.filter(e => e.getBoundingClientRect().width > 30).map(e => e.outerHTML))
    svgs.forEach((s, j) => fs.writeFileSync(`${out}/estado-${n + 1}-${l.toLowerCase()}-${k + 1}-${j}.svg`, s))
  }
}
console.log('hoja', hoja.length, JSON.stringify(motionInfo))
await browser.close()
