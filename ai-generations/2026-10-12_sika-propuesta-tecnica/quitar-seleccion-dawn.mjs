// Quita la selección («Cliente», cursor, recuadro y manijas) que cover-proposal · dawn pinta sobre el logo del cliente.
// La etiqueta y el cursor se reponen con el espejo izquierdo de la lámina (dawn es simétrica en x = 960);
// el recuadro se rellena interpolando en vertical y el logo (píxeles rojos y amarillos) se devuelve tal cual.
// Uso: node quitar-seleccion-dawn.mjs <entrada.png> <salida.png>
import sharp from 'sharp'
const [inp, out] = process.argv.slice(2)
const { data, info } = await sharp(inp).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = info.width, k = W / 1920, at = (x, y) => (y * W + x) * 4
const orig = Buffer.from(data)
const S = v => Math.round(v * k)
const A = { x0: S(1130), y0: S(716), x1: S(1420), y1: S(850) }
for (let y = A.y0; y <= A.y1; y++) for (let x = A.x0; x <= A.x1; x++) { const a = at(x, y), b = at(W - 1 - x, y); for (let c = 0; c < 3; c++) data[a + c] = orig[b + c] }
const B = { x0: S(748), y0: S(846), x1: S(1220), y1: S(1050) }
const src = Buffer.from(data)
for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) {
  const i = at(x, y), r = orig[i], g = orig[i + 1], b = orig[i + 2]
  if (r - b > 24 && r > 70) continue
  const a = at(x, B.y0 - 1), z = at(x, Math.min(info.height - 1, B.y1 + 1)), t = (y - B.y0 + 1) / (B.y1 - B.y0 + 2)
  for (let c = 0; c < 3; c++) data[i + c] = Math.round(src[a + c] * (1 - t) + src[z + c] * t)
}
await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(out)
