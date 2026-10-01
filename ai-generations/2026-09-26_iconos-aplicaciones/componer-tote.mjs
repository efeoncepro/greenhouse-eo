// Estampa exacta sobre la tote (canon: lo sensible se compone; el modelo sólo pone material y luz).
// La cámara sale de @efeoncepro/axis-graphic-line/icons; la tinta toma la luz y la trama de la tela del plate.
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const { iconSvg } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
const [cx, cy, size, rot] = [690, 505, 380, -3]
const plate = sharp('out-v2/tote-lisa.png')
const { width: W, height: H } = await plate.metadata()
const base = await plate.removeAlpha().raw().toBuffer()
const blur = await sharp('out-v2/tote-lisa.png').removeAlpha().blur(18).raw().toBuffer()
const art = await sharp(Buffer.from(iconSvg({ glyph: 'camara', state: 'response', size, line: 'brand' }))).rotate(rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: aw, height: ah } = art.info
const ox = Math.round(cx - aw / 2), oy = Math.round(cy - ah / 2)
// Luz de referencia: luminancia media de la tela bajo la estampa.
let sum = 0, n = 0
for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) { const i = ((oy + y) * W + ox + x) * 3; sum += 0.2126 * blur[i] + 0.7152 * blur[i + 1] + 0.0722 * blur[i + 2]; n++ }
const mean = sum / n
const out = Buffer.from(base)
for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
  const a = art.data[(y * aw + x) * 4 + 3] / 255
  if (!a) continue
  const i = ((oy + y) * W + ox + x) * 3
  const lum = 0.2126 * blur[i] + 0.7152 * blur[i + 1] + 0.0722 * blur[i + 2]
  const shade = Math.min(1.12, Math.max(0.7, Math.pow(lum / mean, 0.85)))
  // trama: detalle fino de la tela (base − blur) que atraviesa la tinta de serigrafía
  const detail = ((base[i] + base[i + 1] + base[i + 2]) - (blur[i] + blur[i + 1] + blur[i + 2])) / 3
  for (let c = 0; c < 3; c++) {
    const ink = art.data[(y * aw + x) * 4 + c] * shade * 0.94 + detail * 0.9
    out[i + c] = Math.round(Math.max(0, Math.min(255, base[i + c] * (1 - a) + ink * a)))
  }
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile('out-v2/tote-compuesta.png')
console.log('ok', mean.toFixed(1))
