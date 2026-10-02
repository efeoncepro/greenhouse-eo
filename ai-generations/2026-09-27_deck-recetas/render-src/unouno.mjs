// 1:1 con los ajustes: lecho 18 % (validado), banda de texto 28 % arriba con la voz, firma al 20 % sobre el lecho;
// el macro sale como pieza muda (sin reserva de texto prometida). Contraste medido sobre el plate bajo cada caja.
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const P = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_ronda-1x1/plates/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const logo = 'data:image/svg+xml;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg').toString('base64')
const T = GL.color.teal, W = 1080, M = W * GL.signature.marginOfShortSide, LR = 837.07 / 196.68
const lw = W * 0.2, lh = lw / LR, ltop = W - M * 0.6 - lh
const pieces = [
  ['Q1-ojo-de-pez-taller', '¿Cuál va?', 'La tercera'],
  ['Q2-macro-cafe', null, null],
  ['Q3b-retrato-directora', '¿Quién decide?', 'Ella'],
  ['Q4-objeto-camara-cine', '¿Listos?', 'Rodando']
]
const lum = (r, g, b) => { const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b) }
async function contrast(buf, box) {
  const x = Math.max(0, Math.round(box.x0)), y = Math.max(0, Math.round(box.y0)), w = Math.min(W - x, Math.round(box.x1 - box.x0)), h = Math.min(W - y, Math.round(box.y1 - box.y0))
  const { data } = await sharp(buf).extract({ left: x, top: y, width: w, height: h }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += 3) L.push(lum(data[i], data[i + 1], data[i + 2]))
  L.sort((a, b) => a - b); return +(1.05 / (L[Math.floor(L.length * 0.98)] + 0.05)).toFixed(1)
}
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: W } })
const res = []
for (const [f, q, a] of pieces) {
  const buf = await sharp(P + f + '.png').resize(W, W).png().toBuffer()
  const src = 'data:image/png;base64,' + buf.toString('base64')
  const voice = q ? `<p data-m="q" style="position:absolute;left:${M}px;top:${M}px;margin:0;font:300 40px Pop;line-height:1.35;color:${GL.slogan.leadColor.onDark};white-space:nowrap"><span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>${q}</p>
<p data-m="a" style="position:absolute;left:${M}px;top:${M + 58}px;margin:0;font:760 128px Bric;letter-spacing:-.035em;line-height:1.02;color:#fff;white-space:nowrap">${a}<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:${T};margin-left:.035em"></span></p>` : ''
  await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}body{margin:0}</style></head><body><div style="position:relative;width:${W}px;height:${W}px;overflow:hidden">
<img src="${src}" style="position:absolute;inset:0;width:${W}px;height:${W}px">${voice}
<img data-m="logo" src="${logo}" style="position:absolute;left:${(W - lw) / 2}px;top:${ltop}px;width:${lw}px;height:${lh}px"></div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  const boxes = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-m]')].map(e => { const r = e.getBoundingClientRect(); return [e.dataset.m, { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }] })))
  await pg.screenshot({ path: OUT + 'U-' + f + '.png' })
  const r = { f, logo: await contrast(buf, boxes.logo) }
  if (boxes.a) { r.pregunta = await contrast(buf, boxes.q); r.respuesta = await contrast(buf, boxes.a); r.bandaFin = +(boxes.a.y1 / W).toFixed(2) }
  res.push(r)
}
await b.close()
console.log(JSON.stringify(res))
