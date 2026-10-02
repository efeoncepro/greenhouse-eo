// Portadas de LinkedIn para PERFILES PERSONALES del equipo (operador, 2026-10-01: «agrega también las portadas de
// LinkedIn para que ellos elijan la que quieran»). Derivan de las ocho portadas corporativas aprobadas el 2026-10-01
// (mismas fotos, mismo copy, mismo acento) y aplican la regla de perfiles personales: logo de Efeonce pequeño
// (120 px, pegado bajo el texto, fuera de la órbita). 1584 × 396; el texto empieza en x 480 para no caer bajo la foto de
// perfil, que LinkedIn monta abajo a la izquierda (≈ 3–22 % del ancho en escritorio, hasta ≈ 29 % en el celular).
// node linkedin-personal.mjs → ../finales/linkedin-personal/*.png
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const sharp = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')('sharp')

const R = '/Users/jreye/Documents/greenhouse-eo/'
const DIR = R + 'ai-generations/2026-09-30_portadas-sociales/'
const OUT = DIR + 'finales/linkedin-personal/'
const W = 1584, H = 396, X = 480

const AEO = { q: '¿Entre cientos de marcas,<br>a quién cita la IA?', a: 'A ti', accent: '#0375db', qSize: 32, aSize: 120 }
const FMT = { q: '¿Cuántos formatos?', a: 'Todos', accent: '#36c8bf', qSize: 32, aSize: 124 }
// Ajuste del operador (2026-10-01, sobre la portada puesta en su perfil): Nexa no puede quedar pegada al borde ni con la
// mano cortada, el logo va pegado al bloque de texto y el mensaje gana tamaño. Por pieza: [id, plate, copy, fracción
// del ancho de la foto donde está la cara de Nexa].
// La cara de Nexa se ubica en x ≈ 1190 en todas (fracción medida de la cara en cada foto); la foto a 1300 de ancho
// deja aire entre el texto y la escena y la mano dentro del cuadro; arriba no se recorta (la cabeza entera).
const CARA = 1190, FW = 1300
const PIEZAS = [
  ['formatos', 'PS1b-nexa-todos-los-formatos.png', FMT, 0.658],
  ['formatos-desliza', 'PS7b-nexa-formatos-desliza-isotipo-acabado.png', FMT, 0.532],
  ['formatos-estallido', 'PS6-nexa-formatos-estallido-isotipo-acabado.png', FMT, 0.648],
  ['formatos-mosaico', 'PS8-nexa-formatos-mosaico-isotipo-acabado.png', FMT, 0.634],
  ['aeo', 'PS2c-nexa-la-ia-te-cita.png', AEO, 0.630, 1140],
  ['aeo-elige', 'PS3-nexa-aeo-la-elige-isotipo-acabado.png', AEO, 0.648],
  ['aeo-pasillo', 'PS5-nexa-aeo-el-pasillo-isotipo-acabado.png', AEO, 0.641],
  ['aeo-respuesta', 'PS4-nexa-aeo-a-la-respuesta-isotipo-acabado.png', AEO, 0.675, 1130]
]
const font = f => `file://${R}src/assets/fonts/${f}`
const head = `<style>@font-face{font-family:'Bricolage Grotesque';src:url('${font('BricolageGrotesque-Variable.ttf')}');font-weight:200 800}
@font-face{font-family:'Poppins';src:url('${font('Poppins-Light.ttf')}');font-weight:300}
*{box-sizing:border-box} body{margin:0}</style>`

// Fondo: la foto a su ancho, ubicada; los huecos a los lados se llenan reflejando su propio borde (sin franja ni
// fundido) y se recorta al alto de la portada con el centro vertical pedido.
const fondo = async ([id, plate, , cara, x = CARA]) => {
  // x opcional: dónde va la cara si en x ≈ 1190 la escena (la burbuja) se corta en el borde derecho
  const fw = FW, fh = Math.round(fw * 768 / 2304), left = Math.round(x - cara * fw)
  const right = Math.max(0, W - left - fw)
  const img = await sharp(`${DIR}plates/${plate}`).resize(fw, fh).extend({ left, right, extendWith: 'mirror' }).png().toBuffer()
  await sharp(img).extract({ left: 0, top: 0, width: W, height: H }).png().toFile(`${DIR}personal/html/${id}-foto.png`)
}

const html = ([id, , c]) => `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>
<div id="a" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#001a33">
<img src="file://${DIR}personal/html/${id}-foto.png" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">
<div style="position:absolute;left:${X}px;top:0;height:${H}px;display:flex;flex-direction:column;justify-content:center"><div style="width:500px;color:#fff">
<p style="margin:0;font-family:Poppins;font-weight:300;font-size:${c.qSize}px;line-height:1.25;display:flex;align-items:flex-start;gap:${Math.round(c.qSize * 0.35)}px"><span style="width:${Math.round(c.qSize * 0.47)}px;height:${Math.round(c.qSize * 0.47)}px;margin-top:${Math.round(c.qSize * 0.4)}px;border-radius:50%;border:2px solid ${c.accent};flex:none"></span><span>${c.q}</span></p>
<p style="margin:${Math.round(c.aSize * 0.06)}px 0 0;font-family:'Bricolage Grotesque';font-weight:760;letter-spacing:-0.035em;font-size:${c.aSize}px;line-height:.95;font-variation-settings:'wdth' 96,'opsz' 88">${c.a}<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:${c.accent};margin-left:0.03em"></span></p>
<img src="file://${R}node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg" style="display:block;width:120px;margin-top:34px">
</div></div>
</div></body></html>`

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H } })
for (const pz of PIEZAS) {
  const tmp = `${DIR}personal/html/${pz[0]}.html`
  mkdirSync(`${DIR}personal/html`, { recursive: true })
  await fondo(pz)
  writeFileSync(tmp, html(pz))
  await p.goto('file://' + tmp, { waitUntil: 'load' })
  await p.evaluate(async () => { await document.fonts.ready })
  await p.locator('#a').screenshot({ path: `${OUT}efeonce-linkedin-perfil-${pz[0]}-1584x396.png` })
}
await b.close()
console.log('ok', PIEZAS.length)
