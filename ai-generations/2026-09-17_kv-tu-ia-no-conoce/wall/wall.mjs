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

  // Clawd no se confía al matte: sus cubos sueltos («?») y brazos finos caen bajo el umbral y el repintado los deforma.
  // Dentro de su rectángulo se toma la figura original por color (naranja, incluidas caras en sombra), sin dilatar (dilatar
  // arrastra halo gris del muro viejo) y suavizada 0,7 px, para que el «?» y los brazos queden idénticos al plate aprobado.
  const CLAWD = { x0: 230, x1: 490, y0: 660, y1: 960 }
  const cw = CLAWD.x1 - CLAWD.x0
  const ch = CLAWD.y1 - CLAWD.y0
  const hard = Buffer.alloc(cw * ch)

  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = ((y + CLAWD.y0) * W + (x + CLAWD.x0)) * 3
    const r = orig[i], g = orig[i + 1], b = orig[i + 2]
    hard[y * cw + x] = r > 60 && r > g * 1.18 && r > b * 1.45 ? 255 : 0
  }
  const clawdMask = await sharp(hard, { raw: { width: cw, height: ch, channels: 1 } }).blur(0.7).toColourspace('b-w').raw().toBuffer()
  // Navy de muro por fila (píxeles del repintado que no son naranja ni pelo ni hoodie) para tapar restos del Clawd repintado.
  const rowNavy = []
  for (let y = 0; y < ch; y++) {
    let r = 0, g = 0, b = 0, n = 0
    for (let x = 0; x < 200; x++) {
      const i = ((y + CLAWD.y0) * W + (x + CLAWD.x0)) * 3
      const er = edit[i], eg = edit[i + 1], eb = edit[i + 2]
      if (er < 60 && eb < 110 && !(er > eg * 1.1 && er > eb * 1.2)) { r += er; g += eg; b += eb; n++ }
    }
    rowNavy.push(n ? [r / n, g / n, b / n] : rowNavy[y - 1] ?? [15, 39, 68])
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    // Dentro del muro: sujeto original con matte suavizado y endurecido (0,7→1); bordes del rectángulo con fundido lineal.
    const inWall = Math.min(x - WALL.x0, WALL.x1 - 1 - x, WALL.y1 - 1 - y)
    const wallW = Math.max(0, Math.min(1, inWall / FEATHER))
    let subj = Math.max(0, Math.min(1, (a[i] / 255 - 0.7) / 0.3))
    let bg = [edit[i * 3], edit[i * 3 + 1], edit[i * 3 + 2]]
    if (x >= CLAWD.x0 && x < CLAWD.x1 && y >= CLAWD.y0 && y < CLAWD.y1) {
      const inHair = x >= 440 // a la derecha del rectángulo manda el matte del pelo
      const cm = clawdMask[(y - CLAWD.y0) * cw + (x - CLAWD.x0)] / 255
      subj = inHair ? Math.max(subj, cm) : cm
      const er = edit[i * 3], eg = edit[i * 3 + 1], eb = edit[i * 3 + 2]
      if (!inHair && er > 50 && er > eg * 1.1 && er > eb * 1.2) bg = rowNavy[y - CLAWD.y0]
    }
    const takeEdit = wallW * (1 - subj)
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(orig[i * 3 + c] * (1 - takeEdit) + bg[c] * takeEdit)
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(DIR, 'plate-9x16-navy.png'))
  console.log('merge ok')
}
