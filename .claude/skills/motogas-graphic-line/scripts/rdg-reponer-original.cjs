// Repone el área original (1600×2000 en 160,400) sobre la ampliación, con un fundido de 48 px en los bordes
// interiores (arriba y costados; abajo el original llega al borde del lienzo).
const sharp = require('sharp')
;(async () => {
  const [amplio, original, out] = process.argv.slice(2)
  const W = 1600, H = 2000, F = 48
  const a = Buffer.alloc(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, W - 1 - x, y) // abajo no se funde
    a[y * W + x] = d >= F ? 255 : Math.round(255 * (d / F))
  }
  const orig = await sharp(original).removeAlpha().joinChannel(a, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer()
  await sharp(amplio).composite([{ input: orig, left: 160, top: 400 }]).png().toFile(out)
  console.log(out)
})()
