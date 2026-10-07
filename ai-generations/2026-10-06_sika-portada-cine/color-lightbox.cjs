// Devuelve el amarillo de marca al lightbox terminado: ganancia por canal medida en el área amarilla
// (exacto vs. terminado), aplicada sólo dentro de la máscara del lightbox. La textura y la luz del acabado se quedan.
const sharp = require('sharp'); const [,, EXACT, DONE, MASK, OUT] = process.argv
;(async () => {
  const ex = await sharp(EXACT).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const dn = await sharp(DONE).removeAlpha().raw().toBuffer()
  const mk = await sharp(MASK).extractChannel(0).raw().toBuffer()
  const W = ex.info.width, N = W * ex.info.height, e = ex.data
  const sE = [0,0,0], sD = [0,0,0]; let n = 0
  for (let i = 0; i < N; i++) { if (mk[i] < 250) continue; const o = i * 3; if (e[o] > 200 && e[o+1] > 150 && e[o+2] < 90) { for (let c = 0; c < 3; c++) { sE[c] += e[o+c]; sD[c] += dn[o+c] } n++ } }
  const gain = sE.map((v, c) => v / sD[c]); console.log('pixeles', n, 'exacto', sE.map(v => (v/n).toFixed(1)), 'terminado', sD.map(v => (v/n).toFixed(1)), 'ganancia', gain.map(g => g.toFixed(3)))
  const out = Buffer.from(dn)
  // sólo donde el arte EXACTO es amarillo de marca (peso por tono): blancos, negros, rojos y azules quedan como el acabado
  for (let i = 0; i < N; i++) { const o = i * 3; const yel = Math.max(0, Math.min(1, (e[o] - e[o+2] - 120) / 60)) * Math.max(0, Math.min(1, (e[o+1] - 120) / 40)) * (e[o] > 180 ? 1 : 0); const a = (mk[i] / 255) * yel; if (!a) continue; for (let c = 0; c < 3; c++) out[o+c] = Math.max(0, Math.min(255, Math.round(dn[o+c] * (1 - a) + dn[o+c] * gain[c] * a))) }
  await sharp(out, { raw: { width: W, height: ex.info.height, channels: 3 } }).png().toFile(OUT); console.log('ok')
})()
