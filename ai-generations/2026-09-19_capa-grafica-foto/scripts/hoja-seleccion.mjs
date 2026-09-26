// Hoja de las 10 seleccionadas, en el orden de la selección (no alfabético: una pieza suelta
// ordenada por nombre de archivo se intercala mal y se lee como si fuera otra posición).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const REPO = path.resolve(RUN, '../..')
const OUT = path.join(RUN, 'out')
const pop = fontkit.openSync(path.join(REPO, 'src/assets/fonts/Poppins-Medium.ttf'))

const ORDEN = (process.env.ORDEN ?? '').split(',').filter(Boolean)

const texto = (t, size, fill) => {
  const run = pop.layout(t)
  const s = size / pop.unitsPerEm
  let x = 0
  let paths = ''

  run.glyphs.forEach((g, i) => {
    const d = g.path.toSVG()

    if (d) paths += `<path d="${d}" transform="translate(${x.toFixed(2)} 0) scale(${s} ${-s})"/>`
    x += run.positions[i].xAdvance * s
  })

  return `<g fill="${fill}">${paths}</g>`
}

const CEL = 330
const GAP = 18
const ROT = 32
const cols = 5
const celdas = []

for (const id of ORDEN) {
  const buf = await sharp(path.join(OUT, `${id}.png`)).resize({ width: CEL }).png().toBuffer()
  const { height } = await sharp(buf).metadata()

  celdas.push({ id, buf, height })
}

const altoFila = i => Math.max(...celdas.slice(i * cols, i * cols + cols).map(c => c.height))
const filas = Math.ceil(celdas.length / cols)
const alturas = Array.from({ length: filas }, (_, i) => altoFila(i))
const W = cols * CEL + (cols + 1) * GAP
const H = alturas.reduce((a, b) => a + b + ROT + GAP, GAP)
const capas = []
let rotulos = ''
let y = GAP

for (let f = 0; f < filas; f++) {
  for (let c = 0; c < cols; c++) {
    const i = f * cols + c

    if (i >= celdas.length) break
    const left = GAP + c * (CEL + GAP)
    const top = y + Math.round((alturas[f] - celdas[i].height) / 2)

    capas.push({ input: celdas[i].buf, left, top })
    rotulos += `<g transform="translate(${left} ${y + alturas[f] + 20})">${texto(`${i + 1}. ${celdas[i].id}`, 15, '#111111')}</g>`
  }
  y += alturas[f] + ROT + GAP
}

const archivo = path.join(OUT, process.env.SALIDA ?? 'hoja-seleccion-10.png')

await sharp({ create: { width: W, height: H, channels: 3, background: '#f4f4f5' } })
  .composite([...capas, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rotulos}</svg>`), left: 0, top: 0 }])
  .png()
  .toFile(archivo)
console.log(archivo)
