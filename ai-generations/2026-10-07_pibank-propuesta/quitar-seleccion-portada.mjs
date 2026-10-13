// Quita la selección (recuadro, manijas, cursor y etiqueta) que la receta de portada pinta sobre el logo del cliente.
// El fondo es un degradado suave: cada columna del rectángulo se rellena interpolando entre la fila de arriba y la de
// abajo, y el logo del cliente se devuelve tal cual desde el original (sólo dentro de su caja).
// Uso: node quitar-seleccion-portada.mjs <entrada.png> <salida.png>
import sharp from 'sharp'

const [inp, out] = process.argv.slice(2)
const { data, info } = await sharp(inp).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = info.width, at = (x, y) => (y * W + x) * 4
const orig = Buffer.from(data)
const lum = i => 0.2126 * orig[i] + 0.7152 * orig[i + 1] + 0.0722 * orig[i + 2]
// La selección vive en la mitad derecha: buscamos su caja por el violeta de la etiqueta y los trazos claros.
let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
for (let y = 150; y < 900; y++) for (let x = 1050; x < 1950; x++) {
  const i = at(x, y), r = orig[i], g = orig[i + 1], b = orig[i + 2]
  const violet = b > 180 && r > 60 && r < 140 && g < 110
  if (violet) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
}
// Caja del logo: se ancla en el punto amarillo de Pibank (el texto «pibank» va a su izquierda, ~3 diámetros).
let yx0 = 1e9, yy0 = 1e9, yx1 = -1, yy1 = -1
for (let y = 300; y < 800; y++) for (let x = 1100; x < 1800; x++) {
  const i = at(x, y), r = orig[i], g = orig[i + 1], b = orig[i + 2]
  if (r > 200 && g > 170 && b < 90) { yx0 = Math.min(yx0, x); yy0 = Math.min(yy0, y); yx1 = Math.max(yx1, x); yy1 = Math.max(yy1, y) }
}
const yd = yx1 - yx0
const lx0 = Math.round(yx0 - 3.05 * yd), ly0 = Math.round(yy0 - 0.15 * yd), lx1 = yx1 + 2, ly1 = Math.round(yy1 + 0.15 * yd)
// El recuadro rodea al logo con su aire: tomamos la unión del logo y de la etiqueta, con margen.
const R = { x0: Math.min(lx0 - 90, x0) - 16, y0: Math.min(ly0 - 110, y0) - 16, x1: Math.max(lx1 + 90, x1) + 16, y1: ly1 + 110 }
const L = { x0: lx0 - 4, y0: ly0 - 4, x1: lx1 + 4, y1: ly1 + 4 }
// Relleno: interpolación vertical por columna y luego un suavizado horizontal (±8 px) para que no queden vetas.
const fillAt = (x, y) => { const a = at(x, R.y0 - 1), b = at(x, R.y1 + 1), t = (y - R.y0 + 1) / (R.y1 - R.y0 + 2); return [0, 1, 2].map(c => orig[a + c] * (1 - t) + orig[b + c] * t) }
for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) {
  const i = at(x, y)
  let acc = [0, 0, 0], n = 0
  for (let k = -8; k <= 8; k++) { const xx = Math.min(R.x1, Math.max(R.x0, x + k)); const f = fillAt(xx, y); acc = acc.map((v, c) => v + f[c]); n++ }
  const fill = acc.map(v => Math.round(v / n))
  const r = orig[i], g = orig[i + 1], bl = orig[i + 2]
  const logoPx = x >= L.x0 && x <= L.x1 && y >= L.y0 && y <= L.y1 && (lum(i) > 70 || (r > 150 && g > 120 && bl < 120))
  for (let c = 0; c < 3; c++) data[i + c] = logoPx ? orig[i + c] : fill[c]
}
await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(out)
console.log(JSON.stringify({ seleccion: [x0, y0, x1, y1], logo: [lx0, ly0, lx1, ly1], relleno: R }))
