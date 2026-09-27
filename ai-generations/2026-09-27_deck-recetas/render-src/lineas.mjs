// Brochure: portada y contraportada (opciones para el canvas). Medidas de portada y cierre del canon de AXIS
// (deckSlideHtml cover/close); fotos del registro cine con Nexa protagonista.
import { answerHtml, deckSlideHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
import { paintSelection } from './sel.mjs'
import { makeVoice, COPY } from './voz.mjs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-lineas/', import.meta.url).pathname
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
const urlSign = () => `<img src="${URL_LUM}" alt="efeoncepro.com" style="position:absolute;left:${M}px;bottom:51px;width:216px;height:auto;opacity:1;mix-blend-mode:luminosity;z-index:3">`
// Portada PRINCIPAL: identidad del documento (logo protagonista + tipo de documento + título), no una lámina de servicio.
const lockup = ({ kind, title, meta, top = 700, tpx = 132, gap = title.includes('data-sel') ? 78 : 26 }) => `
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:${top - 190}px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:500 22px/1.2 Pop;letter-spacing:.24em;text-transform:uppercase;color:${SOFT};z-index:3">${kind}</p>
<p style="position:absolute;left:${M - 4}px;top:${top + 44}px;margin:0;font:760 ${tpx}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">${title}</p>
<p style="position:absolute;left:${M}px;top:${top + 44 + Math.round(tpx * 0.95 * (title.split('<br>').length)) + gap}px;margin:0;font:300 30px/1.2 Pop;color:#F4F6F8;z-index:3">${meta}</p>`
const V = makeVoice({ LOGO, ring, TEAL, SOFT, M, answerHtml }), BRO = COPY.brochure
const classic = (eyebrow, q, a, line = 'growth') => deckSlideHtml('cover', { sections: 5, current: 0, eyebrow, question: q, answer: a, line, assetBase: '__BA__', idPrefix: 'cv' + Math.random().toString(36).slice(2, 6) }).replaceAll('__BA__efeonce-logo-negative.svg', LOGO)
const classicBig = (...a) => classic(...a).replace('width:230px;height:auto', 'width:500px;height:auto').replace('left:400px;top:118px;', 'left:140px;top:262px;').replace('font-weight:500;font-size:18px', 'font-weight:500;font-size:24px')
const photo = async (p, alt) => `<img src="${await jpg(p)}" alt="${alt}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`
// Una portada de brochure por línea de servicio (operador, 2026-09-27): mismo sistema que las portadas de brochure
// (logo 500 px · eyebrow · pregunta con anillo · respuesta con esfera · evidencia), con el acento de la línea en el
// anillo y la esfera (manual §7) y sus categorías del catálogo de servicios como evidencia.
const LINE = k => GL.lines.find(l => l.key === k)
const ringOf = c => `<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid ${c};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>`
const b6 = w => `<b style="font-weight:600">${w}</b>`
const LN = [
  { id: 'LN1-growth', line: 'growth', plate: '2026-09-26_deck-hibrido/plates/HW1-mismo-trabajo.png', alt: 'Una estratega de Efeonce con polo y lanyard revisa un tablero de resultados en un monitor, de noche',
    eyebrow: 'Brochure · Growth Strategy', q: '¿Lo medimos?', a: 'Siempre', ev: `${b6('Seis')} capacidades:<br>Estrategia · GTM · Revenue enablement<br>Analítica · Medición · Orquestación` },
  { id: 'LN2-brand', line: 'brand', plate: '2026-09-26_deck-creativo/plates/CR2b-constelacion-isotipo.png', alt: 'Una directora creativa de Efeonce con hoodie dirige con las manos una constelación de piezas creativas que flotan a su alrededor',
    eyebrow: 'Brochure · Creative Services', q: '¿Quién crea mi contenido?', a: 'Tu squad', ev: `${b6('Seis')} capacidades:<br>Squad creativo · Brand systems · Campañas<br>Contenido y social · Audiovisual · Run & Gun` },
  { id: 'LN3-engine', line: 'engine', plate: '2026-09-26_deck-web/plates/WB1b-web-para-todos-isotipo.png', alt: 'Un ingeniero de Efeonce con polo toca una web holográfica que usan personas y pequeños agentes robot',
    eyebrow: 'Brochure · Digital Services', q: '¿Te encuentra la IA?', a: 'Visible', ev: `${b6('Cinco')} capacidades:<br>Search Visibility · Web Experience · Medición<br>Sistemas de agentes · Automatización` },
  { id: 'LN4-voice', line: 'voice', plate: '2026-09-27_portadas-lineas/plates/LN4-voice-distribucion.png', alt: 'Una líder de medios de Efeonce con la chaqueta sostiene una esfera de luz naranja de la que salen haces hacia muchas pantallas',
    eyebrow: 'Brochure · Media & Distribution', q: '¿Dónde invierto?', a: 'Donde rinde', top: 300, ev: `${b6('Tres')} soluciones y una operación:<br>Estrategia de distribución · Performance<br>Influencia y earned · Managed Media` },
  { id: 'LN5-revenue', line: 'revenue-hubspot', plate: '2026-09-26_deck-revops/plates/RV1b-motor-de-revenue-isotipo.png', alt: 'Una líder de RevOps de Efeonce con la chaqueta dirige con la mano el nudo de un moño de luz magenta y azul, con agentes robot en el flujo',
    eyebrow: 'Brochure · RevOps & CRM', q: '¿Y el reporte del viernes?', a: 'Ya lo viste', ev: `${b6('Seis')} soluciones:<br>Marketing y AEO · Ventas y pipeline<br>Revenue lifecycle · Servicio<br>Datos y CRM · Operación con agentes` }
]
const slides = LN.map(l => ({ id: l.id, body: async () => {
  const acc = LINE(l.line).accentOnDark
  const Vl = makeVoice({ LOGO, ring: ringOf(acc), TEAL: acc, SOFT, M, answerHtml })
  return `${await photo(GA + l.plate, l.alt)}${Vl.column({ eyebrow: l.eyebrow, q: l.q, a: l.a, ev: l.ev, top: l.top ?? 220 })}`
} }))
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
