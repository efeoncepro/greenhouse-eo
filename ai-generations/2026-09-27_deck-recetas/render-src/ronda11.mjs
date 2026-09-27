import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_ronda-1x1/plates/'
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const S = 420
const rows = [
  ['Q1-ojo-de-pez-taller', 'Ojo de pez · taller', 0.38, true, 14.86],
  ['Q2-macro-cafe', 'Macro · café', 0.26, false, 10.72],
  ['Q3-retrato-directora', 'Retrato 135 mm', 0.36, true, 7.62],
  ['Q4-objeto-camara-cine', 'Objeto · cámara de cine', 0.34, true, 5.52]
]
const cells = []
for (const [f, t, banda, ok, lecho] of rows) {
  const src = 'data:image/jpeg;base64,' + (await sharp(R + f + '.png').resize(S * 2).jpeg({ quality: 88 }).toBuffer()).toString('base64')
  cells.push(`<figure style="margin:0;width:${S}px"><div style="position:relative;width:${S}px;height:${S}px">
<img src="${src}" style="width:${S}px;height:${S}px;display:block">
<div style="position:absolute;left:0;top:${S * 0.28}px;width:${S}px;border-top:2px dashed rgba(255,255,255,.7)"></div>
<div style="position:absolute;left:0;top:${S * 0.82}px;width:${S}px;border-top:2px dashed rgba(255,255,255,.7)"></div>
<span style="position:absolute;left:10px;top:${S * 0.28 - 26}px;font:300 13px Pop;color:#fff">texto · 28 %</span>
<span style="position:absolute;left:10px;top:${S * 0.82 + 6}px;font:300 13px Pop;color:#fff">lecho · 18 %</span></div>
<figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${t}</figcaption>
<p style="margin:2px 0 0;font:300 14px/1.45 Pop;color:#5F5A69">banda de texto <b style="font-weight:600;color:${ok ? '#00284D' : '#B3261E'}">${String(banda).replace('.', ',')} del alto ${ok ? '✓' : '✗ (pide 0,28)'}</b><br>lecho: tinta blanca a <b style="font-weight:600;color:#00284D">${String(lecho).replace('.', ',')}:1 ✓</b></p></figure>`)
}
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1900, height: 700 }, deviceScaleFactor: 2 })
await p.setContent(`<html><head><style>@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}</style></head><body><div id="b" style="display:flex;gap:36px;padding:40px;width:max-content">${cells.join('')}</div></body></html>`, { waitUntil: 'load' })
await p.evaluate(() => document.fonts.ready)
await (await p.$('#b')).screenshot({ path: 'out-dwm/Q-ronda-1x1.png' }); await b.close()
await sharp('out-dwm/Q-ronda-1x1.png').jpeg({ quality: 88 }).toFile('out-dwm/Q-ronda-1x1.jpg')
console.log((await sharp('out-dwm/Q-ronda-1x1.png').metadata()).width)
