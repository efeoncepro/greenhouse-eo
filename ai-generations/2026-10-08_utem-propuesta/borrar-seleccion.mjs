// Borra de una lámina compuesta la selección colaborativa que la receta pinta por defecto: el recuadro punteado,
// sus ocho manijas, el cursor y la etiqueta. Cada trazo se reemplaza interpolando a través de él (perpendicular al
// trazo) entre los píxeles de ambos lados, así el fondo o la tarjeta que hay debajo se recompone sin parches.
// Uso: node borrar-seleccion.mjs <entrada> <salida> <x0,y0,x1,y1 aproximado del recuadro>
import sharp from 'sharp'

const [inp, out, boxArg] = process.argv.slice(2)
const [bx0, by0, bx1, by1] = boxArg.split(',').map(Number)
const { data, info } = await sharp(inp).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, at = (x, y) => (y * W + x) * 4
const src = Buffer.from(data)
const lum = i => 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2]
// Afinar cada lado: la fila/columna con más píxeles claros (el punteado) cerca de la aproximación.
const bestRow = (y, xa, xb) => { let best = y, bv = -1; for (let yy = y - 8; yy <= y + 8; yy++) { let n = 0; for (let x = xa; x <= xb; x++) if (lum(at(x, yy)) > 170) n++; if (n > bv) { bv = n; best = yy } } return best }
const bestCol = (x, ya, yb) => { let best = x, bv = -1; for (let xx = x - 8; xx <= x + 8; xx++) { let n = 0; for (let y = ya; y <= yb; y++) if (lum(at(xx, y)) > 170) n++; if (n > bv) { bv = n; best = xx } } return best }
const top = bestRow(by0, bx0 + 30, bx1 - 30), bot = bestRow(by1, bx0 + 30, bx1 - 30)
const lef = bestCol(bx0, by0 + 30, by1 - 30), rig = bestCol(bx1, by0 + 30, by1 - 30)
const vfill = (xa, xb, ya, yb) => { for (let x = Math.max(0, xa); x <= Math.min(W - 1, xb); x++) { const a = at(x, ya - 1), b = at(x, yb + 1); for (let y = ya; y <= yb; y++) { const t = (y - ya + 1) / (yb - ya + 2), i = at(x, y); for (let c = 0; c < 3; c++) data[i + c] = Math.round(src[a + c] * (1 - t) + src[b + c] * t) } } }
const hfill = (xa, xb, ya, yb) => { for (let y = Math.max(0, ya); y <= Math.min(H - 1, yb); y++) { const a = at(xa - 1, y), b = at(xb + 1, y); for (let x = xa; x <= xb; x++) { const t = (x - xa + 1) / (xb - xa + 2), i = at(x, y); for (let c = 0; c < 3; c++) data[i + c] = Math.round(src[a + c] * (1 - t) + src[b + c] * t) } } }
const B = 4, Hd = 12
vfill(lef - Hd, rig + Hd, top - B, top + B); vfill(lef - Hd, rig + Hd, bot - B, bot + B)
hfill(lef - B, lef + B, top - Hd, bot + 22); hfill(rig - B, rig + B, top - Hd, bot + 22)
// Manijas: cuadrados en esquinas y puntos medios.
for (const [hx, hy] of [[lef, top], [rig, top], [lef, bot], [rig, bot], [(lef + rig) >> 1, top], [(lef + rig) >> 1, bot], [lef, (top + bot) >> 1], [rig, (top + bot) >> 1]]) vfill(hx - Hd, hx + Hd, hy - Hd, hy + Hd)
// Cursor y etiqueta: el violeta (con su sombra) cerca del recuadro.
let vx0 = 1e9, vy0 = 1e9, vx1 = -1, vy1 = -1
for (let y = Math.max(0, top - 220); y < Math.min(H, bot + 220); y++) for (let x = Math.max(0, lef - 260); x < Math.min(W, rig + 300); x++) {
  const i = at(x, y), r = src[i], g = src[i + 1], b = src[i + 2]
  if (b > 180 && r > 60 && r < 140 && g < 110) { vx0 = Math.min(vx0, x); vy0 = Math.min(vy0, y); vx1 = Math.max(vx1, x); vy1 = Math.max(vy1, y) }
}
if (vx1 > 0) vfill(vx0 - 10, vx1 + 10, vy0 - 10, vy1 + 10)
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out)
console.log(JSON.stringify({ recuadro: [lef, top, rig, bot], violeta: [vx0, vy0, vx1, vy1] }))
