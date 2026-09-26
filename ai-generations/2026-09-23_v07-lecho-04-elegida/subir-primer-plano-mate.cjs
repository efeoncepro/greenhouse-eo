// Sube el primer plano (lecho + apoyabrazos) como una capa con mate suave: sólo se mueve lo que
// es primer plano. El lecho es opaco desde su canto; el apoyabrazos entra por su brillo (su halo
// desenfocado se funde sobre la manga, que queda en su lugar); la mesa y la manga no se mueven.
// Uso: node subir-primer-plano-mate.cjs <plate.png> <salida.png> [delta=60]
const sharp = require('sharp')
const [src, dst, deltaArg] = process.argv.slice(2)
const D = Number(deltaArg || 60)
const ss = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
;(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = 3
  const L = (x, y) => { let s = 0; for (let dx = -2; dx <= 2; dx++) { const xx = Math.min(W - 1, Math.max(0, x + dx)); const i = (Math.min(H - 1, y) * W + xx) * C; s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] } return s / 5 }
  const Ls = (x, y) => (L(x, y - 1) + L(x, y) + L(x, y + 1)) / 3
  // Canto del lecho (x < 600): mínimo del hueco y primera fila que sube 12 sobre él.
  const cantoRaw = []
  for (let x = 0; x < 600; x++) {
    let m = 1330, lm = 1e9
    for (let y = 1330; y <= 1440; y++) { const v = Ls(x, y); if (v < lm) { lm = v; m = y } }
    let b = m
    for (let y = m; y <= 1470; y++) if (Ls(x, y) > lm + 12) { b = y; break }
    cantoRaw.push(b)
  }
  const at = (a, x) => a[Math.min(a.length - 1, Math.max(0, x))]
  const med = cantoRaw.map((_, x) => { const v = []; for (let k = -7; k <= 7; k++) v.push(at(cantoRaw, x + k)); return v.sort((p, q) => p - q)[7] })
  const canto = med.map((_, x) => { let s = 0; for (let k = -10; k <= 10; k++) s += at(med, x + k); return s / 21 })
  const alfaFuente = (x, y) => {
    const izq = x < 600 ? ss((y - (canto[x] - 8)) / 14) : 0
    const brillo = y >= 1300 ? ss((Ls(x, y) - 32) / 38) : 0
    const der = Math.max(brillo, ss((y - 1440) / 20))
    const w = ss((x - 540) / 60)
    return izq * (1 - w) + der * w
  }
  const K = 200, Y1 = H - 1 - D - K
  const f = y => (y <= Y1 ? y + D : Y1 + D + (y - Y1) * (H - 1 - (Y1 + D)) / (H - 1 - Y1))
  const out = Buffer.from(data)
  for (let x = 0; x < W; x++) {
    for (let y = 1200; y < H; y++) {
      const yin = f(y), y0 = Math.floor(yin), y1 = Math.min(H - 1, y0 + 1), t = yin - y0
      const a = alfaFuente(x, Math.round(yin))
      if (a <= 0) continue
      for (let c = 0; c < C; c++) {
        const v = data[(y0 * W + x) * C + c] * (1 - t) + data[(y1 * W + x) * C + c] * t
        const o = (y * W + x) * C + c
        out[o] = Math.round(data[o] * (1 - a) + v * a)
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: C } }).png().toFile(dst)
  console.log(JSON.stringify({ delta: D, canto: [0, 150, 300, 450, 540, 590].map(x => [x, Math.round(canto[x])]) }))
})()
