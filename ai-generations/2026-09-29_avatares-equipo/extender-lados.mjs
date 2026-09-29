// Extiende hacia los lados un retrato ya extendido hacia abajo (1024×1536): el modelo pinta hombros, brazos y fondo a
// los costados; el centro original se pega encima a resolución completa (la cara nunca pasa por el modelo).
// node extender-lados.mjs <persona>...   (lee extendido/<p>-ext-ok.png; deja ancho/<p>-ancho.png de 2304×1536)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const DIR = new URL('./', import.meta.url).pathname
const RAIZ = '/Users/jreye/Documents/greenhouse-eo'

mkdirSync(DIR + 'ancho', { recursive: true })
writeFileSync(DIR + 'ancho/prompt-lados.txt', `This is a portrait photo that was extended to the LEFT and RIGHT. The CENTRE band (the middle 683 pixels) is the real photo. The two SIDE bands are only mirrored PADDING, not real content.

Replace the padding with the natural continuation of the same person: the shoulders, sleeves and arms of the same open navy bomber jacket continuing out of the frame, and the same studio background continuing as it is at the sides of the real photo, with the same light. The person stays centred and the same size.

The jacket keeps a SINGLE embroidered mark, the one already in the centre band: do NOT add a second mark or any logo, text or badge on the sides. Keep the centre band exactly as it is.
`)

for (const p of process.argv.slice(2)) {
  const fuente = DIR + `extendido/${p}-ext-ok.png`
  const pad = DIR + `ancho/${p}-pad.png`
  const v1 = DIR + `ancho/${p}-ancho-v1.png`

  if (!existsSync(v1)) {
    const centro = await sharp(fuente).resize(683, 1024).png().toBuffer()
    const izq = await sharp(centro).extract({ left: 0, top: 0, width: 426, height: 1024 }).flop().png().toBuffer()
    const der = await sharp(centro).extract({ left: 683 - 427, top: 0, width: 427, height: 1024 }).flop().png().toBuffer()

    await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#000' } })
      .composite([{ input: izq, left: 0, top: 0 }, { input: centro, left: 426, top: 0 }, { input: der, left: 1109, top: 0 }])
      .png()
      .toFile(pad)
    execFileSync('pnpm', ['-s', 'ai:image', '--model', 'gpt-image-2.5-sunburst', '--quality', 'high', '--size', '1536x1024', '--image', pad,
      '--prompt-file', DIR + 'ancho/prompt-lados.txt', '--out', v1], { cwd: RAIZ, stdio: 'inherit' })
  }

  // el ancho del modelo a 1,5× (2304×1536) y el original 1024×1536 al centro, con fundido de 90 px a cada lado
  const ancho = await sharp(v1).resize(2304, 1536).removeAlpha().png().toBuffer()
  const F = 90, m = Buffer.alloc(1024 * 1536)

  for (let y = 0; y < 1536; y++)
    for (let x = 0; x < 1024; x++) {
      const d = Math.min(x, 1023 - x)

      m[y * 1024 + x] = d >= F ? 255 : Math.round((255 * d) / F)
    }

  const encima = await sharp(fuente).removeAlpha().joinChannel(m, { raw: { width: 1024, height: 1536, channels: 1 } }).png().toBuffer()

  const junto = await sharp(ancho).composite([{ input: encima, left: 640, top: 0 }]).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { data, info } = junto
  const W = info.width, H = info.height, D = 160

  // costuras verticales: el lado del modelo se lleva al tono del original, fila por fila (suavizado ±12 filas)
  for (const [xs, dir] of [[640, -1], [1663, 1]]) {
    const off = []

    for (let y = 0; y < H; y++) {
      const media = (x0, x1, c) => { let t = 0; for (let x = x0; x < x1; x++) t += data[(y * W + x) * 3 + c]; return t / (x1 - x0) }
      const dentro = dir < 0 ? [xs + 4, xs + 14] : [xs - 14, xs - 4]
      const fuera = dir < 0 ? [xs - 14, xs - 4] : [xs + 4, xs + 14]

      off[y] = [0, 1, 2].map(c => media(...dentro, c) - media(...fuera, c))
    }

    for (let y = 0; y < H; y++) {
      const o = [0, 1, 2].map(c => { let t = 0, n = 0; for (let k = -12; k <= 12; k++) { const yy = y + k; if (yy >= 0 && yy < H) { t += off[yy][c]; n++ } } return t / n })

      for (let k = -8; k < D; k++) {
        const x = xs + dir * k
        const f = k < 0 ? 0.5 : 1 - k / D

        if (x < 0 || x >= W) continue
        for (let c = 0; c < 3; c++) { const i = (y * W + x) * 3 + c; data[i] = Math.max(0, Math.min(255, Math.round(data[i] + o[c] * f))) }
      }
    }
  }

  writeFileSync(DIR + `ancho/${p}-ancho.png`, await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer())
  console.log(p, 'ok')
}
