// Alternativas de lámina de sección con foto (además de la lente): clásica AXIS en papel, foto a sangre con indicador,
// y media foto con la sección en papel. Todo con el paquete; la sección clásica sale de deckSlideHtml tal cual.
import { paintGraphicLine, answerHtml, deckSlideHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const img = async (file, w, h) => 'data:image/jpeg;base64,' + (await sharp(R + file).resize(w, h, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const T = GL.color.teal, NAVY = GL.color.navy, lineDef = GL.lines.find(l => l.key === 'growth')
const ringMark = c => `<span aria-hidden="true" style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${c};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
function indicator(cx, cy, current, surface) {
  const p = GL.pieces.deck.content
  const m = resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'growth', surface, channel: 'deck' }, elements: [{ kind: 'progress', id: 'nav', sections: 5, current, region: 'upper-end' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: surface === 'dark' ? 0.4 : p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx }; el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
  return '<div style="position:absolute;inset:0;z-index:3">' + paintGraphicLine(m, { background: false, idPrefix: 'i' + cx + surface, circles: { nav: { cx, cy, r: 40 } } }).svg + '</div>'
}
const shots = []
const SKIP = true
// B · clásica AXIS (papel, número dentro del anillo) — sin foto
shots.push(['S-clasica', deckSlideHtml('section', { sections: 5, current: 2, question: '¿Quién decide el corte?', answer: 'El dato', idPrefix: 'sc' })])
// C · foto a sangre + indicador chico (la foto manda; el avance es el indicador de 80 px sobre su zona calma)
const p1 = await img('ai-generations/2026-09-26_deck-web-motion/plates/P1-deck-lente-edicion.png', 1920, 1080)
shots.push(['S-sangre', `<div style="position:relative;width:1920px;height:1080px;overflow:hidden"><img src="${p1}" style="position:absolute;inset:0;width:1920px;height:1080px">
${indicator(180, 190, 2, 'dark')}
<p style="position:absolute;left:140px;top:300px;margin:0;font:500 22px Pop;letter-spacing:.14em;text-transform:uppercase;color:#9FB3C8">Sección 2 de 5</p>
<p style="position:absolute;left:140px;top:372px;margin:0;font:300 40px Pop;line-height:1.2;color:#F4F6F8">${ringMark(T)}¿Quién decide el corte?</p>
<p style="position:absolute;left:140px;top:432px;margin:0;font:760 132px Bric;letter-spacing:-.035em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('El dato', T)}</p></div>`])
const q3w = await img('ai-generations/2026-09-26_ronda-1x1/plates/Q3c-retrato-seccion.png', 1260, 1080)
shots.length = 0
// D · media foto: la sección en papel a la izquierda (número + voz + indicador), la foto a sangre a la derecha

shots.push(['S-media-redondas-x', `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff">
<img src="${q3w}" style="position:absolute;left:660px;top:0;width:1260px;height:1080px">
<div style="position:absolute;left:0;top:0;width:960px;height:1080px;background:#fff;border-radius:0 56px 56px 0"></div>
${indicator(180, 170, 2, 'light')}
<p style="position:absolute;left:140px;top:260px;margin:0;font:300 190px Bric;line-height:.95;letter-spacing:-.02em;color:${NAVY}">02</p>
<p style="position:absolute;left:146px;top:450px;margin:0;font:500 24px Pop;color:#5F5A69">Sección 2 de 5</p>
<p style="position:absolute;left:140px;top:600px;margin:0;font:300 40px Pop;line-height:1.2;color:#00284D">${ringMark(lineDef.accentOnLight)}¿Quién decide el corte?</p>
<p style="position:absolute;left:140px;top:670px;margin:0;font:760 120px Bric;letter-spacing:-.035em;line-height:1;color:${NAVY};white-space:nowrap">${answerHtml('El dato', lineDef.accentOnLight)}</p></div>`])
// D · media foto: la sección en papel a la izquierda (número + voz + indicador), la foto a sangre a la derecha

shots.push(['S-media-final', `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff">
<img src="${q3w}" style="position:absolute;left:660px;top:0;width:1260px;height:1080px">
<div style="position:absolute;left:0;top:0;width:960px;height:1080px;background:#fff;border-radius:0 300px 0 0"></div>
${indicator(180, 170, 2, 'light')}
<p style="position:absolute;left:140px;top:260px;margin:0;font:300 190px Bric;line-height:.95;letter-spacing:-.02em;color:${NAVY}">02</p>
<p style="position:absolute;left:146px;top:450px;margin:0;font:500 24px Pop;color:#5F5A69">Sección 2 de 5</p>
<p style="position:absolute;left:140px;top:600px;margin:0;font:300 40px Pop;line-height:1.2;color:#00284D">${ringMark(lineDef.accentOnLight)}¿Quién decide el corte?</p>
<p style="position:absolute;left:140px;top:670px;margin:0;font:760 120px Bric;letter-spacing:-.035em;line-height:1;color:${NAVY};white-space:nowrap">${answerHtml('El dato', lineDef.accentOnLight)}</p></div>`])
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [id, body] of shots) {
  await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Poppins;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Poppins;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}body{margin:0}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: OUT + id + '.png' })
  await sharp(OUT + id + '.png').resize(960).jpeg({ quality: 86 }).toFile(OUT + id + '.jpg')
}
await b.close(); console.log('ok')
