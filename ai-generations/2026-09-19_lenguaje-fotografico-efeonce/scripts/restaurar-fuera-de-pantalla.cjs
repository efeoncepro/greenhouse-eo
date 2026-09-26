// Tras el edit con máscara, restaura TODO lo que está fuera de la pantalla desde el plate original
// (la máscara no preserva píxeles). Uso: node restaurar-fuera-de-pantalla.cjs <plate> <edit> <alpha.png> <out.png>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const [plate, edit, alpha, out] = process.argv.slice(2)
;(async () => {
  const { width: W, height: H } = await sharp(plate).metadata()
  const a = await sharp(alpha).extractChannel(0).blur(3).raw().toBuffer()
  const e = await sharp(edit).removeAlpha().raw().toBuffer(), b = await sharp(plate).removeAlpha().raw().toBuffer()
  const o = Buffer.alloc(W * H * 3)
  for (let p = 0; p < W * H; p++) { const k = Math.min(1, a[p] / 255 * 1.6); for (let c = 0; c < 3; c++) o[p * 3 + c] = Math.round(e[p * 3 + c] * k + b[p * 3 + c] * (1 - k)) }
  await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out)
  console.log(out)
})()
