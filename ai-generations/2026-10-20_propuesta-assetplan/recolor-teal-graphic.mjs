// Pasa a rosado de Revenue los trazos teal de una lámina compuesta (arco del piso y conectores que la receta fija en
// teal), salvo dentro de los rectángulos protegidos (fotos). Gráfico plano: la rotación de tono basta.
import sharp from 'sharp'
const [src, out, ...rects] = process.argv.slice(2)
const keep = rects.map(r => r.split(',').map(Number))
const SHIFT = 312 - 176
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const w = h => (h < 150 || h > 200 ? 0 : h < 158 ? (h - 150) / 8 : h > 192 ? (200 - h) / 8 : 1)
for (let p = 0, i = 0; p < info.width * info.height; p++, i += 3) {
  const x = p % info.width, y = (p / info.width) | 0
  if (keep.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) continue
  const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d < 0.2) continue
  const l = (mx + mn) / 2, s = d / (1 - Math.abs(2 * l - 1))
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  const k = w(h); if (!k) continue
  const nh = (h + SHIFT * k) % 360, c = (1 - Math.abs(2 * l - 1)) * s, xx = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = l - c / 2
  const [rr, gg, bb] = nh < 60 ? [c, xx, 0] : nh < 120 ? [xx, c, 0] : nh < 180 ? [0, c, xx] : nh < 240 ? [0, xx, c] : nh < 300 ? [xx, 0, c] : [c, 0, xx]
  data[i] = Math.round((rr + m) * 255); data[i + 1] = Math.round((gg + m) * 255); data[i + 2] = Math.round((bb + m) * 255)
}
await sharp(data, { raw: info }).png().toFile(out)
console.log('ok', out)
