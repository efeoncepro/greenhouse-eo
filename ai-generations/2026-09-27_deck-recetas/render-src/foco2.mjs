// Contenido con el foco, con punch: el foco de AXIS (spotlightRecipe, sólo su pintura) sobre la estratega de uniforme;
// la voz en escala de la línea: respuesta gigante con su esfera y la prueba con la cifra en Bricolage.
import { spotlightRecipe, answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/'
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const T = GL.color.teal, SOFT = GL.slogan.leadColor.onDark
const photo = 'data:image/jpeg;base64,' + (await sharp(R + 'ai-generations/2026-09-26_web-hero/plates/H1b-estratega-uniforme.png').resize(1920, 1080, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const rec = spotlightRecipe('photo', { photoId: 'h', photoSrc: photo, alt: 'x', answer: 'A la primera', proof: '62 %' })
const ring = `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const body = `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${GL.color.dark}">${rec.svg.replace('<svg ', '<svg style="position:absolute;inset:0" ')}
<p style="position:absolute;left:140px;top:150px;margin:0;font:500 20px Pop;letter-spacing:.14em;text-transform:uppercase;color:#9FB3C8">Resultados · 3 de 5</p>
<p style="position:absolute;left:140px;top:240px;margin:0;font:300 40px Pop;line-height:1.25;color:${SOFT}">${ring}¿Cuántos cortes<br>pasan a la primera?</p>
<p style="position:absolute;left:128px;top:370px;margin:0;font:760 170px Bric;letter-spacing:-.05em;line-height:.92;color:#fff">A la<br>${answerHtml('primera', T)}</p>
<p style="position:absolute;left:140px;top:720px;margin:0;font:760 110px Bric;letter-spacing:-.04em;line-height:1;color:${T}">62 %</p>
<p style="position:absolute;left:142px;top:840px;width:520px;margin:0;font:300 28px/1.4 Pop;color:${SOFT}">de los cortes se aprueban sin cambios.</p>
<p style="position:absolute;left:140px;top:960px;margin:0;font:300 17px Pop;color:#7F93A8">Datos de muestra</p></div>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}body{margin:0}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
await pg.evaluate(() => document.fonts.ready)
await pg.screenshot({ path: 'out-dwm/C-foco2.png' }); await b.close()
await sharp('out-dwm/C-foco2.png').resize(960).jpeg({ quality: 86 }).toFile('out-dwm/C-foco2.jpg'); console.log('ok')
