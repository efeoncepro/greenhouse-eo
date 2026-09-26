// Superpone una grilla en décimas sobre un plate para leer la posición real de un objeto
// antes de declarar la región de una caja de selección. Herramienta de lectura, no de entrega.
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const pop = fontkit.openSync(path.join(REPO, 'src/assets/fonts/Poppins-Bold.ttf'))
const texto = (t, size) => {
  const run = pop.layout(t)
  const s = size / pop.unitsPerEm
  let x = 0
  let d = ''

  run.glyphs.forEach((g, i) => {
    const p = g.path.toSVG()

    if (p) d += `<path d="${p}" transform="translate(${x.toFixed(1)} 0) scale(${s} ${-s})"/>`
    x += run.positions[i].xAdvance * s
  })

  return d
}

const file = process.argv[2]
const out = process.argv[3]
const { width: W, height: H } = await sharp(file).metadata()
let g = ''

for (let i = 1; i < 10; i++) {
  const x = (W * i) / 10
  const y = (H * i) / 10

  g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#00ff88" stroke-width="2" stroke-opacity="0.55"/>`
  g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#00ff88" stroke-width="2" stroke-opacity="0.55"/>`
  g += `<g fill="#00ff88" transform="translate(${x + 6} 28)">${texto(`0.${i}`, 26)}</g>`
  g += `<g fill="#00ff88" transform="translate(8 ${y - 8})">${texto(`0.${i}`, 26)}</g>`
}

// sharp aplica el resize ANTES del composite dentro de la misma cadena: hay que componer a tamaño
// completo y sólo entonces reducir.
const conGrilla = await sharp(file)
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`) }])
  .png()
  .toBuffer()

await sharp(conGrilla).resize({ width: 600 }).png().toFile(out)
console.log(out)
