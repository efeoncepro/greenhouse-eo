// Recorte por color de fondo para objetos generados sobre gris plano (#808080): inunda desde los bordes los
// píxeles cercanos al fondo y suaviza el borde según la distancia. Conserva lo que el recortador automático borra
// (papel crema, vapor, llamas translúcidas). Uso: node recorte-fondo-plano.cjs <in.png> <out.png> [--tol 26]
const sharp = require('sharp')
;(async () => {
  const [inp, out] = process.argv.slice(2)
  const ti = process.argv.indexOf('--tol')
  const TOL = ti > 0 ? Number(process.argv[ti + 1]) : 26
  const { data: S, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, N = W * H
  // color de fondo: mediana de las 4 esquinas
  const esq = [0, W - 1, (H - 1) * W, N - 1].map((p) => [S[p * 3], S[p * 3 + 1], S[p * 3 + 2]])
  const bg = [0, 1, 2].map((c) => esq.map((e) => e[c]).sort((a, b) => a - b)[2])
  const d = (p) => Math.hypot(S[p * 3] - bg[0], S[p * 3 + 1] - bg[1], S[p * 3 + 2] - bg[2])
  const fondo = new Uint8Array(N), st = []
  for (let p = 0; p < N; p++) { const x = p % W, y = (p / W) | 0; if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && d(p) < TOL) { fondo[p] = 1; st.push(p) } }
  while (st.length) {
    const p = st.pop(), x = p % W
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) if (q >= 0 && q < N && !fondo[q] && d(q) < TOL) { fondo[q] = 1; st.push(q) }
  }
  const outb = Buffer.alloc(N * 4)
  for (let p = 0; p < N; p++) {
    outb[p * 4] = S[p * 3]; outb[p * 4 + 1] = S[p * 3 + 1]; outb[p * 4 + 2] = S[p * 3 + 2]
    if (!fondo[p]) { outb[p * 4 + 3] = 255; continue }
    // borde suave: alfa proporcional a la distancia al fondo (0 en el fondo puro)
    outb[p * 4 + 3] = Math.max(0, Math.min(255, Math.round((d(p) / TOL) * 140 - 40)))
  }
  await sharp(outb, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out)
  console.log(inp.split('/').pop(), 'fondo', bg.join(','))
})()
