// Extrae el logotipo «Lipigas» (sin arco, «Recoleta» ni ®) de la lámina negra oficial, por componentes conexos.
const sharp = require('sharp')
;(async () => {
  const [inp, out] = process.argv.slice(2)
  const k = 4
  const meta = await sharp(inp, { limitInputPixels: false }).metadata()
  const W = Math.round(meta.width / k), H = Math.round(meta.height / k)
  const { data } = await sharp(inp, { limitInputPixels: false }).resize(W, H).greyscale().raw().toBuffer({ resolveWithObject: true })
  const lab = new Int32Array(W * H).fill(-1)
  const comps = []
  for (let i = 0; i < W * H; i++) {
    if (data[i] > 128 || lab[i] >= 0) continue
    const id = comps.length, st = [i]
    let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0
    lab[i] = id
    while (st.length) {
      const p = st.pop(), x = p % W, y = (p / W) | 0
      n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && lab[q] < 0 && data[q] <= 128 && Math.abs((q % W) - x) <= 1) { lab[q] = id; st.push(q) }
    }
    comps.push({ id, x0, y0, x1, y1, n, w: x1 - x0 + 1, h: y1 - y0 + 1 })
  }
  const grandes = comps.filter(c => c.n > 50)
  grandes.sort((a, b) => b.w - a.w)
  const arco = grandes[0]
  const resto = grandes.filter(c => c !== arco)
  const hMax = Math.max(...resto.map(c => c.h))
  const letras = resto.filter(c => c.h > hMax * 0.45)
  console.log('arco', arco, 'letras', letras.length, letras.map(c => [c.x0, c.y0, c.w, c.h]))
  const bx0 = Math.min(...letras.map(c => c.x0)), by0 = Math.min(...letras.map(c => c.y0))
  const bx1 = Math.max(...letras.map(c => c.x1)), by1 = Math.max(...letras.map(c => c.y1))
  const keep = new Set(letras.map(c => c.id))
  const ow = bx1 - bx0 + 1, oh = by1 - by0 + 1
  const rgba = Buffer.alloc(ow * oh * 4)
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const p = (y + by0) * W + (x + bx0)
    const o = (y * ow + x) * 4
    // alfa desde la luminancia original para conservar el antialias del borde, solo en píxeles de letras (y vecinos)
    let cerca = keep.has(lab[p])
    if (!cerca) for (const q of [p - 1, p + 1, p - W, p + W]) if (keep.has(lab[q])) cerca = true
    rgba[o + 3] = cerca ? 255 - data[p] : 0
  }
  await sharp(rgba, { raw: { width: ow, height: oh, channels: 4 } }).png().toFile(out)
})()
