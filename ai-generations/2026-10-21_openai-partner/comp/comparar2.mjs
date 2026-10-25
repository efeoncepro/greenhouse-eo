import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright'); const sharp = require('sharp')
const D = process.cwd(); const b = await chromium.launch(); const shots = []
for (const f of ['anim-navy.html', 'anim-negro.html']) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } }); await p.goto('file://' + D + '/' + f); await p.waitForTimeout(500)
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
  await p.evaluate(() => window.setT(6)); const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1350 } })
  await sharp(buf).toFile(D + '/' + f.replace('.html', '-final.png')); shots.push(await sharp(buf).resize(432, 540).toBuffer()); await p.close() }
await b.close()
shots.push(await sharp('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-21_adobe-partner/comp/adobe-feed-4x5-v4.png').resize(432, 540).toBuffer())
await sharp({ create: { width: 3 * 442, height: 540, channels: 3, background: '#fff' } }).composite(shots.map((s, i) => ({ input: s, left: i * 442, top: 0 }))).png().toFile(D + '/comparar-fondo-2.png')
