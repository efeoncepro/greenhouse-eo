import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, out] = process.argv
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
await p.goto('file://' + html); await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
await p.waitForTimeout(300); await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1920 } }); await b.close()
