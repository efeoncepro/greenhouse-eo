// Versión Revenue (HubSpot) de la contraportada BR3: rota el tono teal de la luz (anillo, niebla y reflejos)
// al rosado de Revenue, sin IA y sin tocar forma, encuadre ni la chaqueta navy (tono ≈220°, fuera del rango).
import sharp from 'sharp'
const [src, out] = process.argv.slice(2)
const TARGET = 312 // tono del acento revenue-hubspot (#e86bd0 ≈ 312°)
const SHIFT = TARGET - 182 // 182° = centro del teal medido en el plate
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const weight = h => (h < 155 || h > 212 ? 0 : h < 162 ? (h - 155) / 7 : h > 204 ? (212 - h) / 8 : 1)
for (let i = 0; i < data.length; i += 3) {
  const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d < 0.02) continue
  const l = (mx + mn) / 2, s = d / (1 - Math.abs(2 * l - 1))
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  const w = weight(h)
  if (!w) continue
  const nh = (h + SHIFT * w) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = l - c / 2
  const [rr, gg, bb] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x]
  data[i] = Math.round((rr + m) * 255); data[i + 1] = Math.round((gg + m) * 255); data[i + 2] = Math.round((bb + m) * 255)
}
await sharp(data, { raw: info }).png().toFile(out)
console.log('ok', out)
