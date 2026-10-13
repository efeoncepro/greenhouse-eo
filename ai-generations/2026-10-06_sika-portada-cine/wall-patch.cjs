// Repone el muro carbón bajo el panel (donde el borrado dejó una forma) con textura del mismo muro, fundida.
const sharp = require('sharp'); const [,, IN, OUT] = process.argv
;(async () => {
  const { data, info } = await sharp(IN).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width
  const X0 = 1150, X1 = 1690, Y0 = 880, Y1 = 1320, SHIFT = 620, F = 45
  const out = Buffer.from(data)
  for (let y = Y0 - F; y < Y1; y++) for (let x = X0 - F; x < X1; x++) {
    const ax = Math.min(1, (x - (X0 - F)) / F, (X1 - x) / F), ay = Math.min(1, (y - (Y0 - F)) / F, (Y1 - y) / F)
    const a = Math.max(0, Math.min(ax, ay)); if (a <= 0) continue
    const o = (y * W + x) * 3, so = (y * W + (x - SHIFT)) * 3
    // conserva el resplandor del borde del panel: mezcla por luminancia relativa a la fila de referencia
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(data[o + c] * (1 - a) + data[so + c] * a)
  }
  await sharp(out, { raw: { width: W, height: info.height, channels: 3 } }).png().toFile(OUT); console.log('ok')
})()
