// Compone un Spark oficial (SVG de AXIS, sin espejar) sobre una placa, con halo radial suave.
// uso: node compose-spark.cjs <placa> <svg> <salida> <cx> <cy> <alto> [haloOpacidad]
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [placa, svg, salida, cx, cy, alto, halo = '0.35'] = process.argv.slice(2)
;(async () => {
  const H = parseInt(alto), X = parseInt(cx), Y = parseInt(cy)
  const spark = await sharp(svg, { density: 600 }).resize({ height: H }).png().toBuffer()
  const m = await sharp(spark).metadata()
  const R = Math.round(H * 1.1)
  const haloSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${R * 2}" height="${R * 2}"><defs><radialGradient id="g"><stop offset="0" stop-color="#5aa9ff" stop-opacity="${halo}"/><stop offset="0.6" stop-color="#0375db" stop-opacity="${halo * 0.3}"/><stop offset="1" stop-color="#0375db" stop-opacity="0"/></radialGradient></defs><circle cx="${R}" cy="${R}" r="${R}" fill="url(#g)"/></svg>`)
  await sharp(placa)
    .composite([
      { input: haloSvg, left: X - R, top: Y - R, blend: 'screen' },
      { input: spark, left: Math.round(X - m.width / 2), top: Math.round(Y - m.height / 2) }
    ])
    .png()
    .toFile(salida)
  console.log('ok', salida, m.width, m.height)
})()
