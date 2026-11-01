import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, dir, secs, h = '1350', only] = process.argv
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const H = +h
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: H } })
await p.goto('file://' + html + '?h=' + H); await p.waitForTimeout(600)
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
const list = only ? only.split(',').map(Number) : [...Array(Math.round(+secs * 24)).keys()]
for (const f of list) { await p.evaluate(t => window.setT(t), f / 24); await p.screenshot({ path: `${dir}/a${String(f).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: 1080, height: H } }) }
await b.close(); console.log('ok', list.length)
