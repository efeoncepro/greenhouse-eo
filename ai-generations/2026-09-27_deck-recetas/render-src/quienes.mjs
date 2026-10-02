// Brochure: portada y contraportada (opciones para el canvas). Medidas de portada y cierre del canon de AXIS
// (deckSlideHtml cover/close); fotos del registro cine con Nexa protagonista.
import { answerHtml, deckSlideHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
import { paintSelection } from './sel.mjs'
import { makeVoice, COPY } from './voz.mjs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-quienes/', import.meta.url).pathname
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
// Quiénes somos y por qué lo hacemos (operador, 2026-09-27): dos láminas de sección del registro cine que expresan
// la pasión por el trabajo. Fotos en pleno trabajo, nadie posa; la voz a la izquierda sobre el 45 % oscuro; sin logo
// (lámina con foto) y la burbuja URL al pie. «+10 años» es un dato, no el centro.
const QP = GL.color.halo
const shade = `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,14,28,.92) 0%,rgba(0,14,28,.78) 34%,rgba(0,14,28,0) 58%);z-index:1"></div>`
const eyebrow = t => `<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT};z-index:3">${t}</p>`
const question = (t, top = 196) => `<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}${t}</p>`
const slides = [
  { id: 'QS1-un-solo-equipo', body: async () => `${await photo(GA + '2026-09-27_quienes-somos/plates/QS1b-un-solo-equipo.png', 'El equipo de Efeonce en el taller de noche, en pleno trabajo alrededor de una mesa de luz: una estratega con el polo de Efeonce marca una prueba, un director de arte con el hoodie sostiene otra con las dos manos y sonríe, y un desarrollador se ríe al fondo; en la pared, piezas de muchas campañas')}${shade}
${eyebrow('Quiénes somos')}${question('¿Quiénes somos?')}
<p style="position:absolute;left:${M - 8}px;top:270px;margin:0;font:760 164px Bric;line-height:.9;letter-spacing:-.05em;color:#fff;z-index:3">Un solo<br>${answerHtml('equipo', TEAL)}</p>
<p style="position:absolute;left:${M}px;top:600px;width:560px;margin:0;font:300 27px/1.45 Pop;color:#E6EDF3;z-index:3">Creatividad, datos, medios y tecnología en una misma mesa, con un solo interlocutor.</p>
<div style="position:absolute;left:${M}px;top:760px;display:flex;gap:40px;z-index:3">
 <div><p style="margin:0;font:760 84px Bric;letter-spacing:-.04em;line-height:1;color:#fff">+10</p><p style="margin:6px 0 0;font:400 20px Pop;color:#E6EDF3">años como agencia</p></div>
 <div style="width:2px;background:rgba(255,255,255,.18)"></div>
 <div><p style="margin:0;font:760 84px Bric;letter-spacing:-.04em;line-height:1;color:#fff">5</p><p style="margin:6px 0 0;font:400 20px Pop;color:#E6EDF3">países</p></div>
 <div style="width:2px;background:rgba(255,255,255,.18)"></div>
 <div><p style="margin:0;font:760 84px Bric;letter-spacing:-.04em;line-height:1;color:#fff">1</p><p style="margin:6px 0 0;font:400 20px Pop;color:#E6EDF3">interlocutor</p></div>
</div>${urlSign()}` },
  { id: 'QS2-contigo', body: async () => `${await photo(GA + '2026-09-27_quienes-somos/plates/QS2-contigo.png', 'Una directora de marketing del cliente, de blazer oscuro, maneja la pantalla y explica con orgullo una curva que sube; a su lado, la estratega de Efeonce con el polo la acompaña como coach, con la mano abierta hacia la pantalla, mirándola a ella y no a la pantalla')}${shade}
${eyebrow('Por qué lo hacemos')}${question('¿Por qué lo hacemos así?')}
<p style="position:absolute;left:${M - 8}px;top:270px;margin:0;font:760 176px Bric;line-height:.9;letter-spacing:-.05em;color:#fff;z-index:3">${answerHtml('Contigo', TEAL)}</p>
<p style="position:absolute;left:${M}px;top:470px;width:700px;margin:0;font:300 34px/1.35 Pop;color:#fff;z-index:3">No te entregamos crecimiento. Lo construimos contigo, y te dejamos <b style="font-weight:600">más capaz</b> de sostenerlo.</p>
<div style="position:absolute;left:${M}px;top:690px;width:700px;z-index:3">
${[['Co-creación', 'operas con nosotros en vivo, en tu panel, no con un PDF el viernes.'], ['Educación', 'te dejamos más capaz, no dependiente: mejores briefs, mejor trabajo.'], ['Crecimiento integral', 'se compone ciclo a ciclo; los números son el resultado, no el origen.']].map(([t, d]) => `<div style="display:flex;gap:18px;align-items:baseline;padding:14px 0;border-top:1px solid rgba(255,255,255,.16)"><p style="margin:0;flex:none;width:250px;font:600 22px Pop;color:${QP}">${t}</p><p style="margin:0;font:400 20px/1.4 Pop;color:#E6EDF3">${d}</p></div>`).join('')}
</div>${urlSign()}` }
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
