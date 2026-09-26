// Prepara la referencia 1 SIN logo: el logo se compone en post (canon «texto sí, marca no»).
// Localiza la firma comparando la pieza compuesta con su plate escalado en la franja inferior
// y reemplaza sólo ese rectángulo (con margen) por los píxeles del plate. Imprime la diferencia
// media fuera del logo para detectar si la composición oscureció el lecho (costura visible).
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
const [comp, plate, out] = process.argv.slice(2)
const cm = await sharp(comp).metadata(); const W = cm.width, H = cm.height
const a = await sharp(comp).removeAlpha().raw().toBuffer()
const pBuf = await sharp(plate).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer()
const y0 = Math.round(H * Number(process.env.BAND_TOP ?? 0.86)), y1 = H, x0 = Math.round(W * 0.25), x1 = Math.round(W * 0.75)
let minx = W, miny = H, maxx = 0, maxy = 0, bg = 0, bgn = 0
for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 3; const d = Math.abs(a[i]-pBuf[i]) + Math.abs(a[i+1]-pBuf[i+1]) + Math.abs(a[i+2]-pBuf[i+2])
  const lum = (a[i] + a[i+1] + a[i+2]) / 3
  if (x >= x0 && x < x1 && d > 120 && lum > 90) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y) }
  else if (x < x0 || x >= x1) { bg += d; bgn++ }
}
if (maxx <= minx) { console.log(out, 'SIN LOGO DETECTADO'); process.exit(2) }
const pad = Math.round(W * 0.02)
const L = Math.max(0, minx - pad), T = Math.max(0, miny - pad), R = Math.min(W, maxx + pad), B = Math.min(H, maxy + pad)
const patch = await sharp(pBuf, { raw: { width: W, height: H, channels: 3 } }).extract({ left: L, top: T, width: R - L, height: B - T }).png().toBuffer()
await sharp(comp).removeAlpha().composite([{ input: patch, left: L, top: T }]).png().toFile(out)
console.log(out, `logo ${L},${T} ${R-L}x${B-T}`, 'dif. media lecho fuera del logo', (bg / bgn).toFixed(1))
