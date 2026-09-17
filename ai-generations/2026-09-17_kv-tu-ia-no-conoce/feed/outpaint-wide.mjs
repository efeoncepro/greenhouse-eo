// 9:16 → 4:5 abriendo el encuadre a los lados: el plate 9:16 (1152×2048) va al centro de un lienzo 1632×2048 y se
// extiende izquierda/derecha. Misma técnica sin costuras: franja repintada dentro del núcleo + núcleo fundido dentro
// de ella. Así ambos formatos comparten escena y la cámara queda más lejos, con aire para titular y logo.
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const CW = 1632
const CH = 2048
const PW = 1152
const LEFT = (CW - PW) / 2 // 240
const BAND = 40
const FADE = 28
const PLATE = path.join(DIR, '../story/plate-9x16.png')
const mode = process.argv[2]

if (mode === 'prep') {
  const plate = await sharp(PLATE).ensureAlpha().png().toBuffer()
  await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: plate, left: LEFT, top: 0 }]).png().toFile(path.join(DIR, 'canvas.png'))
  const keep = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}"><rect x="${LEFT + BAND}" y="0" width="${PW - BAND * 2}" height="${CH}" fill="#fff"/></svg>`
  await sharp(Buffer.from(keep)).png().toFile(path.join(DIR, 'mask.png'))
  console.log('canvas + mask', { LEFT, keepFrom: LEFT + BAND, keepTo: LEFT + PW - BAND })
} else if (mode === 'merge') {
  const ext = await sharp(path.join(DIR, 'extended-raw.png')).resize(CW, CH).removeAlpha().png().toBuffer()
  const plate = await sharp(PLATE).removeAlpha().raw().toBuffer()
  const rgba = Buffer.alloc(PW * CH * 4)

  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < PW; x++) {
      const a = Math.max(0, Math.min(1, Math.min(x - (BAND - FADE), PW - (BAND - FADE) - 1 - x) / FADE))
      const i = y * PW + x
      rgba[i * 4] = plate[i * 3]; rgba[i * 4 + 1] = plate[i * 3 + 1]; rgba[i * 4 + 2] = plate[i * 3 + 2]; rgba[i * 4 + 3] = Math.round(a * 255)
    }
  }

  const core = await sharp(rgba, { raw: { width: PW, height: CH, channels: 4 } }).png().toBuffer()
  await sharp(ext).composite([{ input: core, left: LEFT, top: 0 }]).png().toFile(path.join(DIR, 'plate-4x5-wide.png'))

  const { data } = await sharp(path.join(DIR, 'plate-4x5-wide.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const colL = x => { let s = 0; for (let y = 0; y < CH; y++) { const i = (y * CW + x) * 3; s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] } return s / CH }
  const jumps = {}

  for (const [name, a, b] of [['left', LEFT - 60, LEFT + BAND + 20], ['right', LEFT + PW - BAND - 20, LEFT + PW + 60]]) {
    let max = 0
    for (let x = a; x < b; x++) max = Math.max(max, Math.abs(colL(x + 1) - colL(x)))
    jumps[name] = Number(max.toFixed(2))
  }
  console.log('max column luminance jump', jumps)
}
