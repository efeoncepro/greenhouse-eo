// Toma del acabado sólo una zona elíptica con borde suave y devuelve el resto intacto desde la base.
// uso: node merge-zona.cjs <base> <acabado> <salida> <cx> <cy> <rx> <ry> [pluma]
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [base, acabado, salida, cx, cy, rx, ry, pluma = '24'] = process.argv.slice(2)
;(async () => {
  const { width, height } = await sharp(base).metadata()
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="black"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/></svg>`)
  const alpha = await sharp(mask).flatten({ background: '#000' }).blur(parseFloat(pluma)).extractChannel(0).raw().toBuffer()
  const a = await sharp(acabado).resize(width, height).removeAlpha().raw().toBuffer()
  const b = await sharp(base).removeAlpha().raw().toBuffer()
  const out = Buffer.alloc(width * height * 3)
  for (let p = 0; p < width * height; p++) {
    const t = alpha[p] / 255
    for (let c = 0; c < 3; c++) out[p * 3 + c] = t === 0 ? b[p * 3 + c] : Math.round(a[p * 3 + c] * t + b[p * 3 + c] * (1 - t))
  }
  await sharp(out, { raw: { width, height, channels: 3 } }).png().toFile(salida)
  console.log('ok', salida)
})()
