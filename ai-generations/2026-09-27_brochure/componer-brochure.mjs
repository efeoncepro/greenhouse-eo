// Brochure: portada y contraportada (opciones para el canvas). Medidas de portada y cierre del canon de AXIS
// (deckSlideHtml cover/close); fotos del registro cine con Nexa protagonista.
import { answerHtml, deckSlideHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-brochure/', import.meta.url).pathname
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

const slides = [
  { id: 'BRO-portada-orbita', body: async () => `<img src="${await jpg(PL + 'BR1b-portada-orbita-isotipo.png')}" alt="Nexa, con la chaqueta de Efeonce, mira a cámara frente a una órbita de luz teal gigante con una sola esfera" style="position:absolute;inset:0;width:${W}px;height:${H}px">${coverVoice('Servicios · 2026', '¿Qué hace Efeonce?', 'Crecer')}` },
  { id: 'BRO-portada-equipo', body: async () => `<img src="${await jpg(PL + 'BR2b-portada-equipo-isotipo.png')}" alt="Nexa al frente del equipo de Efeonce con sus uniformes y cinco agentes mini robots, todos mirando a cámara" style="position:absolute;inset:0;width:${W}px;height:${H}px">${coverVoice('Servicios · 2026', '¿Quién hace crecer<br>tu marca?', 'equipo', 130, 36, 515, 630, 'Este<br>')}` },
  { id: 'BRO-contraportada-orbita', body: async () => {
    const html = deckSlideHtml('close', { sections: 5, current: 5, question: '¿Conversamos?', answer: 'Cuando quieras', line: 'growth', assetBase: '__BA__', idPrefix: 'bc' })
    return html.replaceAll('__BA__efeonce-logo-negative.svg', LOGO).replace('<div class="axis-deck-slide"', '<div class="axis-deck-slide" data-root') +
      `<div style="position:absolute;left:0;top:${H - 96}px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:36px;font:500 20px Pop;color:${SOFT};z-index:3"><img src="${bubble}" alt="efeoncepro.com" style="height:30px"><span>${contactLine(20)}</span></div>`
  } },
  { id: 'BRO-contraportada-horizonte', body: async () => `<img src="${await jpg(PL + 'BR3-contra-horizonte.png')}" alt="Nexa, de espaldas, camina hacia una órbita de luz teal que se levanta como un portal en el horizonte" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:130px;width:280px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:380px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}¿Conversamos?</p>
<p style="position:absolute;left:${M - 4}px;top:455px;margin:0;font:760 118px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">Cuando<br>${answerHtml('quieras', TEAL)}</p>
<p style="position:absolute;left:${M}px;top:710px;margin:0;font:28px/1.15 Pop;white-space:nowrap;z-index:3">${slogan(28)}</p>
<div style="position:absolute;left:${M}px;top:790px;display:flex;flex-direction:column;gap:14px;font:500 20px/1.3 Pop;color:${SOFT};z-index:3"><img src="${bubble}" alt="efeoncepro.com" style="height:30px;width:auto;align-self:flex-start">${CONTACT.map(c => `<span>${c}</span>`).join('')}</div>` }
]

const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBoldItalic.ttf')});font-weight:800;font-style:italic}@font-face{font-family:Pop;src:url(${f64('Poppins-BlackItalic.ttf')});font-weight:900;font-style:italic}@font-face{font-family:'Poppins';src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:'Poppins';src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:'Poppins';src:url(${f64('Poppins-ExtraBoldItalic.ttf')});font-weight:800;font-style:italic}@font-face{font-family:'Poppins';src:url(${f64('Poppins-BlackItalic.ttf')});font-weight:900;font-style:italic}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}body{margin:0}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
for (const sl of slides) {
  const body = await sl.body()
  await pg.setContent(`<html><head>${css}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${GL.color.dark}">${body}</div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: `${OUT}${sl.id}.png` })
  await sharp(`${OUT}${sl.id}.png`).jpeg({ quality: 88 }).toFile(`${OUT}${sl.id}.jpg`)
  console.log('ok', sl.id)
}
await b.close()
