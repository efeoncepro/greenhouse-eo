// Quita la selección (recuadro, manijas, cursor y etiqueta) que cover-proposal pinta sobre el logo del cliente.
// Copia del script de UTEM (misma plantilla cover-proposal, caja fija del logo del cliente en 1920×1080).
// cada zona se rellena interpolando entre la fila de arriba y la de abajo, y el logo se devuelve tal cual.
// Uso: node quitar-seleccion-portada.mjs <entrada.png> <salida.png>
import sharp from 'sharp'

const [inp, out] = process.argv.slice(2)
const { data, info } = await sharp(inp).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = info.width, at = (x, y) => (y * W + x) * 4
const orig = Buffer.from(data)
const lum = i => 0.2126 * orig[i] + 0.7152 * orig[i + 1] + 0.0722 * orig[i + 2]
const L = { x0: 1160, y0: 450, x1: 1640, y1: 630 } // logo del cliente
// Primero la etiqueta y el cursor; después el recuadro, que toma su borde superior ya limpio.
// La etiqueta se rellena en horizontal (su borde inferior toca el recuadro); el recuadro, en vertical.
const zones = [{ x0: 1636, y0: 282, x1: 1900, y1: 440, h: true }, { x0: 1128, y0: 404, x1: 1676, y1: 676 }]
for (const R of zones) {
  const src = Buffer.from(data)
  const fillAt = R.h
    ? (x, y) => { const a = at(R.x0 - 1, y), b = at(Math.min(W - 1, R.x1 + 1), y), t = (x - R.x0 + 1) / (R.x1 - R.x0 + 2); return [0, 1, 2].map(c => src[a + c] * (1 - t) + src[b + c] * t) }
    : (x, y) => { const a = at(x, R.y0 - 1), b = at(x, R.y1 + 1), t = (y - R.y0 + 1) / (R.y1 - R.y0 + 2); return [0, 1, 2].map(c => src[a + c] * (1 - t) + src[b + c] * t) }
  for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) {
    const i = at(x, y)
    let acc = [0, 0, 0], n = 0
    for (let k = -8; k <= 8; k++) { const xx = Math.min(R.x1, Math.max(R.x0, x + k)); const f = fillAt(xx, y); acc = acc.map((v, c) => v + f[c]); n++ }
    const r = orig[i], g = orig[i + 1], b = orig[i + 2]
    const logoPx = x >= L.x0 && x <= L.x1 && y >= L.y0 && y <= L.y1 && (lum(i) > 70 || (g > 140 && r < 160 && b < 120))
    for (let c = 0; c < 3; c++) data[i + c] = logoPx ? orig[i + c] : Math.round(acc[c] / n)
  }
}
await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(out)
