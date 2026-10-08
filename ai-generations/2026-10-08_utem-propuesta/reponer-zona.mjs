// Repone desde la lámina original los píxeles de una zona (texto que el borrado del recuadro alcanzó a tocar).
// Uso: node reponer-zona.mjs <original.png> <editada.png> <salida.png> x0,y0,x1,y1 [más zonas]
import sharp from 'sharp'
const [orig, edit, out, ...boxes] = process.argv.slice(2)
const o = await sharp(orig).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const e = await sharp(edit).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = e.info.width
for (const b of boxes) { const [x0, y0, x1, y1] = b.split(',').map(Number)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * W + x) * 4; for (let k = 0; k < 3; k++) e.data[i + k] = o.data[i + k] } }
await sharp(e.data, { raw: { width: W, height: e.info.height, channels: 4 } }).png().toFile(out)
