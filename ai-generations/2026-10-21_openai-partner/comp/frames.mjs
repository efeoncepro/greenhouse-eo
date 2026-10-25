import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, out, ...ts] = process.argv
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } })
await p.goto('file://' + html); await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
const sharp = require('sharp'); const tiles = []
for (const t of ts) { await p.evaluate(t => window.setT(t), +t); tiles.push(await sharp(await p.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1350 } })).resize(270, 338).toBuffer()) }
await b.close()
await sharp({ create: { width: tiles.length * 276, height: 338, channels: 3, background: '#fff' } }).composite(tiles.map((t, i) => ({ input: t, left: i * 276, top: 0 }))).png().toFile(out)
