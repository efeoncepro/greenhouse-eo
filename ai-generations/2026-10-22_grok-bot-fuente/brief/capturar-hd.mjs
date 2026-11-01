// Captura en alta resolución el render OFICIAL de x.ai/news/designing-grok-bot:
// hoja de 8 formas, avatares sueltos a 1024 px y el sistema de movimiento por estado.
import { chromium } from 'playwright'
import fs from 'node:fs'
const out = process.argv[2]
for (const d of ['formas', 'estados', 'hoja']) fs.mkdirSync(`${out}/${d}`, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3 })
await page.goto('https://x.ai/news/designing-grok-bot', { waitUntil: 'load', timeout: 90000 })
await page.waitForTimeout(5000)
await page.addStyleTag({ content: '[class*="cookie" i],[id*="cookie" i],[class*="consent" i]{display:none!important}' })
const h = await page.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < h; y += 700) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(150) }
const figs = await page.$$('figure')
// figura 4 = hoja de formas; figura 5 = sistema de movimiento
const hoja = figs[3], motion = figs[4]
await hoja.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500)
await hoja.screenshot({ path: `${out}/hoja/hoja-8-formas-oficial-3x.png` })
// avatares de la hoja a 1024 px, fondo transparente
const svgsHoja = await hoja.$$('svg[class*="grok-bot-module"]')
let i = 0
for (const s of svgsHoja) {
  i++
  const info = await s.evaluate(e => ({ fg: getComputedStyle(e).getPropertyValue('--fg').trim(), state: e.dataset.state }))
  const clone = await page.evaluateHandle(src => {
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:0;top:0;width:1100px;height:1100px;display:grid;place-items:center;z-index:99999;background:transparent'
    const c = src.cloneNode(true)
    c.style.width = '1024px'; c.style.height = '1024px'
    host.appendChild(c); document.body.appendChild(host); return host
  }, s)
  await page.waitForTimeout(800)
  await clone.screenshot({ path: `${out}/formas/forma-${String(i).padStart(2, '0')}-${info.fg.replace('#', '')}.png`, omitBackground: true })
  await clone.evaluate(e => e.remove())
}
// sistema de movimiento: cada estado, 6 cuadros espaciados
await motion.scrollIntoViewIfNeeded(); await page.waitForTimeout(800)
const labels = ['Idle', 'Working', 'Waiting', 'Blocked', 'Thinking', 'Done']
for (const l of labels) {
  const btn = await motion.$(`text="${l}"`)
  if (btn) { await btn.click(); }
  for (let k = 0; k < 6; k++) {
    await page.waitForTimeout(350)
    await motion.screenshot({ path: `${out}/estados/${labels.indexOf(l) + 1}-${l.toLowerCase()}-${k + 1}.png` })
  }
}
console.log('formas', svgsHoja.length)
await browser.close()
