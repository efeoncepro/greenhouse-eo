// Escalera visual de pesos, para confirmar con el ojo lo que dice la cobertura.
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const REPO = path.resolve(RUN, '../..')
const FUENTES = path.join(REPO, 'src/assets/fonts')
const bric = fontkit.openSync(path.join(FUENTES, 'BricolageGrotesque-Variable.ttf'))
const pop = w => fontkit.openSync(path.join(FUENTES, { 400: 'Poppins-Regular.ttf', 500: 'Poppins-Medium.ttf', 600: 'Poppins-SemiBold.ttf', 700: 'Poppins-Bold.ttf', 800: 'Poppins-ExtraBold.ttf', 900: 'Poppins-Black.ttf' }[w]))

const linea = (texto, font, size, x, y, fill = '#111') => {
  const run = font.layout(texto)
  const s = size / font.unitsPerEm
  let cx = 0
  let d = ''

  run.glyphs.forEach((g, i) => {
    const p = g.path.toSVG()

    if (p) d += `<path d="${p}" transform="translate(${(cx + run.positions[i].xOffset * s).toFixed(2)} 0) scale(${s} ${-s})"/>`
    cx += run.positions[i].xAdvance * s
  })

  return `<g fill="${fill}" transform="translate(${x} ${y})">${d}</g>`
}

const W = 1700
const filas = []
let y = 110

filas.push(linea('Bricolage · eje de peso (tope real 800)', pop(600), 30, 60, 60, '#666'))
for (const w of [300, 500, 700, 780, 800]) {
  const f = bric.getVariation({ wght: w, wdth: 96, opsz: 88 })

  filas.push(linea(String(w), pop(500), 26, 60, y - 8, '#999'))
  filas.push(linea('El oficio manda.', f, 92, 200, y))
  y += 130
}

y += 40
filas.push(linea('Bricolage · eje de ancho a peso 780 (el que sigue dando contraste arriba)', pop(600), 30, 60, y - 50, '#666'))
for (const wd of [100, 88, 75]) {
  const f = bric.getVariation({ wght: 780, wdth: wd, opsz: 88 })

  filas.push(linea(`w${wd}`, pop(500), 26, 60, y - 8, '#999'))
  filas.push(linea('El oficio manda.', f, 92, 200, y))
  y += 130
}

y += 40
filas.push(linea('Poppins · eje de peso (ningún escalón se satura)', pop(600), 30, 60, y - 50, '#666'))
for (const w of [400, 600, 800, 900]) {
  filas.push(linea(String(w), pop(500), 26, 60, y - 8, '#999'))
  filas.push(linea('EN LA BÚSQUEDA CON IA', pop(w), 58, 200, y))
  y += 100
}

const H = y + 40

await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f4f4f5"/>${filas.join('')}</svg>`))
  .png().toFile(path.join(RUN, 'out', 'hoja-escalera-pesos.png'))
console.log('out/hoja-escalera-pesos.png')
