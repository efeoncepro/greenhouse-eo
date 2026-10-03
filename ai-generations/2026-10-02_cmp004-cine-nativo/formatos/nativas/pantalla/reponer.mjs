// Toma la edición a la izquierda (monitor, cinta, mano) y repone el original a la derecha (cara, hoodie, escena),
// con transición de 120 px entre x=600 y x=720: la persona queda con sus píxeles aprobados.
import sharp from 'sharp'
const [orig, edit, out] = process.argv.slice(2)
const W = 2048, x0 = 600, x1 = 720
const o = await sharp(orig).removeAlpha().raw().toBuffer()
const e = await sharp(edit).resize(W, W).removeAlpha().raw().toBuffer()
const r = Buffer.alloc(W * W * 3)
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))), a = t * t * (3 - 2 * t), i = (y * W + x) * 3
  for (let c = 0; c < 3; c++) r[i + c] = Math.round(o[i + c] * a + e[i + c] * (1 - a))
}
await sharp(r, { raw: { width: W, height: W, channels: 3 } }).png().toFile(out)
console.log('✓', out)
