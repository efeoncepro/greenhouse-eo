// Poses de mano del rig v2: se recortan de las ediciones (fondo gris plano) por distancia al gris y se
// despremultiplican; la izquierda es el espejo de la derecha, llevado a su muñeca. Elegidas: abierta-1 (pulgar + tres
// dedos, como el original; la 2 tenía cinco), senala-1 y puno-2.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const D = __dirname, W = 1600
const P = require('./pivotes.json')
const POSES = { abierta: 'mano-abierta-1.png', senala: 'mano-senala-1.png', puno: 'mano-puno-2.png' }
;(async () => {
  const src = await sharp(path.join(D, '../fuente/spark-engine-sin-cara.png')).removeAlpha().raw().toBuffer()
  // gris de fondo medido en una esquina
  let bg = [0, 0, 0]; for (let y = 1300; y < 1400; y++) for (let x = 1450; x < 1550; x++) for (let k = 0; k < 3; k++) bg[k] += src[(y * W + x) * 3 + k] / 10000
  const fore = await sharp(path.join(D, 'm-brazo-der.png')).greyscale().raw().toBuffer()
  for (const [pose, file] of Object.entries(POSES)) {
    const g = await sharp(path.join(D, file)).removeAlpha().raw().toBuffer()
    const R = Buffer.alloc(W * W * 4)
    for (let y = 760; y < 1240; y++) for (let x = 1362; x < W; x++) {
      const i = y * W + x
      if (x < 1369 && fore[i] < 128) continue
      const d = Math.max(...[0, 1, 2].map((k) => Math.abs(g[i * 3 + k] - bg[k])))
      const a = Math.max(0, Math.min(1, (d - 10) / 28))
      if (a <= 0) continue
      for (let k = 0; k < 3; k++) R[i * 4 + k] = Math.max(0, Math.min(255, Math.round((g[i * 3 + k] - bg[k] * (1 - a)) / a)))
      R[i * 4 + 3] = Math.round(a * 255)
    }
    // limpia islas: sólo queda lo conectado a la muñeca
    await sharp(R, { raw: { width: W, height: W, channels: 4 } }).png().toFile(path.join(D, 'engine', `mano-der-${pose}.png`))
    const dx = P.wristL[0] - (W - 1 - P.wristR[0]), dy = P.wristL[1] - P.wristR[1]
    const flipped = await sharp(R, { raw: { width: W, height: W, channels: 4 } }).flop().raw().toBuffer()
    const Lb = Buffer.alloc(W * W * 4)
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const sx = x - dx, sy = y - dy; if (sx < 0 || sy < 0 || sx >= W || sy >= W) continue; flipped.copy(Lb, (y * W + x) * 4, (sy * W + sx) * 4, (sy * W + sx) * 4 + 4) }
    await sharp(Lb, { raw: { width: W, height: W, channels: 4 } }).png().toFile(path.join(D, 'engine', `mano-izq-${pose}.png`))
    console.log(pose, 'ok', { dx, dy })
  }
  // La mano de origen (palma hacia arriba, presenta) queda como pose «palma».
  for (const s of ['izq', 'der']) fs.copyFileSync(path.join(D, 'engine', `mano-${s}.png`), path.join(D, 'engine', `mano-${s}-palma.png`))
})()
