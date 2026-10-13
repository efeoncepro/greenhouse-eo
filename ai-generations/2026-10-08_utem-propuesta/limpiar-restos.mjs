// Borra los restos verticales del recuadro de selección que quedan junto a las manijas laterales y en el reflejo:
// cada franja se rellena interpolando en horizontal entre la columna de su izquierda y la de su derecha.
// Uso: node limpiar-restos.mjs <entrada.png> <salida.png> x0,y0,x1,y1 [x0,y0,x1,y1 …]
import sharp from 'sharp'
const [inp, out, ...boxes] = process.argv.slice(2)
const { data, info } = await sharp(inp).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = info.width, at = (x, y) => (y * W + x) * 4, src = Buffer.from(data)
for (const b of boxes) { const [x0, y0, x1, y1] = b.split(',').map(Number)
  for (let y = y0; y <= y1; y++) { const a = at(x0 - 1, y), c = at(x1 + 1, y)
    for (let x = x0; x <= x1; x++) { const t = (x - x0 + 1) / (x1 - x0 + 2), i = at(x, y); for (let k = 0; k < 3; k++) data[i + k] = Math.round(src[a + k] * (1 - t) + src[c + k] * t) } } }
await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(out)
