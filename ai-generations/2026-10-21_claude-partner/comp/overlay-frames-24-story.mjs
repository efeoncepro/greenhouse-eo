import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, dir, secs] = process.argv
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
await p.goto('file://' + html); await p.waitForTimeout(500)
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
for (let f = 0; f < Math.round(+secs * 24); f++) { await p.evaluate(t => window.setT(t), f / 24); await p.screenshot({ path: `${dir}/o${String(f).padStart(4, '0')}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 1920 } }) }
await b.close(); console.log('ok')
