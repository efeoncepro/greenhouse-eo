// Envase con sombra de contacto calculada desde su silueta (luz a 45° desde arriba a la derecha → la sombra cae a la izquierda).
const sharp = require('sharp'); const [,, IN, OUT] = process.argv
;(async () => {
  const p = await sharp(IN).trim().toBuffer({ resolveWithObject: true }); const pw = p.info.width, ph = p.info.height
  const W = Math.round(pw * 2.2), H = ph + Math.round(pw * 0.35), x0 = Math.round((W - pw) / 2), base = ph
  const rx = Math.round(pw * 0.62), ry = Math.round(pw * 0.09), cx = x0 + pw / 2 - pw * 0.18
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><ellipse cx="${cx}" cy="${base - ry * 0.2}" rx="${rx}" ry="${ry}" fill="black" fill-opacity="0.9"/><ellipse cx="${x0 + pw / 2 - pw * 0.05}" cy="${base - 2}" rx="${pw * 0.46}" ry="${ry * 0.45}" fill="black"/></svg>`
  const sh = await sharp(Buffer.from(svg)).blur(Math.max(6, pw * 0.035)).png().toBuffer()
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sh, left: 0, top: 0 }, { input: p.data, left: x0, top: 0 }]).png().toFile(OUT)
  console.log('ok', W, H, 'base', base)
})()
