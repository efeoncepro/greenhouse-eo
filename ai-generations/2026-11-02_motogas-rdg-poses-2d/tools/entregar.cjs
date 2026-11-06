// Recorta cada SVG vectorizado a su silueta (+3 % de aire), lo renderiza a PNG transparente y arma las hojas.
// Uso: NODE_PATH=$PWD/node_modules node entregar.cjs <carpeta-corrida>
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const R = process.argv[2]
const POSES = [
  ['00', 'base'], ['01', 'megafono'], ['02', 'corriendo'], ['03', 'senalando'], ['04', 'apoyado'],
  ['05', 'celular'], ['06', 'saludando'], ['07', 'pensando'], ['08', 'celebrando'], ['09', 'guino']
]
const out = path.join(R, 'entrega')

fs.mkdirSync(out, { recursive: true })

;(async () => {
  const pngs = []

  for (const [n, p] of POSES) {
    const base = path.join(R, 'vector', `rdg-2d-${n}-${p}-v01`)
    const svg = fs.readFileSync(base + '.svg', 'utf8')
    const { info } = await sharp(base + '.png').trim().toBuffer({ resolveWithObject: true })
    const x = -info.trimOffsetLeft
    const y = -info.trimOffsetTop
    const m = Math.round(Math.max(info.width, info.height) * 0.03)
    const vb = [x - m, y - m, info.width + 2 * m, info.height + 2 * m]
    const recortado = svg.replace(/viewBox="[^"]+" width="\d+" height="\d+"/, `viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}"`)
    const nombre = `motogas-rdg-2d-${n}-${p}-v01`

    fs.writeFileSync(path.join(out, nombre + '.svg'), recortado)
    await sharp(Buffer.from(recortado)).png().toFile(path.join(out, nombre + '.png'))
    pngs.push(path.join(out, nombre + '.png'))
  }

  // Hojas: 5 × 2 sobre blanco y sobre el rojo de los paneles de la marca
  const C = 600
  const celdas = await Promise.all(pngs.map(f => sharp(f).resize(C - 60, C - 60, { fit: 'inside' }).png().toBuffer()))

  for (const [fondo, nombre] of [['#FFFFFF', 'hoja-sobre-blanco'], ['#DF1500', 'hoja-sobre-rojo'], ['#E6E7E8', 'hoja-sobre-gris-tela']]) {
    const comp = []

    for (let i = 0; i < celdas.length; i++) {
      const mt = await sharp(celdas[i]).metadata()

      comp.push({ input: celdas[i], left: (i % 5) * C + Math.round((C - mt.width) / 2), top: Math.floor(i / 5) * C + Math.round((C - mt.height) / 2) })
    }

    await sharp({ create: { width: 5 * C, height: 2 * C, channels: 3, background: fondo } }).composite(comp).png().toFile(path.join(out, nombre + '.png'))
  }

  console.log(fs.readdirSync(out).join('\n'))
})()
