// Suaviza el contorno del cuerpo: mide el radio del borde (alfa > 128) en cada dirección, le pasa una mediana angular
// (±W/2 muestras) y recorta lo que sobresale de esa curva más de 1 px. Quita espolones angostos sin tocar la silueta.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const D = __dirname, W = 1600, CX = 794, CY = 716, N = 2880, WIN = 31
;(async () => {
  const file = path.join(D, 'engine/cuerpo.png')
  const L = await sharp(file).ensureAlpha().raw().toBuffer()
  const R = new Float64Array(N)
  for (let k = 0; k < N; k++) {
    const t = (k / N) * 2 * Math.PI, dx = Math.cos(t), dy = Math.sin(t); let last = 0
    for (let r = 250; r < 620; r += 0.5) { const x = Math.round(CX + dx * r), y = Math.round(CY + dy * r); if (x < 0 || y < 0 || x >= W || y >= W) break; if (L[(y * W + x) * 4 + 3] > 128) last = r }
    R[k] = last
  }
  const M = Float64Array.from(R, (_, k) => { const w = []; for (let j = -(WIN >> 1); j <= WIN >> 1; j++) w.push(R[(k + j + N) % N]); w.sort((a, b) => a - b); return w[WIN >> 1] })
  let cut = 0
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!L[i * 4 + 3]) continue
    let a = Math.atan2(y - CY, x - CX); if (a < 0) a += 2 * Math.PI
    if (a > Math.PI * 0.32 && a < Math.PI * 0.68) continue // brillo de la base
    const lim = M[Math.round((a / (2 * Math.PI)) * N) % N] + 1, r = Math.hypot(x - CX, y - CY)
    if (r > lim + 1) { L[i * 4 + 3] = 0; cut++ } else if (r > lim) { L[i * 4 + 3] = Math.round(L[i * 4 + 3] * (lim + 1 - r)); cut++ }
  }
  await sharp(L, { raw: { width: W, height: W, channels: 4 } }).png().toFile(file + '.tmp.png')
  fs.renameSync(file + '.tmp.png', file)
  console.log('contorno: px recortados', cut)
})()
