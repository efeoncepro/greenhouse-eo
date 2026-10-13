// Sustituye la palabra «Pibank» del centro de una lámina compuesta por el logo oficial de Pibank.
// Encuentra la palabra por sus píxeles claros dentro de una ventana, la borra interpolando cada columna entre la fila
// de arriba y la de abajo (el fondo es un degradado suave) y compone el logo blanco centrado en el mismo lugar.
// Uso: node logo-en-centro.mjs <entrada.png> <salida.png> <x0> <y0> <x1> <y1> <altoLogo>
import sharp from 'sharp'

const [inp, out, x0, y0, x1, y1, lh] = process.argv.slice(2)
const W = { x0: +x0, y0: +y0, x1: +x1, y1: +y1 }
const img = sharp(inp)
const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const at = (x, y) => (y * info.width + x) * 4
let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1
for (let y = W.y0; y < W.y1; y++) for (let x = W.x0; x < W.x1; x++) {
  const i = at(x, y)
  if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y) }
}
if (bx1 < 0) throw new Error('no encontré la palabra en la ventana')
const pad = 6
bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad
for (let x = bx0; x <= bx1; x++) {
  const a = at(x, by0 - 1), b = at(x, by1 + 1)
  for (let y = by0; y <= by1; y++) {
    const t = (y - by0 + 1) / (by1 - by0 + 2), i = at(x, y)
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[a + c] * (1 - t) + data[b + c] * t)
  }
}
const logo = await sharp('ai-generations/2026-10-07_pibank-propuesta/logos-cliente/pibank-logo-blanco.svg', { density: 600 }).resize({ height: +lh }).png().toBuffer()
const lm = await sharp(logo).metadata()
const cx = Math.round((bx0 + bx1) / 2), cy = Math.round((by0 + by1) / 2)
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .composite([{ input: logo, left: cx - Math.round(lm.width / 2), top: cy - Math.round(lm.height / 2) }])
  .png().toFile(out)
console.log(JSON.stringify({ word: [bx0, by0, bx1, by1], logo: [lm.width, lm.height], center: [cx, cy] }))
