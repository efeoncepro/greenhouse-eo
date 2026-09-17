// 4:5 → 9:16 sin costuras (técnica de la previa 18): plate aprobado al centro de un lienzo 1152×2048, outpaint con
// máscara que abre el exterior + una franja de transición DENTRO del núcleo, y re-pegado del núcleo fundido sólo
// dentro de esa franja. Modo: `prep` genera canvas y máscara; `merge` funde el núcleo sobre la extensión.
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const CW = 1152
const CH = 2048
const PW = 1152
const PH = 1440
const TOP = (CH - PH) / 2 // 304
const BAND = 56 // franja repintada dentro del núcleo, arriba y abajo
const FADE = 40 // fundido del núcleo dentro de la franja
const mode = process.argv[2]
const PLATE = path.join(DIR, '../plates/plate-kv-4x5-v03.png')

if (mode === 'prep') {
  const plate = await sharp(PLATE).resize(PW, PH, { kernel: 'lanczos3' }).ensureAlpha().png().toBuffer()
  await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: plate, left: 0, top: TOP }]).png().toFile(path.join(DIR, 'canvas.png'))
  const keep = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}"><rect x="0" y="${TOP + BAND}" width="${CW}" height="${PH - BAND * 2}" fill="#fff"/></svg>`
  await sharp(Buffer.from(keep)).png().toFile(path.join(DIR, 'mask.png'))
  console.log('canvas + mask', { TOP, keepFrom: TOP + BAND, keepTo: TOP + PH - BAND })
} else if (mode === 'merge') {
  const ext = await sharp(path.join(DIR, 'extended-raw.png')).resize(CW, CH).removeAlpha().png().toBuffer()
  const plate = await sharp(PLATE).resize(PW, PH, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer()
  const alpha = Buffer.alloc(PW * PH)

  for (let y = 0; y < PH; y++) {
    const dTop = y - (BAND - FADE)
    const dBot = PH - (BAND - FADE) - 1 - y
    const a = Math.max(0, Math.min(1, Math.min(dTop, dBot) / FADE))

    alpha.fill(Math.round(a * 255), y * PW, (y + 1) * PW)
  }

  const rgba = Buffer.alloc(PW * PH * 4)

  for (let i = 0; i < PW * PH; i++) { rgba[i * 4] = plate[i * 3]; rgba[i * 4 + 1] = plate[i * 3 + 1]; rgba[i * 4 + 2] = plate[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i] }
  const core = await sharp(rgba, { raw: { width: PW, height: PH, channels: 4 } }).png().toBuffer()
  await sharp(ext).composite([{ input: core, left: 0, top: TOP }]).png().toFile(path.join(DIR, 'plate-9x16.png'))

  // Perfil de luminancia por fila en las uniones: un salto brusco delata costura.
  const { data } = await sharp(path.join(DIR, 'plate-9x16.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const rowL = y => { let s = 0; for (let x = 0; x < CW; x++) { const i = (y * CW + x) * 3; s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] } return s / CW }
  const jumps = {}

  for (const [name, a, b] of [['top', TOP - 70, TOP + BAND + 20], ['bottom', TOP + PH - BAND - 20, TOP + PH + 70]]) {
    let max = 0
    for (let y = a; y < b; y++) max = Math.max(max, Math.abs(rowL(y + 1) - rowL(y)))
    jumps[name] = Number(max.toFixed(2))
  }
  console.log('max row luminance jump', jumps)
}
