// Lámina con varias fotos del registro documental (A), mezclando escenas claras y oscuras. Dos composiciones:
// mosaico 16:9 sobre navy (todas las fotos nativas 16:9) y tríptico 4:5 sobre papel (todas nativas 4:5). Sin recortes
// entre formatos lejanos; la lámina no lleva logo; el avance es el indicador de 80 px.
import { paintGraphicLine, answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/ai-generations/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const img = async (file, w, h) => 'data:image/jpeg;base64,' + (await sharp(R + file).resize(Math.round(w * 1.5), Math.round(h * 1.5), { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')
const T = GL.color.teal, NAVY = GL.color.navy, ACL = GL.lines.find(l => l.key === 'growth').accentOnLight
const tile = (src, x, y, w, h) => `<img src="${src}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:4px;object-fit:cover">`
const cap = (x, y, w, t, c) => `<p style="position:absolute;left:${x}px;top:${y}px;width:${w}px;margin:0;font:300 17px Pop;color:${c}">${t}</p>`
const ring = c => `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${c};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
function indicator(cx, cy, current, surface) {
  const p = GL.pieces.deck.content
  const m = resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'growth', surface, channel: 'deck' }, elements: [{ kind: 'progress', id: 'nav', sections: 5, current, region: 'upper-end' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: surface === 'dark' ? 0.4 : p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx }; el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
  return '<div style="position:absolute;inset:0;z-index:3">' + paintGraphicLine(m, { background: false, idPrefix: 'm' + cx + surface, circles: { nav: { cx, cy, r: 40 } } }).svg + '</div>'
}
// Mosaico 16:9: grande + dos apiladas, todas 16:9 nativas (w=568, W=1172, alto 659).
const w = 568, Wb = 1172, Hb = Math.round(Wb * 9 / 16), h = Math.round(w * 9 / 16), X = 80, Y = 80
const A = `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${GL.color.dark}">
${tile(await img('2026-09-26_deck-mosaico-documental/plates/L2-terreno-panaderia.png', Wb, Hb), X, Y, Wb, Hb)}
${tile(await img('2026-09-26_deck-web-motion/plates/P1-deck-lente-edicion.png', w, h), X + Wb + 20, Y, w, h)}
${tile(await img('2026-09-26_deck-mosaico-documental/plates/L1-mesa-de-luz.png', w, h), X + Wb + 20, Y + h + 20, w, h)}
${cap(X + Wb + 20, Y + 2 * h + 34, w, 'Rodaje, edición y revisión: la misma semana.', '#7F93A8')}
<p style="position:absolute;left:${X}px;top:790px;margin:0;font:300 36px Pop;line-height:1.2;color:#F4F6F8">${ring(T)}¿Cómo trabajamos?</p>
<p style="position:absolute;left:${X - 4}px;top:842px;margin:0;font:760 116px Bric;letter-spacing:-.035em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('A la vista', T)}</p>
${indicator(1760, 900, 4, 'dark')}</div>`
// Tríptico 4:5 sobre papel: oscura, clara, oscura.
const tw = 520, th = 650, tx = 140, ty = 330
const B = `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#F7F7F5">
${indicator(1760, 130, 4, 'light')}
<p style="position:absolute;left:140px;top:110px;margin:0;font:300 40px Pop;line-height:1.2;color:#00284D">${ring(ACL)}¿Dónde ocurre el trabajo?</p>
<p style="position:absolute;left:136px;top:168px;margin:0;font:760 120px Bric;letter-spacing:-.035em;line-height:1;color:${NAVY};white-space:nowrap">${answerHtml('En la sala', ACL)}</p>
${tile(await img('2026-09-21_copiloto/plates/F-podcast-v1.png', tw, th), tx, ty, tw, th)}
${tile(await img('2026-09-26_deck-mosaico-documental/plates/L3-taller-post-its.png', tw, th), tx + tw + 40, ty, tw, th)}
${tile(await img('2026-09-21_copiloto/plates/E-estudio-v2.png', tw, th), tx + 2 * (tw + 40), ty, tw, th)}
${cap(tx, ty + th + 16, tw, 'Estudio de audio · la escucha', '#5F5A69')}${cap(tx + tw + 40, ty + th + 16, tw, 'Taller con el cliente · el recorrido', '#5F5A69')}${cap(tx + 2 * (tw + 40), ty + th + 16, tw, 'Set de producto · la luz', '#5F5A69')}</div>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [id, body] of [['X-mosaico', A], ['X-triptico', B]]) {
  await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}body{margin:0}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: OUT + id + '.png' })
  await sharp(OUT + id + '.png').resize(960).jpeg({ quality: 86 }).toFile(OUT + id + '.jpg')
}
await b.close(); console.log('ok')
