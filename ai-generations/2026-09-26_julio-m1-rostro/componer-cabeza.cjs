// Pega sólo la zona elíptica (con borde difuso) de la imagen editada sobre la original.
// Uso: node componer-cabeza.cjs <original> <editada> <cx> <cy> <rx> <ry> <feather> <salida>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [base, edited, cx, cy, rx, ry, feather, out] = process.argv.slice(2)
;(async () => {
  const meta = await sharp(base).metadata()
  const { width: w, height: h } = meta
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="f"><feGaussianBlur stdDeviation="${feather}"/></filter></defs><rect width="100%" height="100%" fill="black"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white" filter="url(#f)"/></svg>`
  const mask = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer()
  const ed = await sharp(edited).resize(w, h).removeAlpha().raw().toBuffer()
  const masked = await sharp(ed, { raw: { width: w, height: h, channels: 3 } }).joinChannel(mask, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()
  await sharp(base).removeAlpha().composite([{ input: masked }]).png().toFile(out)
  console.log('ok', out)
})()
