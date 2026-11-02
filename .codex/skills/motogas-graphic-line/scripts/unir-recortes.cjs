// Une dos recortes del mismo encuadre tomando, píxel a píxel, el de mayor alfa.
// Uso: node unir-recortes.cjs <a.png> <b.png> <salida.png>
const sharp = require('sharp')
;(async () => {
  const [fa, fb, out] = process.argv.slice(2)
  const A = await sharp(fa).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const B = (await sharp(fb).ensureAlpha().raw().toBuffer()).valueOf()
  const D = A.data
  for (let i = 0; i < D.length; i += 4) if (B[i + 3] > D[i + 3]) { D[i] = B[i]; D[i + 1] = B[i + 1]; D[i + 2] = B[i + 2]; D[i + 3] = B[i + 3] }
  await sharp(D, { raw: { width: A.info.width, height: A.info.height, channels: 4 } }).png().toFile(out)
})()
