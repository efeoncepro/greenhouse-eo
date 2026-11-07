// Graba el logo Lipigas (símbolo sobre logotipo, a una tinta) en la placa plateada del collar.
// Detecta la placa como la mayor región gris neutra cerca del centro del pecho y compone el logo con
// multiplicación, para que la textura cepillada del metal se vea a través, como un grabado.
// Uso: NODE_PATH=$PWD/node_modules node placa.cjs <entrada.png> <salida.png> [--caja x,y,w,h]
const sharp = require('sharp')
const path = require('path')

// logos de la placa: assets/lipigas de la skill (o --logos <dir>)
const ai = process.argv.indexOf('--logos')
const F = ai > 0 ? process.argv[ai + 1] : path.join(__dirname, '..', 'assets', 'lipigas')
const args = process.argv.slice(2)
const [inp, out] = args
const ci = args.indexOf('--caja')

;(async () => {
  const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  let caja

  if (ci >= 0) {
    const [x, y, w, h] = args[ci + 1].split(',').map(Number)

    caja = { x0: x, y0: y, x1: x + w - 1, y1: y + h - 1 }
  } else {
    // gris neutro y medio: metal cepillado
    const m = new Uint8Array(W * H)

    for (let p = 0; p < W * H; p++) {
      const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2]
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)

      if (mx - mn < 18 && mx > 95 && mx < 215) m[p] = 1
    }
    const lab = new Int32Array(W * H).fill(-1)
    let mejor = null

    for (let i = 0; i < W * H; i++) {
      if (!m[i] || lab[i] >= 0) continue
      const st = [i]
      let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0

      lab[i] = 1
      while (st.length) {
        const p = st.pop(), x = p % W, y = (p / W) | 0

        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
        for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && m[q] && lab[q] < 0 && Math.abs((q % W) - x) <= 1) { lab[q] = 1; st.push(q) }
      }
      if (!mejor || n > mejor.n) mejor = { n, x0, y0, x1, y1 }
    }
    caja = mejor
  }

  const tw = caja.x1 - caja.x0 + 1, th = caja.y1 - caja.y0 + 1
  // logo: ancho = 80 % de la placa; centrado en x, algo bajo el centro del cuerpo de la placa (como el original)
  const lw = Math.round(tw * 0.8)
  const sim = await sharp(path.join(F, 'lipigas-simbolo-alfa.png')).resize({ width: Math.round(lw * 0.46) }).png().toBuffer()
  const wm = await sharp(path.join(F, 'lipigas-wordmark-alfa.png')).resize({ width: lw }).png().toBuffer()
  const ms = await sharp(sim).metadata(), mw = await sharp(wm).metadata()
  const gap = Math.round(mw.height * 0.28)
  const lh = ms.height + gap + mw.height
  const logo = await sharp({ create: { width: lw, height: lh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sim, left: Math.round((lw - ms.width) / 2), top: 0 }, { input: wm, left: 0, top: ms.height + gap }])
    .png().toBuffer()
  // tinta: gris muy oscuro, con un leve desenfoque para que asiente como grabado
  const { data: la, info: li } = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const ink = Buffer.alloc(li.width * li.height * 4)

  for (let p = 0; p < li.width * li.height; p++) {
    ink[p * 4] = 38; ink[p * 4 + 1] = 36; ink[p * 4 + 2] = 34
    ink[p * 4 + 3] = Math.round(la[p * 4 + 3] * 0.88)
  }
  const tinta = await sharp(ink, { raw: { width: li.width, height: li.height, channels: 4 } }).blur(0.6).png().toBuffer()
  const cx = caja.x0 + Math.round((tw - li.width) / 2)
  const cy = caja.y0 + Math.round(th * 0.57 - li.height / 2)

  await sharp(inp).composite([{ input: tinta, left: cx, top: cy, blend: 'multiply' }]).png().toFile(out)
  console.log(JSON.stringify({ inp, placa: { x: caja.x0, y: caja.y0, w: tw, h: th }, logo: { x: cx, y: cy, w: li.width, h: li.height } }))
})()
