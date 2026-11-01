// Padea un plano 4:5 (1024x1280) a 3:4 (1024x1366) espejando 43 px arriba y abajo; el recorte central devuelve el plano.
const sharp = require('sharp')
const [src, out] = process.argv.slice(2)
;(async () => {
  const W = 1024, H = 1280, P = 43
  const top = await sharp(src).extract({ left: 0, top: 0, width: W, height: P }).flip().toBuffer()
  const bot = await sharp(src).extract({ left: 0, top: H - P, width: W, height: P }).flip().toBuffer()
  await sharp({ create: { width: W, height: H + 2 * P, channels: 3, background: '#000' } })
    .composite([{ input: top, top: 0, left: 0 }, { input: src, top: P, left: 0 }, { input: bot, top: P + H, left: 0 }])
    .png().toFile(out)
})()
