// Firma por formato vista como la ve la gente: cada pieza a 390 CSS px de ancho (teléfono de referencia), logo
// centrado abajo al % del lado corto que propone la regla del hueco 1. Render a 2× para mirarlo al 100 %.
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/ai-generations/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const logo = 'data:image/svg+xml;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg').toString('base64')
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const LR = 837.07 / 196.68, PHONE = 390, MARGIN = GL.signature.marginOfShortSide
const pieces = [
  { id: '4:5', ratio: 4 / 5, file: '2026-09-21_ads-brand-visibility/plates/a1-marcado-45-plate.png', pct: 0.2 },
  { id: '1:1', ratio: 1, file: '2026-09-26_ronda-1x1/plates/Q3-retrato-directora.png', pct: 0.2 },
  { id: '9:16', ratio: 9 / 16, file: '2026-09-26_ooh-caminero-lente/plates/D1-mupi-rodaje-en-vivo.png', pct: 0.2 },
  { id: '16:9 al 20 %', ratio: 16 / 9, file: '2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png', pct: 0.2 },
  { id: '16:9 al 25 %', ratio: 16 / 9, file: '2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png', pct: 0.25 },
  { id: '1,91:1 al 25 %', ratio: 1.91, file: '2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png', pct: 0.25 }
]
const cells = []
for (const p of pieces) {
  const w = PHONE, h = Math.round(PHONE / p.ratio), short = Math.min(w, h)
  const src = 'data:image/jpeg;base64,' + (await sharp(R + p.file).resize(w * 2, h * 2, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')
  const lw = short * p.pct, lh = lw / LR, bottom = short * MARGIN * 0.6
  const ok = lw >= 50
  cells.push(`<figure style="margin:0;width:${w}px">
<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;border-radius:6px">
<img src="${src}" style="position:absolute;inset:0;width:${w}px;height:${h}px">
<img src="${logo}" style="position:absolute;left:${(w - lw) / 2}px;top:${h - bottom - lh}px;width:${lw}px;height:${lh}px"></div>
<figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${p.id}</figcaption>
<p style="margin:2px 0 0;font:300 14px/1.4 Pop;color:#5F5A69">logo de <b style="font-weight:600;color:${ok ? '#00284D' : '#B3261E'}">${Math.round(lw)} px</b> en el teléfono · ${Math.round(p.pct * 100)} % del lado corto${ok ? '' : ' · bajo el piso de 50 px'}</p></figure>`)
}
const html = `<html><head><style>@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}</style></head>
<body><div id="b" style="display:flex;flex-wrap:wrap;gap:36px 40px;align-items:flex-end;padding:40px;width:1340px">${cells.join('')}</div></body></html>`
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1420, height: 1600 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await (await page.$('#b')).screenshot({ path: OUT + 'F-firma-telefono.png' })
await browser.close()
const m = await sharp(OUT + 'F-firma-telefono.png').metadata()
await sharp(OUT + 'F-firma-telefono.png').jpeg({ quality: 88 }).toFile(OUT + 'F-firma-telefono.jpg')
console.log(m.width, m.height)
