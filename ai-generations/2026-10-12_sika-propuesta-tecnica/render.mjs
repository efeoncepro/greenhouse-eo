// Renderiza out/html/NN.html a out/png/NN.png (1920×1080 @1.5x) y arma hojas de contacto de cuatro láminas.
// Uso: node render.mjs [NN ...]
import { chromium } from 'playwright'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const H = path.resolve('out/html'), P = path.resolve('out/png'); fs.mkdirSync(P, { recursive: true })
const only = process.argv.slice(2)
const files = fs.readdirSync(H).filter(f => f.endsWith('.html')).sort().filter(f => !only.length || only.includes(f.slice(0, 2)))
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 }); const pg = await ctx.newPage()
for (const f of files) {
  await pg.goto(pathToFileURL(path.join(H, f)).href, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready)
  const over = await pg.evaluate(() => [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 2 && getComputedStyle(d).position === 'absolute' && d.style.height).map(d => d.innerText.slice(0, 40).replace(/\n/g, ' ') + ' +' + (d.scrollHeight - d.clientHeight)))
  if (over.length) console.log(f, 'DESBORDE:', over.join(' | '))
  await pg.screenshot({ path: path.join(P, f.replace('.html', '.png')) })
}
await b.close()
const all = fs.readdirSync(P).filter(f => /^\d\d\.png$/.test(f)).sort().filter(f => !only.length || only.includes(f.slice(0, 2)))
for (let i = 0; i < all.length; i += 4) {
  const g = all.slice(i, i + 4), comps = []
  for (let j = 0; j < g.length; j++) comps.push({ input: await sharp(path.join(P, g[j])).resize(960, 540).toBuffer(), left: (j % 2) * 960, top: Math.floor(j / 2) * 540 })
  await sharp({ create: { width: 1920, height: g.length > 2 ? 1080 : 540, channels: 3, background: '#000' } }).composite(comps).jpeg({ quality: 84 }).toFile(path.join(P, `_hoja-${g[0].slice(0, 2)}.jpg`))
}
console.log(all.length, 'láminas')
