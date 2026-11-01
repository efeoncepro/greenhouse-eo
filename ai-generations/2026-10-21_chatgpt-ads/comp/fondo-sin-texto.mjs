import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright'); const sharp = require('sharp')
const [,, html, h, spec] = process.argv
const L = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: +h } })
await p.goto('file://' + html + '?h=' + h); await p.waitForTimeout(400); await p.evaluate(() => document.fonts.ready)
for (const z of JSON.parse(spec)) {
  const [name, t, id] = z
  await p.evaluate(t => window.setT(t), t)
  const box = await p.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }, id)
  await p.addStyleTag({ content: '#h1,#h2,#hsrow,#sub2,#eb3,#word,#h4,#sub4,#lk,#gold,#eb{opacity:0!important}' })
  const buf = await p.screenshot({ clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(1080, box.w), height: box.h } })
  await p.evaluate(() => document.querySelectorAll('style').forEach((s, i, a) => { if (i === a.length - 1) s.remove() }))
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  const ls = []; for (let i = 0; i < data.length; i += info.channels) ls.push(0.2126 * L(data[i]) + 0.7152 * L(data[i + 1]) + 0.0722 * L(data[i + 2]))
  ls.sort((a, c) => a - c); const p99 = ls[Math.floor(ls.length * 0.99)]
  console.log(name.padEnd(16), 'peor fondo (p99) → blanco ' + (1.05 / (p99 + 0.05)).toFixed(2) + ':1')
}
await b.close()
