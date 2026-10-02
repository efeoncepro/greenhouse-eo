// Tríptico v2: tres tomas documentales verticales nativas (equipo Efeonce con su uniforme: escucha, crea, mide),
// a sangre, y UNA frase que recorre las tres sobre sus lechos oscuros: «Escucha, | crea | y mide.» con la esfera al final.
import { answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_deck-triptico-v2/plates/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const T = GL.color.teal, SOFT = GL.slogan.leadColor.onDark
const W = 1920, H = 1080, pw = 636, g = 6, TOP = 120, PH = H - TOP
const panels = [['T1-escucha', 'Escucha,', '01 · En la panadería del cliente'], ['T2-crea', 'crea', '02 · En el estudio'], ['T3-mide', 'y mide', '03 · En la sala del cliente']]
let body = ''
const bufs = []
for (const [i, [f, word, cap]] of panels.entries()) {
  const x = i * (pw + g)
  const buf = await sharp(R + f + '.png').resize(pw, PH, { fit: 'cover', position: 'bottom' }).png().toBuffer()
  bufs.push({ buf, x })
  const w = i === 2 ? answerHtml(word, T) : word
  body += `<img src="data:image/png;base64,${buf.toString('base64')}" style="position:absolute;left:${x}px;top:${TOP}px;width:${pw}px;height:${PH}px">
<p data-m="w${i}" style="position:absolute;left:${x + 42}px;top:944px;margin:0;font:760 108px Bric;letter-spacing:-.05em;line-height:1;color:#fff;white-space:nowrap">${w}</p>`
}
body += `<p data-m="q" style="position:absolute;left:48px;top:40px;margin:0;font:300 34px Pop;color:${SOFT}"><span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>¿Cómo trabajamos?</p>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}body{margin:0;background:#001a33}</style></head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#001a33">${body}</div></body></html>`, { waitUntil: 'load' })
await pg.evaluate(() => document.fonts.ready)
const boxes = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-m]')].map(e => { const r = e.getBoundingClientRect(); return [e.dataset.m, [r.left, r.top, r.right, r.bottom]] })))
await pg.screenshot({ path: OUT + 'X-triptico2.png' }); await b.close()
// contraste de la tinta blanca contra el 2 % más claro del fondo bajo cada palabra
const shot = await sharp(OUT + 'X-triptico2.png').toBuffer()
const bg = await sharp({ create: { width: W, height: H, channels: 3, background: '#001a33' } }).composite(bufs.map(p => ({ input: p.buf, left: p.x, top: TOP }))).raw().toBuffer({ resolveWithObject: true })
const lum = (r, g, b) => { const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b) }
for (const [k, [x0, y0, x1, y1]] of Object.entries(boxes)) {
  const L = []; for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) { const i = (y * W + x) * 3; L.push(lum(bg.data[i], bg.data[i + 1], bg.data[i + 2])) }
  L.sort((a, b) => a - b); console.log(k, +(1.05 / (L[Math.floor(L.length * 0.98)] + 0.05)).toFixed(1))
}
await sharp(OUT + 'X-triptico2.png').resize(960).jpeg({ quality: 86 }).toFile(OUT + 'X-triptico2.jpg')
