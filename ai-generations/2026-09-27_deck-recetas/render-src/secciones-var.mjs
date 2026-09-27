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
function indicator(cx, cy, current, surface, sweep, mirror, tf) {
  const p = GL.pieces.deck.content
  const m = resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'growth', surface, channel: 'deck' }, elements: [{ kind: 'progress', id: 'nav', sections: 5, current, region: 'upper-end' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: surface === 'dark' ? 0.4 : p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx, ...(sweep ? { sweepDeg: sweep } : {}) }; el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
  const svg = paintGraphicLine(m, { background: false, idPrefix: 'i' + cx + surface, circles: { nav: { cx, cy, r: 40 } } }).svg
  return '<div style="position:absolute;inset:0;z-index:3;' + (tf ? `transform:${tf};transform-origin:${cx}px ${cy}px` : mirror ? `transform:scaleX(-1);transform-origin:${cx}px ${cy}px` : '') + '">' + svg + '</div>'
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
const q3flop = 'data:image/jpeg;base64,' + (await sharp('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_ronda-1x1/plates/Q3c-retrato-seccion.png').flop().resize(1890, 1620, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const SP = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_secciones-partidas/plates/'
const sp2 = 'data:image/jpeg;base64,' + (await sharp(SP + 'SP2b-dias-no-meses-isotipo.png').resize(1260, 1080, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const sp1 = 'data:image/jpeg;base64,' + (await sharp(SP + 'SP1-la-ia-te-cita.png').flop().resize(1260, 1080, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const txt = (x, n, q, a, apx = 132) => `${indicator(x + 40, 170, n, 'light', 72 * (n - 1), false, 'scaleX(-1) rotate(-65deg) scaleY(-1)')}
<p style="position:absolute;left:${x}px;top:260px;margin:0;font:300 190px Bric;line-height:.95;letter-spacing:-.02em;color:${NAVY}">0${n}</p>
<p style="position:absolute;left:${x + 6}px;top:450px;margin:0;font:500 24px Pop;color:#5F5A69">Sección ${n} de 5</p>
<p style="position:absolute;left:${x}px;top:600px;margin:0;font:300 40px Pop;line-height:1.2;color:#00284D">${ringMark(lineDef.accentOnLight)}${q}</p>
<p style="position:absolute;left:${x - 4}px;top:668px;margin:0;font:760 ${apx}px Bric;letter-spacing:-.04em;line-height:1;color:${NAVY};white-space:nowrap">${answerHtml(a, lineDef.accentOnLight)}</p>`
shots.push(['S-var-abajo', `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff">
<img src="${sp2}" style="position:absolute;left:660px;top:0;width:1260px;height:1080px">
<div style="position:absolute;left:0;top:0;width:960px;height:1080px;background:#fff;border-radius:0 0 300px 0"></div>${txt(140, 3, '¿Cuánto tarda tu campaña?', 'En días')}</div>`])
shots.push(['S-var-derecha', `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff">
<img src="${sp1}" style="position:absolute;left:0;top:0;width:1260px;height:1080px">
<div style="position:absolute;left:960px;top:0;width:960px;height:1080px;background:#fff;border-radius:300px 0 0 0"></div>${txt(1100, 4, '¿Qué responde la IA?', 'Tu marca')}</div>`])
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [id, body] of shots) {
  await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Poppins;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Poppins;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}body{margin:0}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: OUT + id + '.png' })
  await sharp(OUT + id + '.png').jpeg({ quality: 86 }).toFile(OUT + id + '.jpg')
}
await b.close(); console.log('ok')
