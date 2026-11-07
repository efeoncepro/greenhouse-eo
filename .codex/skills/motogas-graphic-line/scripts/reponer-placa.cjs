// Repone la placa plateada como opaca en el recorte: dentro de la caja de la placa, los píxeles grises neutros
// (metal) y lo que encierran (logo, argolla) se vuelven opacos con el color de la imagen fuente.
// Uso: node reponer-placa.cjs <fuente.png> <recorte.png> <salida.png> x,y,w,h
const sharp = require('sharp')
;(async () => {
  const [src, cut, out, box] = process.argv.slice(2)
  const [bx, by, bw, bh] = box.split(',').map(Number)
  const a = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const b = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = a.info.width, S = a.data, C = b.data
  const m = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const p = (by + y) * W + bx + x
    const r = S[p * 3], g = S[p * 3 + 1], bb = S[p * 3 + 2], mx = Math.max(r, g, bb), mn = Math.min(r, g, bb)
    if (mx - mn < 26 && mx > 70 && mx < 250) m[y * bw + x] = 1
  }
  // máscara geométrica: por fila, del primer al último píxel de metal (la placa es una silueta simple,
  // así que el logo y la argolla quedan dentro), ensanchada 3 px para sumar el borde teñido por el pelo.
  const fuera = new Uint8Array(bw * bh).fill(1)
  for (let y = 0; y < bh; y++) {
    let a0 = -1, a1 = -1, cuenta = 0
    for (let x = 0; x < bw; x++) if (m[y * bw + x]) { if (a0 < 0) a0 = x; a1 = x; cuenta++ }
    if (cuenta < 8) continue
    for (let x = Math.max(0, a0 - 3); x <= Math.min(bw - 1, a1 + 3); x++) fuera[y * bw + x] = 0
  }
  let n = 0
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    if (fuera[y * bw + x]) continue
    const p = (by + y) * W + bx + x
    C[p * 4] = S[p * 3]; C[p * 4 + 1] = S[p * 3 + 1]; C[p * 4 + 2] = S[p * 3 + 2]; C[p * 4 + 3] = 255; n++
  }
  // alrededor de la placa (caja + 30 px): el pelo con color (tostado/café) que el recortador perdió vuelve a ser opaco.
  // El fondo es neutro (blanco o gris), así que no entra.
  const M = 30
  for (let y = Math.max(0, by - M); y < Math.min(a.info.height, by + bh + M); y++) for (let x = Math.max(0, bx - M); x < Math.min(W, bx + bw + M); x++) {
    const p = y * W + x
    const r = S[p * 3], g = S[p * 3 + 1], bb = S[p * 3 + 2]
    if (Math.max(r, g, bb) - Math.min(r, g, bb) > 34 && C[p * 4 + 3] < 255) { C[p * 4] = r; C[p * 4 + 1] = g; C[p * 4 + 2] = bb; C[p * 4 + 3] = 255; n++ }
  }
  await sharp(C, { raw: { width: W, height: a.info.height, channels: 4 } }).png().toFile(out)
  console.log(src.split('/').pop(), 'px placa', n)
})()
