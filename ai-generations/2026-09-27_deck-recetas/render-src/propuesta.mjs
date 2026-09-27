import { paintSelection } from './sel.mjs'
import { makeVoice, COPY } from './voz.mjs'
// Brochure: portada y contraportada (opciones para el canvas). Medidas de portada y cierre del canon de AXIS
// (deckSlideHtml cover/close); fotos del registro cine con Nexa protagonista.
import { answerHtml, deckSlideHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-propuesta/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const BA = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const PL = R + 'ai-generations/2026-09-27_brochure/plates/'
const W = 1920, H = 1080, M = 140
const growth = GL.lines.find(l => l.key === 'growth')
const TEAL = growth.accentOnDark, SOFT = GL.slogan.leadColor.onDark
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const svgUri = f => 'data:image/svg+xml;base64,' + readFileSync(f).toString('base64')
const jpg = async f => 'data:image/jpeg;base64,' + (await sharp(f).resize(W, H, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const LOGO = svgUri(BA + 'efeonce-logo-negative.svg')
const ring = `<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid ${TEAL};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>`
const V = makeVoice({ LOGO, ring, TEAL, SOFT, M, answerHtml })
const slogan = size => `<span style="font:italic 800 ${size}px Pop;color:${SOFT}">Empower</span> <span style="font:800 ${size}px Pop;color:${SOFT}">your</span> <span style="font:italic 900 ${size}px Pop;color:${TEAL}">Growth</span>`
const CONTACT = ['sales@efeoncepro.com', '+56 9 3732 3064', '+1 (239) 235-2073']
const contactLine = (size, color = SOFT) => CONTACT.map(c => `<span style="white-space:nowrap">${c}</span>`).join(`<span style="opacity:.5;margin:0 .7em">·</span>`)
const bubble = svgUri(BA + 'url-bubble-baked-dark.svg')

// Portada del canon (deckSlideHtml cover): logo arriba a la izquierda con el eyebrow al lado; voz en la mitad baja.
const coverVoice = (eyebrow, q, a, px = 150, qpx = 40, qTop = 640, aTop = 715, lead = '') => `
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:110px;width:230px;height:auto;z-index:3">
<p style="position:absolute;left:400px;top:118px;margin:0;font:500 18px/1.2 Pop;letter-spacing:.22em;text-transform:uppercase;color:${SOFT};white-space:nowrap;z-index:3">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:${qTop}px;margin:0;font:300 ${qpx}px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}${q}</p>
<p style="position:absolute;left:${M - 4}px;top:${aTop}px;margin:0;font:760 ${px}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;white-space:nowrap;z-index:3">${lead}${answerHtml(a, TEAL)}</p>`

const GA = R + 'ai-generations/'
// Firma burbuja URL: sólo porque el logo ya está en la pieza. Centrada, 20 % del lado corto, luminosity a opacidad 1 (canon firma §5.1).
const URL_LUM = svgUri(R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg')
const urlSign = () => `<img src="${URL_LUM}" alt="efeoncepro.com" style="position:absolute;left:${(W - 216) / 2}px;bottom:51px;width:216px;height:auto;opacity:1;mix-blend-mode:luminosity;z-index:3">`
// Portada PRINCIPAL: identidad del documento (logo protagonista + tipo de documento + título), no una lámina de servicio.
const lockup = ({ kind, title, meta, top = 700, tpx = 132 }) => `
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:${top - 190}px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:500 22px/1.2 Pop;letter-spacing:.24em;text-transform:uppercase;color:${SOFT};z-index:3">${kind}</p>
<p style="position:absolute;left:${M - 4}px;top:${top + 44}px;margin:0;font:760 ${tpx}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">${title}</p>
<p style="position:absolute;left:${M}px;top:${top + 44 + Math.round(tpx * 0.95 * (title.split('<br>').length)) + 26}px;margin:0;font:300 30px/1.2 Pop;color:#F4F6F8;z-index:3">${meta}</p>`
const classic = (eyebrow, q, a, line = 'growth') => deckSlideHtml('cover', { sections: 5, current: 0, eyebrow, question: q, answer: a, line, assetBase: '__BA__', idPrefix: 'cv' + Math.random().toString(36).slice(2, 6) }).replaceAll('__BA__efeonce-logo-negative.svg', LOGO)
const classicBig = (...a) => classic(...a).replace('width:230px;height:auto', 'width:500px;height:auto').replace('left:400px;top:118px;', 'left:140px;top:262px;').replace('font-weight:500;font-size:18px', 'font-weight:500;font-size:24px')
const photo = async (p, alt) => `<img src="${await jpg(p)}" alt="${alt}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`

import { skewedOrbitHeroSvg } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
const bg = `<div style="position:absolute;inset:0;background:${GL.color.dark}"></div>`
const glow = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
const kicker = (t, top) => `<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:500 24px/1.2 Pop;letter-spacing:.24em;text-transform:uppercase;color:${SOFT};z-index:3">${t}</p>`

const CL = R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/clients/'
const giantOrbit = (cx, cy, r, deg) => {
  const a = deg * Math.PI / 180, sx = cx + r * Math.cos(a), sy = cy + r * Math.sin(a)
  return `<svg style="position:absolute;inset:0" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs>${glow('g1', 10)}${glow('g2', 18)}<radialGradient id="halo" cx="${cx}" cy="${cy}" r="${r * 1.1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${TEAL}" stop-opacity=".10"/><stop offset=".75" stop-color="${TEAL}" stop-opacity=".03"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r * 1.1}" fill="url(#halo)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TEAL}" stroke-width="6" filter="url(#g1)"/><circle cx="${sx}" cy="${sy}" r="30" fill="${TEAL}" filter="url(#g2)"/><circle cx="${sx}" cy="${sy}" r="22" fill="#e9fffd"/></svg>`
}
// Espacio del logo del cliente: marcador cuando no hay logo, o el logo real (clave cerrada del composer).
const clientSlot = (cx, cy, w, h, src, alt) => src
  ? `<img data-sel src="${src}" alt="${alt}" style="position:absolute;left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;object-fit:contain;z-index:3">`
  : `<div data-sel style="position:absolute;left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;box-sizing:border-box;border:2px dashed ${SOFT};border-radius:24px;display:flex;align-items:center;justify-content:center;font:500 26px/1.2 Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT};z-index:3">Logo del cliente</div>`
const urlSignLeft = () => `<img src="${URL_LUM}" alt="efeoncepro.com" style="position:absolute;left:${M}px;bottom:72px;width:216px;height:auto;opacity:1;mix-blend-mode:luminosity;z-index:3">`
const column = client => V.column({ ...COPY.proposal(client), top: 220 }) + urlSignLeft()
const slides = [
  // 1 · La órbita gigante sostiene al cliente: su logo vive dentro de nuestra órbita.
  { id: 'PC1-propuesta-orbita-cliente', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'top-end' }, body: async () => bg + giantOrbit(1640, 540, 820, 212) + clientSlot(1400, 540, 460, 200, null) + column('[Cliente]', 'Octubre 2026 · Confidencial') },
  // 2 · El mismo, con un cliente real como ejemplo (logo de la biblioteca del composer).
  { id: 'PC2-propuesta-orbita-sky', sel: { targetKind: 'object', label: 'SKY', participantKind: 'department', anchor: 'top-end' }, body: async () => bg + giantOrbit(1640, 540, 820, 212) + clientSlot(1400, 540, 460, 200, svgUri(CL + 'sky-on-dark.svg'), 'SKY Airline') + column('SKY', 'Octubre 2026 · Confidencial') },
  // 3 · Órbita completa y más cercana: el cliente al centro del anillo, como el cierre pero en la portada.
  { id: 'PC3-propuesta-anillo-cliente', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.1 }, body: async () => {
    const cx = 1400, cy = 540, r = 430
    const ring = `<svg style="position:absolute;inset:0" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs>${glow('g1', 9)}${glow('g2', 16)}</defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TEAL}" stroke-width="5" filter="url(#g1)"/><circle cx="${cx}" cy="${cy - r}" r="24" fill="${TEAL}" filter="url(#g2)"/><circle cx="${cx}" cy="${cy - r}" r="17" fill="#e9fffd"/></svg>`
    return bg + ring + clientSlot(cx - 70, cy + 10, 340, 140, null) + column('[Cliente]', 'Octubre 2026 · Confidencial')
  } }
]
const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBoldItalic.ttf')});font-weight:800;font-style:italic}@font-face{font-family:Pop;src:url(${f64('Poppins-BlackItalic.ttf')});font-weight:900;font-style:italic}@font-face{font-family:'Poppins';src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:'Poppins';src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:'Poppins';src:url(${f64('Poppins-ExtraBoldItalic.ttf')});font-weight:800;font-style:italic}@font-face{font-family:'Poppins';src:url(${f64('Poppins-BlackItalic.ttf')});font-weight:900;font-style:italic}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}body{margin:0}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
for (const sl of slides.filter(s => !process.env.ONLY || process.env.ONLY.split(',').includes(s.id))) {
  const body = await sl.body()
  await pg.setContent(`<html><head>${css}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${GL.color.dark}">${body}</div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  if (sl.sel) console.log(sl.id, JSON.stringify(await paintSelection(pg, sl.sel)).slice(0, 160))
  await pg.screenshot({ path: `${OUT}${sl.id}.png` })
  await sharp(`${OUT}${sl.id}.png`).jpeg({ quality: 88 }).toFile(`${OUT}${sl.id}.jpg`)
  console.log('ok', sl.id)
}
await b.close()
