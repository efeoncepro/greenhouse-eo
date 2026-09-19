// Máscara de pantalla en chroma verde para curación generativa de UI.
// Uso: node mascara-chroma.cjs <plate.png> <mask-out.png> <alpha-out.png>
//  - mask-out: RGBA; alfa 0 = zona a editar (pantalla), 255 = protegida (formato de --mask de pnpm ai:image)
//  - alpha-out: 1 canal; 255 = pantalla (para restaurar después fuera de la pantalla desde el plate original)
// OJO: extractChannel(0) es obligatorio; sin él sharp devuelve 3 canales y la máscara se desalinea (bug real 2026-09-19).
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [plate, maskOut, alphaOut] = process.argv.slice(2)
;(async () => {
  const { data, info } = await sharp(plate).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, g = Buffer.alloc(W * H)
  for (let p = 0; p < W * H; p++) { const r = data[p * 3], gg = data[p * 3 + 1], b = data[p * 3 + 2]; if (gg > 120 && gg > r * 1.4 && gg > b * 1.4) g[p] = 255 }
  const dil = await sharp(g, { raw: { width: W, height: H, channels: 1 } }).blur(2).threshold(20).extractChannel(0).raw().toBuffer()
  const rgba = Buffer.alloc(W * H * 4); let n = 0
  for (let p = 0; p < W * H; p++) { rgba[p * 4 + 3] = dil[p] ? 0 : 255; if (dil[p]) n++ }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(maskOut)
  await sharp(dil, { raw: { width: W, height: H, channels: 1 } }).png().toFile(alphaOut)
  console.log('píxeles de pantalla', n)
})()
