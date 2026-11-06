// Símbolo Lipigas a una tinta, como en la placa del collar: la unión de los dos óvalos en sólido,
// con el borde del óvalo interior como un hilo sin tinta (así se lee el grabado del original).
const sharp = require('sharp')
;(async () => {
  const [inp, out] = process.argv.slice(2)
  const img = sharp(inp, { limitInputPixels: false })
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = info.channels
  const tinta = new Uint8Array(W * H), lente = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) {
    const r = data[p * C], g = data[p * C + 1], b = data[p * C + 2]
    if (r + g + b > 720) continue
    tinta[p] = 1
    // amarillo puro = óvalo grande; el resto (verde-azul del degradado) = óvalo interior
    if (!(r > 200 && g > 170 && b < 120)) lente[p] = 1
  }
  const grosor = Math.round(Math.max(W, H) * 0.022)
  const rgba = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x
    if (!tinta[p]) continue
    let borde = false
    if (lente[p]) {
      for (let dy = -grosor; dy <= grosor && !borde; dy += 2) for (let dx = -grosor; dx <= grosor; dx += 2) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
        const q = yy * W + xx
        if (tinta[q] && !lente[q] && dx * dx + dy * dy <= grosor * grosor) { borde = true; break }
      }
    }
    rgba[p * 4 + 3] = borde ? 0 : 255
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out)
  console.log(W, H)
})()
