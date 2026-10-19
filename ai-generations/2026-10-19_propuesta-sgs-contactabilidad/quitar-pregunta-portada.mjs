// Retira la línea de la pregunta de la portada cover-proposal (layout orbit, columna en 220): el operador decidió el
// 2026-10-19 que la portada de esta propuesta dice lo que es, sin pregunta, y la receta de AXIS todavía la exige.
// La zona (sólo la línea de la pregunta, lejos de la órbita) se rellena interpolando entre la fila de arriba y la de abajo.
// Temporal: se retira cuando AXIS tenga una portada de propuesta sin pregunta.
// Uso: node quitar-pregunta-portada.mjs <entrada.png> <salida.png>
import sharp from 'sharp'

const [inp, out] = process.argv.slice(2)
const { data, info } = await sharp(inp).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = info.width, at = (x, y) => (y * W + x) * 4
const R = { x0: 120, y0: 452, x1: 700, y1: 513 }
const src = Buffer.from(data)
for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) {
  const a = at(x, R.y0 - 1), b = at(x, R.y1 + 1), t = (y - R.y0 + 1) / (R.y1 - R.y0 + 2), i = at(x, y)
  for (let c = 0; c < 3; c++) data[i + c] = Math.round(src[a + c] * (1 - t) + src[b + c] * t)
}
await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(out)
