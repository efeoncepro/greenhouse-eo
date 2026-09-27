import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const S = 400
const rows = [
  ['Q1-ojo-de-pez-taller', 'Ojo de pez · con voz', 'Firma 18,8:1 · voz 16,0:1 · la voz termina en 0,26 del alto, dentro de la banda'],
  ['Q2-macro-cafe', 'Macro · pieza muda', 'Sin reserva de texto: sólo foto y firma (14,3:1). El macro sube las manos y la banda no se promete'],
  ['Q3b-retrato-directora', 'Retrato 135 mm · con voz (rehecho)', 'Sin libros, planta ni cuadros: el material se declaró. Firma 17,3:1 · voz 16,5:1'],
  ['Q4-objeto-camara-cine', 'Objeto · con voz', 'Firma 11,6:1 · voz 15,2:1']
]
const cells = []
for (const [f, t, c] of rows) {
  const src = 'data:image/jpeg;base64,' + (await sharp('out-dwm/U-' + f + '.png').resize(S * 2).jpeg({ quality: 88 }).toBuffer()).toString('base64')
  cells.push(`<figure style="margin:0;width:${S}px"><img src="${src}" style="width:${S}px;height:${S}px;display:block;border-radius:6px"><figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${t}</figcaption><p style="margin:2px 0 0;font:300 14px/1.45 Pop;color:#5F5A69">${c}</p></figure>`)
}
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1900, height: 700 }, deviceScaleFactor: 2 })
await p.setContent(`<html><head><style>@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}</style></head><body><div id="b" style="padding:40px;width:max-content"><p style="margin:0 0 20px;font:600 22px Pop;color:#00284D">1:1 con los ajustes · lecho 18 % validado · banda de texto 28 % salvo macro · firma 20 %</p><div style="display:flex;gap:36px">${cells.join('')}</div></div></body></html>`, { waitUntil: 'load' })
await p.evaluate(() => document.fonts.ready)
await (await p.$('#b')).screenshot({ path: 'out-dwm/U-board.png' }); await b.close()
await sharp('out-dwm/U-board.png').resize(1600).jpeg({ quality: 86 }).toFile('out-dwm/U-board.jpg')
const m = await sharp('out-dwm/U-board.jpg').metadata(); console.log(m.width, m.height)
