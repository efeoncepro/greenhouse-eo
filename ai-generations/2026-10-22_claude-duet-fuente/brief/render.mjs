// Renderiza los SVG oficiales a PNG y cuadros del Lottie oficial (solo lectura de fuente/).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
const B = process.argv[2]
const src = path.join(B, 'fuente/claude-com-duet')
const out = path.join(B, 'cuadros')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } })
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.svg'))) {
  const svg = fs.readFileSync(path.join(src, f), 'utf8')
  await page.setContent(`<html><body style="margin:0;background:#888"><div id=w style="display:inline-block">${svg}</div></body></html>`)
  const el = await page.$('#w svg')
  await el.screenshot({ path: path.join(out, 'svg-' + f.replace('.svg', '.png')), omitBackground: true }).catch(e => console.log('fail', f, e.message))
}
const lot = fs.readFileSync(path.join(src, '21ec753cb30a8f9d428903f23e402ed131a9e25e.json'), 'utf8')
const lib = fs.readFileSync('node_modules/lottie-web/build/player/lottie_svg.min.js', 'utf8')
await page.setContent(`<html><body style="margin:0;background:#FAF9F5"><div id=l style="width:1200px;height:1200px"></div></body></html>`)
await page.addScriptTag({ content: lib })
await page.evaluate(d => { window.anim = lottie.loadAnimation({ container: document.getElementById('l'), renderer: 'svg', loop: false, autoplay: false, animationData: JSON.parse(d) }) }, lot)
for (const fr of [0, 6, 12, 18, 24, 30, 36, 42, 49]) {
  await page.evaluate(n => window.anim.goToAndStop(n, true), fr)
  await page.screenshot({ path: path.join(out, `lottie-object-question-f${String(fr).padStart(2, '0')}.png`) })
}
await browser.close()
