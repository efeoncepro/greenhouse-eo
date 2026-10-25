import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright'); const sharp = require('sharp')
const [,, html, bgdir, h] = process.argv
const L = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: +h } })
await p.goto('file://' + html + '?h=' + h); await p.waitForTimeout(300)
for (const t of [5.5, 6.5, 7.2, 7.9, 9.0]) {
  await p.evaluate(s => window.setBgSrc(s), 'file://' + bgdir + '/b' + String(Math.round(t * 24) + 1).padStart(4, '0') + '.png')
  await p.evaluate(t => window.setT(t), t)
  const r = await p.evaluate(() => { const e = document.getElementById('ans'); e.style.color = 'transparent'; const b = e.getBoundingClientRect(); return { x: b.x + 20, y: b.y + 20, w: b.width - 40, h: b.height - 40 } })
  const buf = await p.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } })
  await p.evaluate(() => { document.getElementById('ans').style.color = '' })
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  const ls = []; for (let i = 0; i < data.length; i += info.channels) ls.push(0.2126 * L(data[i]) + 0.7152 * L(data[i + 1]) + 0.0722 * L(data[i + 2]))
  ls.sort((a, c) => a - c); console.log('respuesta', t + ' s', 'peor fondo del panel ' + (1.05 / (ls[Math.floor(ls.length * .99)] + .05)).toFixed(2) + ':1')
}
await b.close()
