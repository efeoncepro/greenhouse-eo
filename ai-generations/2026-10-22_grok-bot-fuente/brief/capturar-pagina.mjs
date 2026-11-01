// Abre la página oficial x.ai/news/designing-grok-bot y captura secciones + avatares (official render).
import { chromium } from 'playwright'
import fs from 'node:fs'
const out = process.argv[2]
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
await page.goto('https://x.ai/news/designing-grok-bot', { waitUntil: 'load', timeout: 90000 })
await page.waitForTimeout(6000)
// scroll entire page to trigger lazy content
const h = await page.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < h; y += 700) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(250) }
await page.evaluate(() => window.scrollTo(0, 0))
await page.screenshot({ path: `${out}/pagina-completa.png`, fullPage: true })
const info = await page.evaluate(() => {
  const r = []
  document.querySelectorAll('figure, figcaption, [class*="caption"]').forEach(e => r.push(e.tagName + ' ' + (e.textContent || '').slice(0, 80)))
  return r
})
fs.writeFileSync(`${out}/figuras.txt`, info.join('\n'))
// figures screenshots
const figs = await page.$$('figure')
let i = 0
for (const f of figs) { i++; try { await f.scrollIntoViewIfNeeded(); await page.waitForTimeout(600); await f.screenshot({ path: `${out}/figura-${String(i).padStart(2,'0')}.png` }) } catch (e) {} }
// large avatars
const svgs = await page.$$('svg[class*="grok-bot-module"]')
let j = 0
for (const s of svgs) {
  const w = await s.evaluate(e => e.getBoundingClientRect().width)
  if (w < 70) continue
  j++
  try { await s.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await s.screenshot({ path: `${out}/avatar-${String(j).padStart(2,'0')}-${Math.round(w)}px.png`, omitBackground: true }) } catch (e) {}
}
console.log('figuras', figs.length, 'avatares grandes', j)
await browser.close()
