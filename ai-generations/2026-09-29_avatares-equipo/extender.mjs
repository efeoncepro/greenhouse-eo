// Extiende hacia abajo un retrato de 1024² (el modelo continúa el torso) y pega encima la foto original intacta:
// la cara nunca pasa por el modelo. Mide la alineación del modelo y la compensa; iguala el tono de la costura.
// node extender.mjs <persona> [<persona>...]   (lee bomber/<p>-bomber-v1.png; deja extendido/<p>-ext-ok.png)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const DIR = new URL('./', import.meta.url).pathname
const RAIZ = '/Users/jreye/Documents/greenhouse-eo'

const alinear = async (orig, ext) => {
  const a = await sharp(orig).removeAlpha().extract({ left: 0, top: 760, width: 1024, height: 240 }).greyscale().raw().toBuffer()
  const e = await sharp(ext).removeAlpha().greyscale().raw().toBuffer()
  let mejor = [Infinity, 0, 0, 1]

  for (const sc of [0.96, 0.98, 1, 1.02, 1.04])
    for (let dy = -40; dy <= 20; dy += 2)
      for (let dx = -20; dx <= 20; dx += 2) {
        let s = 0, n = 0

        for (let y = 0; y < 240; y += 4)
          for (let x = 60; x < 964; x += 4) {
            const yy = Math.round((760 + y) * sc) + dy, xx = Math.round((x - 512) * sc + 512) + dx

            if (yy < 0 || yy >= 1536) continue
            s += Math.abs(a[y * 1024 + x] - e[yy * 1024 + xx]); n++
          }

        if (s / n < mejor[0]) mejor = [s / n, dx, dy, sc]
      }

  return mejor
}

// argumento «persona» o «persona@vN» para partir de otra versión de la edición (por defecto v1)
for (const arg of process.argv.slice(2)) {
  const [p, version = 'v1'] = arg.split('@')
  const orig = DIR + `bomber/${p}-bomber-${version}.png`
  const pad = DIR + `extendido/${p}-pad.png`
  const extV1 = DIR + `extendido/${p}-ext-v1.png`

  if (!existsSync(extV1)) {
    const reflejo = await sharp(orig).extract({ left: 0, top: 512, width: 1024, height: 512 }).flip().png().toBuffer()

    await sharp({ create: { width: 1024, height: 1536, channels: 3, background: '#000' } })
      .composite([{ input: readFileSync(orig), left: 0, top: 0 }, { input: reflejo, left: 0, top: 1024 }])
      .png()
      .toFile(pad)
    execFileSync('pnpm', ['-s', 'ai:image', '--model', 'gpt-image-2.5-sunburst', '--quality', 'high', '--size', '1024x1536', '--image', pad,
      '--prompt-file', DIR + 'extendido/prompt-extender.txt', '--out', extV1], { cwd: RAIZ, stdio: 'inherit' })
  }

  let ext = await sharp(extV1).resize(1024, 1536).png().toBuffer()
  const [dif, dx, dy, sc] = await alinear(orig, ext)

  console.log(p, 'alineación', { dif: +dif.toFixed(1), dx, dy, sc })

  if (sc !== 1 || dx !== 0 || dy !== 0) {
    const k = 1 / sc, w = Math.round(1024 * k), h = Math.round(1536 * k)
    const left = Math.max(0, Math.round(512 * k - 512 + dx * k)), top = Math.max(0, Math.round(dy * k))

    ext = await sharp(await sharp(ext).resize(w, h).png().toBuffer())
      .extract({ left: Math.min(left, w - 1024), top: Math.min(top, h - 1536), width: 1024, height: 1536 })
      .png()
      .toBuffer()
  }

  const F = 110, m = Buffer.alloc(1024 * 1024)

  for (let y = 0; y < 1024; y++) m.fill(y < 1024 - F ? 255 : Math.round((255 * (1024 - y)) / F), y * 1024, (y + 1) * 1024)
  const encima = await sharp(orig).removeAlpha().joinChannel(m, { raw: { width: 1024, height: 1024, channels: 1 } }).png().toBuffer()
  const juntado = await sharp(ext).composite([{ input: encima, left: 0, top: 0 }]).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { data, info } = juntado
  const W = info.width, H = info.height, S = 1024, A = 10, D = 220
  const media = (y0, y1, x, c) => { let s = 0; for (let y = y0; y < y1; y++) s += data[(y * W + x) * 3 + c]; return s / (y1 - y0) }
  const off = Array.from({ length: W }, (_, x) => [0, 1, 2].map(c => media(S - 4 - A, S - 4, x, c) - media(S + 2, S + 2 + A, x, c)))
  const sm = off.map((_, x) => [0, 1, 2].map(c => { let s = 0, n = 0; for (let k = -12; k <= 12; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += off[xx][c]; n++ } } return s / n }))

  for (let y = S; y < Math.min(H, S + D); y++) {
    const f = 1 - (y - S) / D

    for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) { const i = (y * W + x) * 3 + c; data[i] = Math.max(0, Math.min(255, Math.round(data[i] + sm[x][c] * f))) }
  }

  const a = 1019, b = 1029

  for (let y = a + 1; y < b; y++) {
    const f = (y - a) / (b - a)

    for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) { const i = (y * W + x) * 3 + c; data[i] = Math.round(data[(a * W + x) * 3 + c] * (1 - f) + data[(b * W + x) * 3 + c] * f) }
  }

  writeFileSync(DIR + `extendido/${p}-ext-ok.png`, await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer())
}
