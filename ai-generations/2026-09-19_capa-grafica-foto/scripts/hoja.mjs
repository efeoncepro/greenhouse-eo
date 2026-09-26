// Hoja de revisión por formato: todas las variantes de un ratio en una grilla rotulada.
// Se arma desde qa.json (no ordenando nombres de archivo) para que ninguna pieza se intercale mal.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const REPO = path.resolve(RUN, '../..')
const OUT = path.join(RUN, 'out')
const { variantes } = JSON.parse(fs.readFileSync(path.join(OUT, 'qa.json'), 'utf8'))
const TANDA = process.argv[2] ?? ''
const SUFIJO = process.argv[3] ?? ''
const pop = fontkit.openSync(path.join(REPO, 'src/assets/fonts/Poppins-Medium.ttf'))

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

  return { svg: `<g fill="${fill}">${paths}</g>`, ancho: x }
}

const CEL = 340
const GAP = 16
const ROT = 34

for (const formato of ['4:5', '9:16', '16:9']) {
  const lista = variantes.filter(v => v.formato === formato && !v.error && (!TANDA || new RegExp(TANDA).test(v.id)))

  if (!lista.length) continue
  const primera = await sharp(path.join(OUT, `${lista[0].id}.png`)).metadata()
  const escala = CEL / primera.width
  const alto = Math.round(primera.height * escala)
  const cols = formato === '16:9' ? 3 : 4
  const filas = Math.ceil(lista.length / cols)
  const W = cols * CEL + (cols + 1) * GAP
  const H = filas * (alto + ROT) + (filas + 1) * GAP
  const capas = []
  let rotulos = ''

  for (const [i, v] of lista.entries()) {
    const c = i % cols
    const f = Math.floor(i / cols)
    const left = GAP + c * (CEL + GAP)
    const top = GAP + f * (alto + ROT + GAP)

    capas.push({ input: await sharp(path.join(OUT, `${v.id}.png`)).resize({ width: CEL }).png().toBuffer(), left, top })
    const t = texto(`${v.id}${v.pasa ? '' : '  ✗'}`, 15, v.pasa ? '#111111' : '#b00020')

    rotulos += `<g transform="translate(${left} ${top + alto + 20})">${t.svg}</g>`
  }

  const archivo = path.join(OUT, `hoja${SUFIJO}-${formato.replace(':', 'x')}.png`)

  await sharp({ create: { width: W, height: H, channels: 3, background: '#f4f4f5' } })
    .composite([...capas, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rotulos}</svg>`), left: 0, top: 0 }])
    .png()
    .toFile(archivo)
  console.log(archivo, `${lista.length} piezas`)
}
