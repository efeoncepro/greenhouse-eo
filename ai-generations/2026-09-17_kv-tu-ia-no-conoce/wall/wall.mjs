// Repinta el muro de ladrillo como muro liso azul marino (escenografía, no degradado encima), para que titular blanco
// y controles de selección AXIS (pensados para fondo oscuro) funcionen sin scrim. `prep`: máscara editable = rectángulo
// del muro entre ventanas y hasta el escritorio, menos el sujeto (matte rmbg, núcleo con alpha ≥ 0,9 erosionado).
// `merge`: sujeto original sobre el muro nuevo con matte suavizado; bordes de pelo vienen del repintado.
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const W = 1152
const H = 2048
const WALL = { x0: 150, x1: 1000, y0: 0, y1: 1478 }
const SRC = path.join(DIR, '../story/plate-9x16.png')
const mode = process.argv[2]

const matte = async () => {
  const { data } = await sharp(path.join(DIR, 'subject-alpha.png')).extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  return data
}

if (mode === 'prep') {
  const a = await matte()
  // Núcleo protegido: alpha ≥ 230, erosionado 3 px (mínimo en vecindad) para que el borde del pelo se repinte.
  const core = Buffer.alloc(W * H)
  const R = 3

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let ok = 1
      for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R; dx++) {
        const yy = Math.min(H - 1, Math.max(0, y + dy)), xx = Math.min(W - 1, Math.max(0, x + dx))
        if (a[yy * W + xx] < 230) { ok = 0; break }
      }
      core[y * W + x] = ok
    }
  }

  const rgba = Buffer.alloc(W * H * 4)

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    const editable = x >= WALL.x0 && x < WALL.x1 && y >= WALL.y0 && y < WALL.y1 && !core[i]
    rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = editable ? 0 : 255
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(DIR, 'mask.png'))
  await sharp(SRC).resize(W, H).ensureAlpha().png().toFile(path.join(DIR, 'input.png'))
  console.log('mask ok')
} else if (mode === 'merge') {
  // Matte suavizado (σ 2) para que la unión pelo–muro no deje filo entre los dos contornos de pelo.
  const a = await sharp(await sharp(path.join(DIR, 'subject-alpha.png')).extractChannel(3).png().toBuffer()).blur(2).raw().toBuffer()
  const orig = await sharp(SRC).resize(W, H).removeAlpha().raw().toBuffer()
  const edit = await sharp(path.join(DIR, 'edited-raw.png')).resize(W, H).removeAlpha().raw().toBuffer()
  const out = Buffer.alloc(W * H * 3)
  const FEATHER = 6

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    // Dentro del muro: sujeto original con matte suavizado y endurecido (0,7→1); bordes del rectángulo con fundido lineal.
    const inWall = Math.min(x - WALL.x0, WALL.x1 - 1 - x, WALL.y1 - 1 - y)
    const wallW = Math.max(0, Math.min(1, inWall / FEATHER))
    const subj = Math.max(0, Math.min(1, (a[i] / 255 - 0.7) / 0.3))
    const takeEdit = wallW * (1 - subj)
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(orig[i * 3 + c] * (1 - takeEdit) + edit[i * 3 + c] * takeEdit)
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(DIR, 'plate-9x16-navy.png'))
  console.log('merge ok')
}
