// Contenido con foto, dos versiones con personalidad: (A) la órbita MIDE la cifra alrededor de la foto; (B) el foco
// (spotlightRecipe tal cual) pone la luz sobre lo que la cifra prueba. Una sola órbita por lámina.
import { paintGraphicLine, answerHtml, spotlightRecipe, recipeHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const img = async (file) => 'data:image/jpeg;base64,' + (await sharp(R + file).resize(1920, 1080, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const T = GL.color.teal
const p1 = await img('ai-generations/2026-09-26_deck-web-motion/plates/P1-deck-lente-edicion.png')
const p2 = await img('ai-generations/2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png')

// A · la órbita mide: 62 % → el arco recorre 62 % del círculo desde las 12 y la esfera se detiene ahí.
const p = GL.pieces.lens['deck-cover']
const m = resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'growth', surface: 'dark', channel: 'deck' }, elements: [{ kind: 'lens', id: 'lens', photoId: 'ph', alt: 'x', region: 'center-end', accentSphere: 'upper-start' }] })
const el = m.elements[0]
el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: p.ring.opacity }
el.arc = { ...el.arc, strokePx: p.arc.strokePx, startDeg: -90, sweepDeg: 0.62 * 360 }
el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
if (el.inside) el.inside = { ...el.inside, zoom: 1 }
const lens = paintGraphicLine(m, { photos: { ph: p1 }, background: true, idPrefix: 'mide', circles: { lens: { cx: p.ring.cx, cy: p.ring.cy, r: p.ring.r / (1 + GL.orbit.ringAirRatio) } } }).svg
const small = (x, n, l) => `<div style="position:absolute;left:${x}px;top:790px;width:300px"><p style="margin:0;font:760 64px Bric;letter-spacing:-.035em;color:#fff;white-space:nowrap">${n}</p><p style="margin:4px 0 0;font:300 21px/1.35 Pop;color:#9FB3C8">${l}</p></div>`
const A = `<div style="position:relative;width:1920px;height:1080px;overflow:hidden">${lens.replace('<svg ', '<svg style="position:absolute;inset:0" ')}
<p style="position:absolute;left:140px;top:150px;margin:0;font:500 20px Pop;letter-spacing:.14em;text-transform:uppercase;color:#9FB3C8">Resultados · 3 de 5</p>
<p style="position:absolute;left:140px;top:215px;margin:0;font:300 40px Pop;line-height:1.2;color:#F4F6F8"><span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>¿Cuántos cortes pasan a la primera?</p>
<p style="position:absolute;left:128px;top:270px;margin:0;font:760 300px Bric;letter-spacing:-.045em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('62 %', T)}</p>
<p style="position:absolute;left:140px;top:590px;width:560px;margin:0;font:300 26px/1.4 Pop;color:#C9D4DF">de los cortes se aprueban sin cambios. El arco de la lente recorre ese 62 %.</p>
${small(140, '12 días', 'de idea a pieza')}${small(440, '−38 %', 'costo por lead')}
<p style="position:absolute;left:140px;top:960px;margin:0;font:300 17px Pop;color:#7F93A8">Datos de muestra</p></div>`

// B · el foco: la escena en penumbra y un círculo de luz sobre lo que importa, siempre con su prueba (receta tal cual).
const rec = spotlightRecipe('photo', { photoId: 'p2', photoSrc: p2, alt: 'El cliente recibe la pieza aprobada', answer: 'A la primera', proof: '62 % de los cortes, aprobados sin cambios.' })
const B = `<div style="position:relative;width:1920px;height:1080px;overflow:hidden">${recipeHtml(rec)}
<p style="position:absolute;left:140px;top:150px;margin:0;font:500 20px Pop;letter-spacing:.14em;text-transform:uppercase;color:#9FB3C8">Resultados · 3 de 5</p>
<p style="position:absolute;left:140px;top:960px;margin:0;font:300 17px Pop;color:#7F93A8">Datos de muestra</p></div>`

const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [id, body] of [['C-mide', A], ['C-foco', B]]) {
  await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Poppins;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}body{margin:0;background:${GL.color.dark}}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: OUT + id + '.png' })
  await sharp(OUT + id + '.png').resize(960).jpeg({ quality: 86 }).toFile(OUT + id + '.jpg')
}
await b.close(); console.log('ok')
