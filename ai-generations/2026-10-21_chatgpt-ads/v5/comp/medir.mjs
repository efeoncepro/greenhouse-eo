import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright'); const sharp = require('sharp')
const [,, html, bgdir, h, spec] = process.argv
const L = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: +h } })
await p.goto('file://' + html + '?sin=1&h=' + h); await p.waitForTimeout(300)
for (const [name, t, x, y, w, hh] of JSON.parse(spec)) {
  const f = Math.round(t * 24)
  await p.evaluate(s => window.setBgSrc(s), 'file://' + bgdir + '/b' + String(f + 1).padStart(4, '0') + '.png')
  await p.evaluate(t => window.setT(t), t)
  const buf = await p.screenshot({ clip: { x, y, width: w, height: hh } })
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  const ls = []; for (let i = 0; i < data.length; i += info.channels) ls.push(0.2126 * L(data[i]) + 0.7152 * L(data[i + 1]) + 0.0722 * L(data[i + 2]))
  ls.sort((a, c) => a - c); const p99 = ls[Math.floor(ls.length * .99)], p50 = ls[Math.floor(ls.length * .5)]
  console.log(name.padEnd(16), t.toFixed(2) + ' s', 'peor fondo ' + (1.05 / (p99 + .05)).toFixed(2) + ':1', '· mediana ' + (1.05 / (p50 + .05)).toFixed(2) + ':1')
}
await b.close()
