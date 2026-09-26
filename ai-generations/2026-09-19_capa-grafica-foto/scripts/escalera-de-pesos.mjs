// Escalera de pesos medida, no estimada.
//
// «Dos pesos contiguos apenas difieren; si no los distingues en situ, te sobra uno.» El problema es
// que el NÚMERO del peso no dice cuánto cambia la mancha: de 740 a 780 hay 40 puntos y no se ve
// nada. Lo que el ojo lee es la MASA DE TINTA: qué fracción de la caja está cubierta por glifo.
//
// Se rasteriza la misma palabra al mismo cuerpo en cada peso y se cuenta cobertura real. También se
// mide el grosor de asta (la moda del ancho de trazo horizontal), que es el otro indicio del ojo.
// Con las dos series se decide qué escalones son escalones y cuáles son ruido.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const REPO = path.resolve(RUN, '../..')
const FUENTES = path.join(REPO, 'src/assets/fonts')
const bric = fontkit.openSync(path.join(FUENTES, 'BricolageGrotesque-Variable.ttf'))
const POPPINS = { 400: 'Poppins-Regular.ttf', 500: 'Poppins-Medium.ttf', 600: 'Poppins-SemiBold.ttf', 700: 'Poppins-Bold.ttf', 800: 'Poppins-ExtraBold.ttf', 900: 'Poppins-Black.ttf' }

const trazar = (texto, font, size) => {
  const run = font.layout(texto)
  const scale = size / font.unitsPerEm
  let x = 0
  let d = ''
  const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const gx = x + p.xOffset * scale
    const sv = g.path.toSVG()

    if (sv) d += `<path d="${sv}" transform="translate(${gx.toFixed(2)} 0) scale(${scale} ${-scale})"/>`
    if (g.bbox && g.bbox.maxX > g.bbox.minX) {
      ink.left = Math.min(ink.left, gx + g.bbox.minX * scale)
      ink.right = Math.max(ink.right, gx + g.bbox.maxX * scale)
      ink.top = Math.min(ink.top, -g.bbox.maxY * scale)
      ink.bottom = Math.max(ink.bottom, -g.bbox.minY * scale)
    }
    x += p.xAdvance * scale
  })

  return { d, ink }
}

// Cobertura real: se rasteriza la caja de tinta y se cuenta alfa.
const medir = async (texto, font, size) => {
  const { d, ink } = trazar(texto, font, size)
  const W = Math.ceil(ink.right - ink.left) + 4
  const H = Math.ceil(ink.bottom - ink.top) + 4
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g fill="#000" transform="translate(${(2 - ink.left).toFixed(2)} ${(2 - ink.top).toFixed(2)})">${d}</g></svg>`
  const { data } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let tinta = 0

  for (let i = 3; i < data.length; i += 4) if (data[i] > 127) tinta++

  // Grosor de asta: por cada fila, la racha horizontal de tinta más frecuente.
  const rachas = []

  for (let y = 0; y < H; y++) {
    let r = 0

    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 127) r++
      else { if (r > 0) rachas.push(r); r = 0 }
    }
    if (r > 0) rachas.push(r)
  }
  rachas.sort((a, b) => a - b)
  const asta = rachas.length ? rachas[Math.floor(rachas.length * 0.5)] : 0

  return { cobertura: Math.round((tinta / (W * H)) * 1000) / 1000, asta, ancho: Math.round(ink.right - ink.left) }
}

const PALABRA = process.argv[2] ?? 'oficio'
const CUERPO = Number(process.argv[3] ?? 140)

console.log(`«${PALABRA}» a ${CUERPO} px\n`)
console.log('BRICOLAGE (ancho 96, opsz 88)')
console.log('  peso   cobertura  Δcob   asta  Δasta  ancho')
let prev = null

for (const w of [300, 400, 500, 600, 700, 740, 780, 800, 900, 1000]) {
  const f = bric.getVariation({ wght: w, wdth: 96, opsz: 88 })
  const m = await medir(PALABRA, f, CUERPO)
  const dc = prev ? `${((m.cobertura - prev.cobertura) / prev.cobertura * 100).toFixed(1)}%` : '—'
  const da = prev ? `${m.asta - prev.asta}` : '—'

  console.log(`  ${String(w).padEnd(7)}${String(m.cobertura).padEnd(11)}${dc.padEnd(7)}${String(m.asta).padEnd(6)}${String(da).padEnd(7)}${m.ancho}`)
  prev = m
}

console.log('\nBRICOLAGE — eje de ANCHO a peso fijo 780')
console.log('  wdth   cobertura  asta  ancho de tinta')
for (const wd of [75, 80, 85, 90, 96, 100]) {
  const f = bric.getVariation({ wght: 780, wdth: wd, opsz: 88 })
  const m = await medir(PALABRA, f, CUERPO)

  console.log(`  ${String(wd).padEnd(7)}${String(m.cobertura).padEnd(11)}${String(m.asta).padEnd(6)}${m.ancho}`)
}

console.log('\nPOPPINS')
console.log('  peso   cobertura  Δcob   asta  Δasta  ancho')
prev = null
for (const w of [400, 500, 600, 700, 800, 900]) {
  const f = fontkit.openSync(path.join(FUENTES, POPPINS[w]))
  const m = await medir(PALABRA, f, CUERPO)
  const dc = prev ? `${((m.cobertura - prev.cobertura) / prev.cobertura * 100).toFixed(1)}%` : '—'
  const da = prev ? `${m.asta - prev.asta}` : '—'

  console.log(`  ${String(w).padEnd(7)}${String(m.cobertura).padEnd(11)}${dc.padEnd(7)}${String(m.asta).padEnd(6)}${String(da).padEnd(7)}${m.ancho}`)
  prev = m
}
