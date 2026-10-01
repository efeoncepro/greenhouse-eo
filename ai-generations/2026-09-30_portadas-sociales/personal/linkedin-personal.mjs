// Portadas de LinkedIn para PERFILES PERSONALES del equipo (operador, 2026-10-01: «agrega también las portadas de
// LinkedIn para que ellos elijan la que quieran»). Derivan de las ocho portadas corporativas aprobadas el 2026-10-01
// (mismas fotos, mismo copy, mismo acento) y aplican la regla de perfiles personales: logo de Efeonce pequeño
// (120 px, bajo el texto, fuera de la órbita). 1584 × 396; el texto empieza en x 480 para no caer bajo la foto de
// perfil, que LinkedIn monta abajo a la izquierda (≈ 3–22 % del ancho en escritorio, hasta ≈ 29 % en el celular).
// node linkedin-personal.mjs → ../finales/linkedin-personal/*.png
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const sharp = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')('sharp')

const R = '/Users/jreye/Documents/greenhouse-eo/'
const DIR = R + 'ai-generations/2026-09-30_portadas-sociales/'
const OUT = DIR + 'finales/linkedin-personal/'
const W = 1584, H = 396, IMG_W = 1584, IMG_H = 528, SHIFT = 80, X = 480

const AEO = { q: '¿Entre cientos de marcas,<br>a quién cita la IA?', a: 'A ti', accent: '#0375db', qSize: 30, aSize: 104 }
const FMT = { q: '¿Cuántos formatos?', a: 'Todos', accent: '#36c8bf', qSize: 30, aSize: 112 }
// [id, plate, top de la corporativa (sobre 376 de alto en 1128 de ancho), copy, desplazamiento opcional de la foto]
const PIEZAS = [
  ['formatos', 'PS1b-nexa-todos-los-formatos.png', -44, FMT, 240],
  ['formatos-desliza', 'PS7b-nexa-formatos-desliza-isotipo-acabado.png', -21, FMT],
  ['formatos-estallido', 'PS6-nexa-formatos-estallido-isotipo-acabado.png', -33, FMT, 220],
  ['formatos-mosaico', 'PS8-nexa-formatos-mosaico-isotipo-acabado.png', -48, FMT],
  ['aeo', 'PS2c-nexa-la-ia-te-cita.png', -36, AEO],
  ['aeo-elige', 'PS3-nexa-aeo-la-elige-isotipo-acabado.png', -21, AEO],
  ['aeo-pasillo', 'PS5-nexa-aeo-el-pasillo-isotipo-acabado.png', -6, AEO],
  ['aeo-respuesta', 'PS4-nexa-aeo-a-la-respuesta-isotipo-acabado.png', -81, AEO]
]
const font = f => `file://${R}src/assets/fonts/${f}`
const head = `<style>@font-face{font-family:'Bricolage Grotesque';src:url('${font('BricolageGrotesque-Variable.ttf')}');font-weight:200 800}
@font-face{font-family:'Poppins';src:url('${font('Poppins-Light.ttf')}');font-weight:300}
*{box-sizing:border-box} body{margin:0}</style>`

const html = ([id, plate, topCorp, c, shift = SHIFT], fondo) => {
  // mismo centro vertical que la portada corporativa aprobada
  const centro = (-topCorp + 191 / 2) / 376
  const top = Math.max(-(IMG_H - H), Math.min(0, Math.round(H / 2 - centro * IMG_H)))
  return `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>
<div id="a" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${fondo}">
<img src="file://${DIR}personal/html/${id}-foto.png" style="position:absolute;left:0;top:${top}px;width:${IMG_W + shift}px;height:${IMG_H}px">
<div style="position:absolute;left:${X}px;top:0;height:330px;display:flex;flex-direction:column;justify-content:center"><div style="width:470px;color:#fff">
<p style="margin:0;font-family:Poppins;font-weight:300;font-size:${c.qSize}px;line-height:1.25;display:flex;align-items:flex-start;gap:${Math.round(c.qSize * 0.35)}px"><span style="width:${Math.round(c.qSize * 0.47)}px;height:${Math.round(c.qSize * 0.47)}px;margin-top:${Math.round(c.qSize * 0.4)}px;border-radius:50%;border:2px solid ${c.accent};flex:none"></span><span>${c.q}</span></p>
<p style="margin:${Math.round(c.aSize * 0.08)}px 0 0;font-family:'Bricolage Grotesque';font-weight:760;letter-spacing:-0.035em;font-size:${c.aSize}px;line-height:.95;font-variation-settings:'wdth' 96,'opsz' 88">${c.a}<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:${c.accent};margin-left:0.03em"></span></p>
</div></div>
<img src="file://${R}node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg" style="position:absolute;left:${X}px;top:338px;width:120px">
</div></body></html>`
}

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H } })
for (const pz of PIEZAS) {
  const tmp = `${DIR}personal/html/${pz[0]}.html`
  mkdirSync(`${DIR}personal/html`, { recursive: true })
  // la foto se corre a la derecha y el hueco se llena reflejando su propio borde izquierdo (sin franja ni fundido)
  const shift = pz[4] ?? SHIFT
  await sharp(`${DIR}plates/${pz[1]}`).extend({ left: Math.round(shift * 2304 / IMG_W), extendWith: 'mirror' }).png().toFile(`${DIR}personal/html/${pz[0]}-foto.png`)
  writeFileSync(tmp, html(pz, '#001a33'))
  await p.goto('file://' + tmp, { waitUntil: 'load' })
  await p.evaluate(async () => { await document.fonts.ready })
  await p.locator('#a').screenshot({ path: `${OUT}efeonce-linkedin-perfil-${pz[0]}-1584x396.png` })
}
await b.close()
console.log('ok', PIEZAS.length)
