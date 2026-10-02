// crop:  node recorte.cjs crop <img> <cx> <cy> <box> <out1024>
// paste: node recorte.cjs paste <img> <edited1024> <cx> <cy> <box> <out>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [mode, img, a, b, c, d, e] = process.argv.slice(2)
;(async () => {
  if (mode === 'crop') {
    const [cx, cy, box, out] = [+a, +b, +c, d]
    await sharp(img).extract({ left: Math.round(cx - box / 2), top: Math.round(cy - box / 2), width: box, height: box }).resize(1024, 1024, { kernel: 'lanczos3' }).png().toFile(out)
  } else {
    const [edited, cx, cy, box, out] = [a, +b, +c, +d, e]
    const left = Math.round(cx - box / 2), top = Math.round(cy - box / 2)
    const f = Math.max(6, Math.round(box * 0.07))
    const r = box * 0.40
    const svg = `<svg width="${box}" height="${box}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="f"><feGaussianBlur stdDeviation="${f}"/></filter></defs><rect width="100%" height="100%" fill="black"/><ellipse cx="${box/2}" cy="${box/2}" rx="${r*0.92}" ry="${r*1.08}" fill="white" filter="url(#f)"/></svg>`
    const mask = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer()
    const ed = await sharp(edited).resize(box, box, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer()
    const tile = await sharp(ed, { raw: { width: box, height: box, channels: 3 } }).joinChannel(mask, { raw: { width: box, height: box, channels: 1 } }).png().toBuffer()
    await sharp(img).removeAlpha().composite([{ input: tile, left, top }]).png().toFile(out)
  }
  console.log('ok')
})()
