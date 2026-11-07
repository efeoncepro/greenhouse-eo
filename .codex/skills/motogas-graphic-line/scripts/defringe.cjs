// Quita el halo blanco del fondo de estudio en los bordes semitransparentes (pelo):
// despeja el color de primer plano asumiendo que el píxel mezcló el sujeto con blanco puro,
// y recorta el alfa muy bajo que solo trae blanco. Uso: node defringe.cjs <in.png> <out.png>
const sharp = require('sharp')
;(async () => {
  const [inp, out] = process.argv.slice(2)
  const fi = process.argv.indexOf('--fondo')
  const BG = fi > 0 ? Number(process.argv[fi + 1]) : 255  // nivel gris del fondo del que viene el recorte
  const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255
    if (a <= 0 || a >= 0.98) continue
    for (let c = 0; c < 3; c++) {
      const v = (data[i + c] - (1 - a) * BG) / a
      data[i + c] = Math.max(0, Math.min(255, Math.round(v)))
    }
    // un poco menos de alfa en el borde para que no quede un contorno duro
    data[i + 3] = Math.round(data[i + 3] * 0.92)
  }
  // segunda pasada: píxeles casi blancos a ≤3 px de la transparencia son restos del fondo, no pelo
  const W = info.width, H = info.height
  const transp = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) if (data[p * 4 + 3] < 20) transp[p] = 1
  const cerca = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!transp[y * W + x]) continue
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) cerca[yy * W + xx] = 1
    }
  }
  for (let p = 0; p < W * H; p++) {
    if (!cerca[p] || transp[p]) continue
    const i = p * 4, l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (BG > 200 && l > 175) data[i + 3] = Math.round(data[i + 3] * Math.max(0, (235 - l) / 60) * 0.6)
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(out)
})()
