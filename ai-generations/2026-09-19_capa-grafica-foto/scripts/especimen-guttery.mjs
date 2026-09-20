// Espécimen de Guttery en PNG para pasárselo al modelo como referencia de forma.
// No es una pieza: es una muestra del trazo, con el alfabeto y las palabras reales que usaríamos.
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const gutt = fontkit.openSync(path.join(os.homedir(), 'Library/Fonts/Guttery.otf'))

const trazar = (texto, size, x, y, fill = '#111111') => {
  const run = gutt.layout(texto)
  const scale = size / gutt.unitsPerEm
  let cx = 0
  let d = ''

  run.glyphs.forEach((g, i) => {
    const p = g.path.toSVG()

    if (p) d += `<path d="${p}" transform="translate(${(cx + run.positions[i].xOffset * scale).toFixed(2)} 0) scale(${scale} ${-scale})"/>`
    cx += run.positions[i].xAdvance * scale
  })

  return `<g fill="${fill}" transform="translate(${x} ${y})">${d}</g>`
}

const W = 1536
const H = 1024
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${trazar('Guttery', 150, 90, 200)}
  ${trazar('abcdefghijklmnñopqrstuvwxyz', 76, 90, 330)}
  ${trazar('ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', 76, 90, 440)}
  ${trazar('¿apostamos? ¡por fin! ¿hola?', 96, 90, 580)}
  ${trazar('¡a la orden!', 130, 90, 730)}
  <g transform="rotate(-8 90 880)">${trazar('¿lo ves?', 130, 90, 880)}</g>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(path.join(RUN, 'prueba-modelo', 'especimen-guttery.png'))
console.log('prueba-modelo/especimen-guttery.png')
