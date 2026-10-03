// Compone varios Sparks oficiales (SVG de AXIS o su variante de mirada) sobre una placa, cada uno con halo radial.
// uso: node compose-sparks.cjs <placa> <salida> '<json: [{svg, cx, cy, alto, halo?}]>'
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [placa, salida, json] = process.argv.slice(2)
;(async () => {
  const capas = []
  for (const { svg, cx, cy, alto, halo = 0.35, desenfoque = 0 } of JSON.parse(json)) {
    let spark = await sharp(svg, { density: 600 }).resize({ height: alto }).png().toBuffer()
    if (desenfoque > 0) spark = await sharp(spark).blur(desenfoque).png().toBuffer() // profundidad: los lejanos, fuera de foco
    const m = await sharp(spark).metadata()
    const R = Math.round(alto * 1.1)
    const haloSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${R * 2}" height="${R * 2}"><defs><radialGradient id="g"><stop offset="0" stop-color="#5aa9ff" stop-opacity="${halo}"/><stop offset="0.6" stop-color="#0375db" stop-opacity="${halo * 0.3}"/><stop offset="1" stop-color="#0375db" stop-opacity="0"/></radialGradient></defs><circle cx="${R}" cy="${R}" r="${R}" fill="url(#g)"/></svg>`)
    capas.push({ input: haloSvg, left: cx - R, top: cy - R, blend: 'screen' })
    capas.push({ input: spark, left: Math.round(cx - m.width / 2), top: Math.round(cy - m.height / 2) })
  }
  await sharp(placa).composite(capas).png().toFile(salida)
  console.log('ok', salida, capas.length / 2, 'Sparks')
})()
