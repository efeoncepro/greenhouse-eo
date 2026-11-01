import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
// uso: node frames.mjs <html> <bgdir> <outdir> <alto> [segundos-lista]
const [,, html, bgdir, dir, h, only] = process.argv
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const H = +h, N = fs.readdirSync(bgdir).filter(f => f.endsWith('.png')).length
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: H } })
await p.goto('file://' + html + '?h=' + H); await p.waitForTimeout(400)
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(i => i.id !== 'bg').map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
const list = only ? only.split(',').map(s => Math.round(+s * 24)) : [...Array(N).keys()]
for (const f of list) {
  await p.evaluate(s => window.setBgSrc(s), 'file://' + bgdir + '/b' + String(f + 1).padStart(4, '0') + '.png')
  await p.evaluate(t => window.setT(t), f / 24)
  await p.screenshot({ path: `${dir}/a${String(f).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: 1080, height: H } })
}
await b.close(); console.log('ok', list.length)
