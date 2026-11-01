import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, ...pairs] = process.argv
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } })
await p.goto('file://' + html); await p.waitForTimeout(200)
for (let i = 0; i < pairs.length; i += 2) { await p.evaluate(t => window.setT(t), +pairs[i]); await p.screenshot({ path: pairs[i + 1], clip: { x: 0, y: 0, width: 1080, height: 1350 } }) }
await b.close()
