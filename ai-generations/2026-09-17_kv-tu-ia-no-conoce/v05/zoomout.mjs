// Aleja la cámara de un plate 9:16 nativo sin recortar al sujeto: plate reducido (S, por defecto 90 %) dentro del mismo lienzo
// 1152×2048 y outpaint del marco (muro navy arriba, ventanas a los lados, escritorio abajo). La franja repintada queda
// dentro del núcleo sólo en sus bordes, donde hay muro, ventanas, escritorio o puntas de dedos; nunca rostro, pelo ni Clawd.
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const CW = 1152
const CH = 2048
const S = Number(process.env.S ?? 0.9)
const PW = Math.round(CW * S / 2) * 2
const PH = Math.round(CH * S)
const X = (CW - PW) / 2
const Y = Number(process.env.Y ?? 200)
const BAND = Number(process.env.BAND ?? 40)
const FADE = 28
const SRC = path.join(DIR, process.env.SRC ?? '../plates/plate-kv-9x16-v05b-1.png')
const TAG = process.env.TAG ?? ''
const mode = process.argv[2]

if (mode === 'prep') {
  const plate = await sharp(SRC).resize(PW, PH, { kernel: 'lanczos3' }).ensureAlpha().png().toBuffer()
  await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: plate, left: X, top: Y }]).png().toFile(path.join(DIR, `canvas${TAG}.png`))
  const keep = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}"><rect x="${X + BAND}" y="${Y + BAND}" width="${PW - BAND * 2}" height="${PH - BAND * 2}" fill="#fff"/></svg>`
  await sharp(Buffer.from(keep)).png().toFile(path.join(DIR, `mask${TAG}.png`))
  console.log({ X, Y, PW, PH })
} else {
  const ext = await sharp(path.join(DIR, `extended-raw${TAG}.png`)).resize(CW, CH).removeAlpha().png().toBuffer()
  const plate = await sharp(SRC).resize(PW, PH, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer()
  const rgba = Buffer.alloc(PW * PH * 4)

  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const d = Math.min(x, y, PW - 1 - x, PH - 1 - y) - (BAND - FADE)
    const a = Math.max(0, Math.min(1, d / FADE))
    const i = y * PW + x
    rgba[i * 4] = plate[i * 3]; rgba[i * 4 + 1] = plate[i * 3 + 1]; rgba[i * 4 + 2] = plate[i * 3 + 2]; rgba[i * 4 + 3] = Math.round(a * 255)
  }
  const core = await sharp(rgba, { raw: { width: PW, height: PH, channels: 4 } }).png().toBuffer()
  await sharp(ext).composite([{ input: core, left: X, top: Y }]).png().toFile(path.join(DIR, `plate-9x16-v05${TAG}.png`))
  console.log('merged')
}
