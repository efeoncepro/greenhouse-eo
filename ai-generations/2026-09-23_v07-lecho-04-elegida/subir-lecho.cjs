// Sube el lecho físico de la story 04-elegida-916 desplazando la propia foto hacia arriba bajo
// su canto (sin pintar nada): el canto conserva su brillo, su curva y su desenfoque; lo que
// queda detrás (el hueco bajo la mesa) pasa a estar tapado por el objeto cercano.
// Uso: node subir-lecho.cjs <plate.png> <salida.png> [delta=58]
const sharp = require('sharp')
const [src, dst, deltaArg] = process.argv.slice(2)
const D0 = Number(deltaArg || 58)
const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
;(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = 3
  const lum = (x, y) => { const i = (y * W + x) * C; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] }
  // 1) Canto medido columna a columna (pico del gradiente oscuro→claro, filas 1330..1480), sólo donde es limpio.
  const det = []
  for (let x = 100; x <= 540; x++) {
    const prof = []
    for (let y = 1330; y < 1480; y++) { let s = 0; for (let dx = -2; dx <= 2; dx++) s += lum(Math.min(W - 1, Math.max(0, x + dx)), y); prof.push(s / 5) }
    let best = -1, by = 0
    for (let i = 6; i < prof.length - 6; i++) { const g = prof[i + 5] - prof[i - 5]; if (g > best) { best = g; by = i } }
    det.push([x, 1330 + by])
  }
  // Ajuste lineal robusto del canto y extensión a todo el ancho.
  const n = det.length, mx = det.reduce((s, d) => s + d[0], 0) / n, my = det.reduce((s, d) => s + d[1], 0) / n
  const b = det.reduce((s, d) => s + (d[0] - mx) * (d[1] - my), 0) / det.reduce((s, d) => s + (d[0] - mx) ** 2, 0)
  const a = my - b * mx
  // El corte va 12 px sobre el pico: la fila de entrada que sube al corte sigue en el hueco oscuro.
  const canto = x => a + b * x - 12
  // 2) Desplazamiento: pleno bajo la firma, cae a 0 hacia la mesa (izquierda) y antes del apoyabrazos (derecha).
  const delta = x => D0 * smooth((x - 60) / 240) * (1 - smooth((x - 540) / 100))
  const out = Buffer.from(data)
  for (let x = 0; x < W; x++) {
    const d = delta(x)
    if (d < 0.25) continue
    const r = canto(x)
    const top = r - d
    for (let y = Math.floor(top); y < H; y++) {
      if (y < 0) continue
      const yin = r + (y - top) * (H - 1 - r) / (H - 1 - top)
      const y0 = Math.floor(yin), y1 = Math.min(H - 1, y0 + 1), t = yin - y0
      // Borde suave de 4 px en el corte, como el de un objeto desenfocado delante.
      const w = smooth((y - top) / 4)
      for (let c = 0; c < C; c++) {
        const v = data[(y0 * W + x) * C + c] * (1 - t) + data[(y1 * W + x) * C + c] * t
        const o = (y * W + x) * C + c
        out[o] = Math.round(data[o] * (1 - w) + v * w)
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: C } }).png().toFile(dst)
  console.log(JSON.stringify({ cantoIzq: +(a + b * 100).toFixed(1), cantoDer: +(a + b * 540).toFixed(1), pendiente: +b.toFixed(4), delta: D0 }))
})()
