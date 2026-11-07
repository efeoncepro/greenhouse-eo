// Cambia a gris medio sólo el fondo blanco alcanzable desde el borde del cuadro (relleno por inundación),
// para que el recortador distinga las partes blancas del sujeto (pantalla, megáfono). Uso: node fondo-gris.cjs <in> <out>
const sharp = require('sharp')
;(async () => {
  const [inp, out] = process.argv.slice(2)
  const { data: S, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, N = W * H
  const blanco = p => { const r = S[p * 3], g = S[p * 3 + 1], b = S[p * 3 + 2]; return Math.min(r, g, b) >= 244 && Math.max(r, g, b) - Math.min(r, g, b) < 10 }
  const f = new Uint8Array(N), st = []
  for (let p = 0; p < N; p++) { const x = p % W, y = (p / W) | 0; if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && blanco(p)) { f[p] = 1; st.push(p) } }
  while (st.length) {
    const p = st.pop(), x = p % W
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) if (q >= 0 && q < N && !f[q] && blanco(q)) { f[q] = 1; st.push(q) }
  }
  for (let p = 0; p < N; p++) if (f[p]) { S[p * 3] = 127; S[p * 3 + 1] = 127; S[p * 3 + 2] = 127 }
  await sharp(S, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out)
})()
