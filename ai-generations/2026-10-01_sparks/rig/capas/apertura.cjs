// Apertura morfológica del alfa de una capa (erosión + dilatación por desenfoque y umbral): quita espolones y flecos
// más delgados que ~2·R px que salen de la silueta, sin redondear lo que es más grueso. Uso: node apertura.cjs <png> [R]
const sharp = require('sharp')
const fs = require('fs')
const [, , file, Rs = '4'] = process.argv
const R = +Rs
;(async () => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const alpha = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) alpha[i] = data[i * 4 + 3] > 96 ? 255 : 0
  const op = async (buf, thr) => sharp(buf, { raw: { width: W, height: H, channels: 1 } }).blur(R).threshold(thr).extractChannel(0).raw().toBuffer()
  const eroded = await op(alpha, 250)
  const opened = await op(eroded, 6)
  const soft = await sharp(opened, { raw: { width: W, height: H, channels: 1 } }).blur(1).extractChannel(0).raw().toBuffer()
  let cut = 0
  for (let i = 0; i < W * H; i++) { const k = soft[i] / 255; const na = Math.round(data[i * 4 + 3] * k); if (na < data[i * 4 + 3] - 20) cut++; data[i * 4 + 3] = na }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(file + '.tmp.png')
  fs.renameSync(file + '.tmp.png', file)
  console.log(file, 'px recortados', cut)
})()
