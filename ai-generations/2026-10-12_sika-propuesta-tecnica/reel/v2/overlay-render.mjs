// Renderiza overlay.html cuadro a cuadro (30 fps, alfa) a overlay/NNNN.png. Uso: node overlay-render.mjs [desde] [hasta] (segundos)
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [a = 0, z = 25] = process.argv.slice(2).map(Number)
fs.mkdirSync('overlay', { recursive: true })
const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage()
await pg.goto(pathToFileURL(path.resolve('overlay.html')).href, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready)
for (let f = Math.round(a * 30); f < Math.round(z * 30); f++) {
  await pg.evaluate(t => { window.seek(t) }, f / 30)
  await pg.locator('#st').screenshot({ path: `overlay/${String(f).padStart(4, '0')}.png`, omitBackground: true })
}
await b.close(); console.log('ok')
