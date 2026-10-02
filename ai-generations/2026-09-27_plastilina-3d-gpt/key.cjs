// Recorte determinístico: el fondo es navy parejo; alfa por distancia al fondo local + des-mezcla del borde.
const sharp = require('sharp')
;(async () => {
  for (const g of ['pincel', 'bombillo', 'camara']) {
    const { data, info } = await sharp('out/' + g + '.png').removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const W = info.width, H = info.height
    // fondo estimado: mediana de un marco de 24 px
    const px = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 24 || y < 24 || x >= W - 24 || y >= H - 24) { const i = (y * W + x) * 3; px.push([data[i], data[i + 1], data[i + 2]]) }
    const med = [0, 1, 2].map((c) => px.map((p) => p[c]).sort((a, b) => a - b)[px.length >> 1])
    const out = Buffer.alloc(W * H * 4); const T0 = 28, T1 = 95
    for (let i = 0; i < W * H; i++) {
      const r = data[i * 3], gg = data[i * 3 + 1], b = data[i * 3 + 2]
      const d = Math.hypot(r - med[0], gg - med[1], b - med[2])
      let a = Math.min(1, Math.max(0, (d - T0) / (T1 - T0)))
      let R = r, G = gg, B = b
      if (a > 0 && a < 1) { R = (r - (1 - a) * med[0]) / a; G = (gg - (1 - a) * med[1]) / a; B = (b - (1 - a) * med[2]) / a }
      out[i * 4] = Math.max(0, Math.min(255, R)); out[i * 4 + 1] = Math.max(0, Math.min(255, G)); out[i * 4 + 2] = Math.max(0, Math.min(255, B)); out[i * 4 + 3] = Math.round(a * 255)
    }
    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile('alpha/' + g + '.png')
    console.log(g, 'fondo', med.join(','))
  }
})()
