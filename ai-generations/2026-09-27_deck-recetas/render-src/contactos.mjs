// Lámina de varias fotos documentales como HOJA DE CONTACTOS: cuatro tomas claras y oscuras con marcas de corte, y la
// elegida con la selección AXIS y el cursor de quien decide. Oficio a la vista: dos herramientas (marcas + selección).
import { answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/ai-generations/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const img = async (file, w, h) => 'data:image/jpeg;base64,' + (await sharp(R + file).resize(w * 2, h * 2, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark, MARK = '#0375db'
const W = 1920, H = 1080, fw = 520, fh = 293, gx = 44, gy = 76, X0 = 740, Y0 = 200
const frames = [
  ['2026-09-26_deck-mosaico-documental/plates/L2-terreno-panaderia.png', '01 · Rodaje en la panadería'],
  ['2026-09-26_deck-web-motion/plates/P1-deck-lente-edicion.png', '02 · El corte'],
  ['2026-09-26_deck-mosaico-documental/plates/L1-mesa-de-luz.png', '03 · Revisión en mesa de luz'],
  ['2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png', '04 · El cliente la aprueba']
]
const arm = 18, off = 8
const marks = (x, y, w, h) => {
  const l = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${MARK}" stroke-width="2"/>`
  return [
    l(x - off - arm, y, x - off, y), l(x, y - off - arm, x, y - off),
    l(x + w + off, y, x + w + off + arm, y), l(x + w, y - off - arm, x + w, y - off),
    l(x - off - arm, y + h, x - off, y + h), l(x, y + h + off, x, y + h + off + arm),
    l(x + w + off, y + h, x + w + off + arm, y + h), l(x + w, y + h + off, x + w, y + h + off + arm)
  ].join('')
}
let tiles = '', markSvg = ''
const boxes = []
// la elegida grande; las otras tres en una tira de contactos debajo, con marcas de corte
const BX = 820, BY = 150, BW = 960, BH = 540
boxes.push({ left: BX, top: BY, right: BX + BW, bottom: BY + BH })
tiles += `<img src="${await img(frames[0][0], BW, BH)}" style="position:absolute;left:${BX}px;top:${BY}px;width:${BW}px;height:${BH}px;box-shadow:0 40px 80px rgba(0,0,0,.6),0 12px 24px rgba(0,0,0,.45)">`
const sw = 284, sh = 160, sg = 54, SY = 790
for (const [i, [file, cap]] of frames.slice(1).entries()) {
  const x = BX + i * (sw + sg)
  tiles += `<img src="${await img(file, sw, sh)}" style="position:absolute;left:${x}px;top:${SY}px;width:${sw}px;height:${sh}px;box-shadow:0 22px 40px rgba(0,0,0,.55),0 6px 12px rgba(0,0,0,.4)">
<p style="position:absolute;left:${x}px;top:${SY + sh + 16}px;margin:0;font:300 16px Pop;letter-spacing:.02em;color:#9FB3C8">${cap}</p>`
  markSvg += marks(x, SY, sw, sh)
}
const manifest = resolveCollaborationSelectionIntent({ targetId: 'f1', targetKind: 'object', variant: 'eight-handles', padding: 'standard', overlay: 'subtle',
  cursors: [{ id: 'da', kind: 'collaborator', targetId: 'f1', anchor: 'bottom-start', action: 'select', label: 'Dirección de arte', participantKind: 'department' }] })
const sel = renderCollaborationSelection({ manifest, targetBounds: boxes[0], canvas: { width: W, height: H }, measureLabel: (l, s) => l.length * s * 0.62, presentation: { collaboratorScale: 1.4 } })
if (!sel.evidence.withinCanvas) console.warn('selección fuera del lienzo')
const svg = (s, z) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:${z}">${s}</svg>`
const ring = `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const body = `<div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:radial-gradient(ellipse 62% 70% at 66% 46%, #0b3257 0%, #04223f 45%, #000f1f 100%)">
${svg(sel.underlay, 1)}${tiles}${svg(markSvg, 2)}
<p style="position:absolute;left:140px;top:380px;margin:0;font:300 40px Pop;line-height:1.25;color:${SOFT}">${ring}¿Cuál sale<br>al cliente?</p>
<p style="position:absolute;left:132px;top:492px;margin:0;font:760 210px Bric;letter-spacing:-.05em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('Ésta', T)}</p>
${svg(sel.overlay, 3)}</div>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
await pg.evaluate(() => document.fonts.ready)
await pg.screenshot({ path: OUT + 'X-contactos.png' }); await b.close()
await sharp(OUT + 'X-contactos.png').resize(960).jpeg({ quality: 86 }).toFile(OUT + 'X-contactos.jpg')
console.log('ok')
