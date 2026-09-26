// Sube el primer plano (lecho + apoyabrazos) como UNA capa rígida (cámara un poco más baja).
// El corte va pegado al objeto: en el lecho, 6 px sobre su canto medido; en el apoyabrazos,
// 4 px sobre su halo, por una curva suave trazada sobre la medición de luminancia (sin
// escalones entre columnas). Así no se arrastra la manga ni la mesa. Fundido de 10 px.
// Uso: node subir-primer-plano-v4.cjs <plate.png> <salida.png> [delta=60]
const sharp = require('sharp')
const [src, dst, deltaArg] = process.argv.slice(2)
const D = Number(deltaArg || 60)
const ss = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
// Borde superior del halo del apoyabrazos (plate 941×1672), medido 2026-09-23.
const HALO = [[540, 1372], [570, 1370], [600, 1348], [630, 1336], [660, 1334], [690, 1330], [720, 1314], [750, 1332], [780, 1350], [810, 1398], [840, 1418], [870, 1434], [900, 1444], [941, 1466]]
const catmull = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1]
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1]
  let i = 0
  while (pts[i + 1][0] < x) i++
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
  const t = (x - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t
  return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
}
;(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = 3
  const L = (x, y) => { let s = 0; for (let dx = -2; dx <= 2; dx++) { const xx = Math.min(W - 1, Math.max(0, x + dx)); const i = (y * W + xx) * C; s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] } return s / 5 }
  const Ls = (x, y) => (L(x, y - 1) + L(x, y) + L(x, y + 1)) / 3
  const cantoRaw = []
  for (let x = 0; x <= 560; x++) {
    let m = 1330, lm = 1e9
    for (let y = 1330; y <= 1440; y++) { const v = Ls(x, y); if (v < lm) { lm = v; m = y } }
    let b = m
    for (let y = m; y <= 1470; y++) if (Ls(x, y) > lm + 12) { b = y; break }
    cantoRaw.push(b)
  }
  const at = (a, x) => a[Math.min(a.length - 1, Math.max(0, x))]
  const med = cantoRaw.map((_, x) => { const v = []; for (let k = -9; k <= 9; k++) v.push(at(cantoRaw, x + k)); return v.sort((p, q) => p - q)[9] })
  const canto = med.map((_, x) => { let s = 0; for (let k = -12; k <= 12; k++) s += at(med, x + k); return s / 25 })
  const B = []
  for (let x = 0; x < W; x++) {
    const bl = x <= 560 ? canto[x] - 6 : null
    const br = catmull(HALO, x) - 4
    const w = ss((x - 520) / 40)
    B.push(bl === null ? br : bl * (1 - w) + br * w)
  }
  const K = 200, Y1 = H - 1 - D - K
  const f = y => (y <= Y1 ? y + D : Y1 + D + (y - Y1) * (H - 1 - (Y1 + D)) / (H - 1 - Y1))
  const out = Buffer.from(data)
  for (let x = 0; x < W; x++) {
    const top = B[x] - D
    for (let y = Math.max(0, Math.floor(top)); y < H; y++) {
      const yin = f(y), y0 = Math.floor(yin), y1 = Math.min(H - 1, y0 + 1), t = yin - y0
      const w = ss((y - top) / 10)
      for (let c = 0; c < C; c++) {
        const v = data[(y0 * W + x) * C + c] * (1 - t) + data[(y1 * W + x) * C + c] * t
        const o = (y * W + x) * C + c
        out[o] = Math.round(data[o] * (1 - w) + v * w)
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: C } }).png().toFile(dst)
  console.log(JSON.stringify({ delta: D, corte: [0, 150, 300, 450, 520, 540, 560, 600, 720, 840, 930].map(x => [x, Math.round(B[x])]) }))
})()
