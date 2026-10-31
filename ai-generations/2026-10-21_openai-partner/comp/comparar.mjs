import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright'); const sharp = require('sharp')
const D = process.cwd(); const b = await chromium.launch(); const shots = []
for (const f of ['anim.html', 'anim-negro.html']) for (const t of [1.6, 6]) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } }); await p.goto('file://' + D + '/' + f); await p.waitForTimeout(500)
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
  await p.evaluate(t => window.setT(t), t); const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1350 } })
  if (t === 6) await sharp(buf).toFile(D + '/' + f.replace('.html', '-final.png'))
  shots.push(await sharp(buf).resize(432, 540).toBuffer()); await p.close() }
await b.close()
await sharp({ create: { width: 4 * 442, height: 540, channels: 3, background: '#fff' } }).composite(shots.map((s, i) => ({ input: s, left: i * 442 + (i > 1 ? 20 : 0) - (i > 1 ? 10 : 0), top: 0 }))).png().toFile(D + '/comparar-fondo.png')
