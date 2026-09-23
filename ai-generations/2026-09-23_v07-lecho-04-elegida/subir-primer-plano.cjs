// Sube el primer plano completo (lecho + apoyabrazos) como UNA capa rígida: lo que haría una
// cámara un poco más baja. No deforma la forma del canto ni pinta nada; el corte sigue el borde
// del propio objeto, dentro de zonas oscuras, con 12 px de fundido.
// Uso: node subir-primer-plano.cjs <plate.png> <salida.png> [delta=60]
const sharp = require('sharp')
const [src, dst, deltaArg] = process.argv.slice(2)
const D = Number(deltaArg || 60)
;(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = 3
  const L = (x, y) => { let s = 0; for (let dx = -2; dx <= 2; dx++) { const xx = Math.min(W - 1, Math.max(0, x + dx)); const i = (y * W + xx) * C; s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] } return s / 5 }
  const Ls = (x, y) => (L(x, y - 1) + L(x, y) + L(x, y + 1)) / 3
  const borde = []
  for (let x = 0; x < W; x++) {
    let b
    if (x < 555) {
      // Lecho: mínimo del hueco oscuro y primera fila que sube sobre él (el canto).
      let m = 1330, lm = 1e9
      for (let y = 1330; y <= 1440; y++) { const v = Ls(x, y); if (v < lm) { lm = v; m = y } }
      b = m
      for (let y = m; y <= 1470; y++) if (Ls(x, y) > lm + 12) { b = y; break }
    } else {
      // Apoyabrazos: primera fila que sube sobre la manga oscura.
      const base = [...Array(40)].map((_, i) => Ls(x, 1290 + i)).sort((p, q) => p - q)[20]
      b = 1500
      for (let y = 1320; y <= 1500; y++) if (Ls(x, y) > base + 12) { b = y; break }
    }
    borde.push(b - 6)
  }
  // Envolvente superior (el corte nunca atraviesa el halo) y promedio móvil: una sola curva
  // suave, sin escalones entre columnas que arrastren tiras de la manga.
  const at = (arr, x) => arr[Math.min(W - 1, Math.max(0, x))]
  const env = borde.map((_, x) => { let m = 1e9; for (let k = -40; k <= 40; k++) m = Math.min(m, at(borde, x + k)); return m })
  const B = env.map((_, x) => { let s2 = 0; for (let k = -25; k <= 25; k++) s2 += at(env, x + k); return Math.round(s2 / 51) })
  const K = 200, Y1 = H - 1 - D - K
  const f = y => (y <= Y1 ? y + D : Y1 + D + (y - Y1) * (H - 1 - (Y1 + D)) / (H - 1 - Y1))
  const out = Buffer.from(data)
  for (let x = 0; x < W; x++) {
    const top = B[x] - D
    for (let y = Math.max(0, top); y < H; y++) {
      const yin = f(y), y0 = Math.floor(yin), y1 = Math.min(H - 1, y0 + 1), t = yin - y0
      const w = Math.min(1, (y - top) / 12)
      for (let c = 0; c < C; c++) {
        const v = data[(y0 * W + x) * C + c] * (1 - t) + data[(y1 * W + x) * C + c] * t
        const o = (y * W + x) * C + c
        out[o] = Math.round(data[o] * (1 - w) + v * w)
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: C } }).png().toFile(dst)
  console.log(JSON.stringify({ delta: D, corte: [0, 150, 300, 450, 540, 570, 630, 720, 840, 930].map(x => [x, B[x]]) }))
})()
