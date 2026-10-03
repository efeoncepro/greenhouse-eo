// Toma del acabado sólo las zonas elípticas indicadas (borde suave) y devuelve el resto intacto desde la base.
// Imprime cuántos píxeles cambiaron fuera de las zonas (+margen): debe ser 0.
// uso: node merge-zonas.cjs <base> <acabado> <salida> '<json: [[cx,cy,rx,ry], …]>' [pluma]
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [base, acabado, salida, json, pluma = '24'] = process.argv.slice(2)
;(async () => {
  const zonas = JSON.parse(json)
  const { width, height } = await sharp(base).metadata()
  const elipses = zonas.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/>`).join('')
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="black"/>${elipses}</svg>`)
  const alpha = await sharp(mask).flatten({ background: '#000' }).blur(parseFloat(pluma)).extractChannel(0).raw().toBuffer()
  const a = await sharp(acabado).resize(width, height).removeAlpha().raw().toBuffer()
  const b = await sharp(base).removeAlpha().raw().toBuffer()
  const out = Buffer.alloc(width * height * 3)
  let fuera = 0
  const margen = parseFloat(pluma) * 3
  for (let p = 0; p < width * height; p++) {
    const t = alpha[p] / 255
    for (let c = 0; c < 3; c++) out[p * 3 + c] = t === 0 ? b[p * 3 + c] : Math.round(a[p * 3 + c] * t + b[p * 3 + c] * (1 - t))
    const x = p % width, y = (p - x) / width
    const dentro = zonas.some(([cx, cy, rx, ry]) => ((x - cx) / (rx + margen)) ** 2 + ((y - cy) / (ry + margen)) ** 2 <= 1)
    if (!dentro && (out[p * 3] !== b[p * 3] || out[p * 3 + 1] !== b[p * 3 + 1] || out[p * 3 + 2] !== b[p * 3 + 2])) fuera++
  }
  await sharp(out, { raw: { width, height, channels: 3 } }).png().toFile(salida)
  console.log('ok', salida, '· píxeles cambiados fuera de las zonas:', fuera)
  if (fuera) process.exit(1)
})()
