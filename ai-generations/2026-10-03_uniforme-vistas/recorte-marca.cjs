// Ubica el bordado blanco: el componente conexo de píxeles claros más grande y compacto en el pecho (fuera del fondo:
// el fondo gris toca el borde y es enorme). Lo recorta ampliado para mirarlo al 100 %.
const sharp = require('sharp')
const [, , salida, ...files] = process.argv
const ubicar = async f => {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  const claro = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) { const i = p * C; claro[p] = data[i] > 185 && data[i + 1] > 185 && data[i + 2] > 185 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) < 40 ? 1 : 0 }
  const visto = new Uint8Array(W * H); let mejor = null
  for (let s = 0; s < W * H; s++) {
    if (!claro[s] || visto[s]) continue
    const pila = [s]; visto[s] = 1; let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0
    while (pila.length) { const p = pila.pop(); n++; const x = p % W, y = (p - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && claro[q] && !visto[q]) { visto[q] = 1; pila.push(q) } }
    const w = x1 - x0, h = y1 - y0
    if (w > W * 0.25 || h > H * 0.2 || n < 150 || y0 < H * 0.05 || (y0 + y1) / 2 > H * 0.4) continue
    if (!mejor || n > mejor.n) mejor = { n, x0, y0, x1, y1 }
  }
  return { mejor, W, H }
}
;(async () => {
  const tiles = []
  for (const f of files) {
    const { mejor: m, W, H } = await ubicar(f)
    if (!m) { console.log(f, 'sin marca detectada'); continue }
    const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2, lado = Math.round(Math.max(m.x1 - m.x0, m.y1 - m.y0) * 2.2)
    const left = Math.max(0, Math.round(cx - lado / 2)), top = Math.max(0, Math.round(cy - lado / 2))
    tiles.push(await sharp(f).extract({ left, top, width: Math.min(lado, W - left), height: Math.min(lado, H - top) }).resize(300, 300, { fit: 'contain', background: '#fff' }).toBuffer())
    console.log(f, { px: m.n, anchoMarca: m.x1 - m.x0, frac: +((m.x1 - m.x0) / W).toFixed(3), cx: +(cx / W).toFixed(3), cy: +(cy / H).toFixed(3) })
  }
  await sharp({ create: { width: 300 * tiles.length, height: 300, channels: 3, background: '#fff' } }).composite(tiles.map((t, i) => ({ input: t, left: i * 300, top: 0 }))).png().toFile(salida)
})()
