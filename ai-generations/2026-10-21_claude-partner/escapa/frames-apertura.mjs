import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, dir, n] = process.argv
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1248, height: 1664 } })
await p.goto('file://' + html); await p.waitForTimeout(400)
await p.evaluate(async () => { await document.fonts.ready })
for (let f = 0; f < +n; f++) { await p.evaluate(t => window.setT(t), f / 24); await p.screenshot({ path: `${dir}/a${String(f).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: 1248, height: 1664 } }) }
await b.close(); console.log('ok')
