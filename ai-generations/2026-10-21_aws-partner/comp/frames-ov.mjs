import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, dir, t0, t1, h = '1350'] = process.argv
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const H = +h, b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: H } })
await p.goto('file://' + html + '?h=' + H); await p.waitForTimeout(600)
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
let n = 0; for (let f = Math.round(+t0 * 24); f < Math.round(+t1 * 24); f++, n++) { await p.evaluate(t => window.setT(t), f / 24); await p.screenshot({ path: `${dir}/o${String(n).padStart(4, '0')}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: H } }) }
await b.close(); console.log('ok', n)
