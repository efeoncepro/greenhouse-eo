// Acabado sin tocar letras: del acabado se toma sólo la BAJA frecuencia (luz, caída a los bordes, bloom) y del arte
// exacto la ALTA frecuencia (letras, logos, bordes). out = exacto − blur(exacto) + blur(acabado), sólo en la máscara.
const sharp = require('sharp'); const [,, EXACT, DONE, MASK, OUT, SIG] = process.argv; const sigma = Number(SIG || 10)
;(async () => {
  const ex = await sharp(EXACT).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = ex.info.width, H = ex.info.height
  const exB = await sharp(EXACT).removeAlpha().blur(sigma).raw().toBuffer()
  const dnB = await sharp(DONE).removeAlpha().blur(sigma).raw().toBuffer()
  const dn = await sharp(DONE).removeAlpha().raw().toBuffer()
  const mk = await sharp(MASK).extractChannel(0).raw().toBuffer()
  const out = Buffer.from(dn)
  for (let i = 0; i < W * H; i++) { const a = mk[i] / 255; if (!a) continue; const o = i * 3; for (let c = 0; c < 3; c++) { const v = ex.data[o+c] - exB[o+c] + dnB[o+c]; out[o+c] = Math.max(0, Math.min(255, Math.round(dn[o+c] * (1 - a) + v * a))) } }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(OUT); console.log('ok')
})()
