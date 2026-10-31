// Contraportada Revenue v2: la luz la re-ilumina el modelo (inpaint Sunburst, candidato crudo) y Nexa vuelve
// pixel a pixel desde el plate aprobado BR3 por la máscara. El borde teal que queda en su silueta (rim de la luz
// vieja, dentro de la zona protegida) se pasa al rosado con la misma rotación de tono de recolor-revenue.mjs.
import sharp from 'sharp'
const [origPath, rawPath, maskPath, out] = process.argv.slice(2)
const orig = await sharp(origPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = orig.info
const raw = await sharp(rawPath).removeAlpha().resize(width, height, { fit: 'fill' }).raw().toBuffer()
const mask = await sharp(maskPath).greyscale().resize(width, height, { fit: 'fill' }).raw().toBuffer()
const o = orig.data, res = Buffer.alloc(o.length)
const SHIFT = 312 - 182
const weight = h => (h < 155 || h > 212 ? 0 : h < 162 ? (h - 155) / 7 : h > 204 ? (212 - h) / 8 : 1)
const rot = (R, G, B) => {
  const r = R / 255, g = G / 255, b = B / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d < 0.02) return [R, G, B]
  const l = (mx + mn) / 2, s = d / (1 - Math.abs(2 * l - 1))
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  const w = weight(h); if (!w) return [R, G, B]
  const nh = (h + SHIFT * w) % 360, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = l - c / 2
  const [rr, gg, bb] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x]
  return [Math.round((rr + m) * 255), Math.round((gg + m) * 255), Math.round((bb + m) * 255)]
}
for (let p = 0, i = 0; p < width * height; p++, i += 3) {
  const a = mask[p] / 255
  const [pr, pg, pb] = rot(o[i], o[i + 1], o[i + 2])
  res[i] = Math.round(raw[i] * a + pr * (1 - a)); res[i + 1] = Math.round(raw[i + 1] * a + pg * (1 - a)); res[i + 2] = Math.round(raw[i + 2] * a + pb * (1 - a))
}
await sharp(res, { raw: { width, height, channels: 3 } }).png().toFile(out)
console.log('ok', out)
