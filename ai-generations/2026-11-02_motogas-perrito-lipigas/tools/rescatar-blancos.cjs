// Recupera las partes claras del sujeto que el recortador tomó por fondo (pantalla, megáfono, placa).
// 1) Fondo = lo que se alcanza desde el borde del cuadro pasando por píxeles casi blancos y neutros.
// 2) Candidatos = píxeles transparentes en el recorte, claros (o gris metal), que NO son fondo.
// 3) Se agrupan en regiones; una región se recupera sólo si la mayor parte de su borde toca al sujeto
//    opaco (está encerrada por él). La sombra del piso toca sobre todo al fondo y se descarta.
// Uso: node rescatar-blancos.cjs <fondo-estudio.png> <recorte.png> <salida.png> [--umbral 246] [--encierro 0.55]
const sharp = require('sharp')
;(async () => {
  const [src, cut, out] = process.argv.slice(2)
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d }
  const U = arg('--umbral', 246), ENC = arg('--encierro', 0.55)
  const a = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const b = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = a.info.width, H = a.info.height, S = a.data, C = b.data, N = W * H
  const vec = (p, x) => { const q = []; if (x > 0) q.push(p - 1); if (x < W - 1) q.push(p + 1); if (p >= W) q.push(p - W); if (p < N - W) q.push(p + W); return q }
  const blanco = p => { const r = S[p * 3], g = S[p * 3 + 1], bb = S[p * 3 + 2]; return Math.min(r, g, bb) >= U && Math.max(r, g, bb) - Math.min(r, g, bb) < 10 }
  const fondo = new Uint8Array(N), st = []
  for (let p = 0; p < N; p++) { const x = p % W, y = (p / W) | 0; if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && blanco(p)) { fondo[p] = 1; st.push(p) } }
  while (st.length) { const p = st.pop(); for (const q of vec(p, p % W)) if (!fondo[q] && blanco(q)) { fondo[q] = 1; st.push(q) } }
  const opaco = p => C[p * 4 + 3] > 200
  const cand = new Uint8Array(N)
  for (let p = 0; p < N; p++) {
    if (fondo[p] || opaco(p)) continue
    const r = S[p * 3], g = S[p * 3 + 1], bb = S[p * 3 + 2]
    if (Math.min(r, g, bb) >= 110) cand[p] = 1
  }
  const lab = new Int32Array(N).fill(-1)
  let recuperados = 0
  const informe = []
  for (let i = 0; i < N; i++) {
    if (!cand[i] || lab[i] >= 0) continue
    const reg = [i]; lab[i] = i
    let toqueOpaco = 0, toqueOtro = 0
    for (let k = 0; k < reg.length; k++) {
      const p = reg[k]
      for (const q of vec(p, p % W)) {
        if (cand[q]) { if (lab[q] < 0) { lab[q] = i; reg.push(q) } } else if (opaco(q)) toqueOpaco++; else toqueOtro++
      }
    }
    const enc = toqueOpaco / Math.max(1, toqueOpaco + toqueOtro)
    if (reg.length > 400) informe.push({ px: reg.length, encierro: +enc.toFixed(2) })
    if (enc < ENC || reg.length < 30) continue
    for (const p of reg) { C[p * 4] = S[p * 3]; C[p * 4 + 1] = S[p * 3 + 1]; C[p * 4 + 2] = S[p * 3 + 2]; C[p * 4 + 3] = 255 }
    recuperados += reg.length
  }
  await sharp(C, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out)
  console.log(JSON.stringify({ src: src.split('/').pop(), recuperados, regiones: informe.sort((x, y) => y.px - x.px).slice(0, 8) }))
})()
