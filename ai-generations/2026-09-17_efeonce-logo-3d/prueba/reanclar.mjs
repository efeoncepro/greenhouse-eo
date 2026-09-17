// Re-anclaje: la escena y sus sombras vienen del modelo; el logo se reemplaza por el render exacto,
// escalado y ubicado sobre la caja donde el modelo lo dejó, con el color igualado a la luz de esa escena.
// Uso: node prueba/reanclar.mjs <escena> <render> <salida>
import sharp from 'sharp'
const [, , ESCENA, RENDER, OUT, ROI] = process.argv
// ROI opcional "x,y,w,h": zona donde se pegó el logo en la base, ampliada; evita que un reflejo lejano agrande la caja.
const roi = ROI ? ROI.split(',').map(Number) : null
const esc = await sharp(ESCENA).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = esc.info
const esNavy = (r, g, b) => b > 60 && b > r + 25 && g < r + 70 && b < 200 && r < 120
// Componente conexo más grande de píxeles navy: evita que un reflejo o una sombra azulada agrande la caja.
const mask = new Uint8Array(W * H)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (roi && (x < roi[0] || y < roi[1] || x > roi[0] + roi[2] || y > roi[1] + roi[3])) continue
  const i = y * W + x, p = i * C
  if (esNavy(esc.data[p], esc.data[p + 1], esc.data[p + 2])) mask[i] = 1
}
const visto = new Uint8Array(W * H)
let mejor = null
for (let s0 = 0; s0 < W * H; s0++) {
  if (!mask[s0] || visto[s0]) continue
  const pila = [s0]; visto[s0] = 1; const comp = []
  while (pila.length) {
    const i = pila.pop(); comp.push(i); const x = i % W
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= W * H || Math.abs((j % W) - x) > 1) continue
      if (mask[j] && !visto[j]) { visto[j] = 1; pila.push(j) }
    }
  }
  // Las letras son componentes separados: se unen todos los grandes (>800 px) y se descartan reflejos sueltos.
  if (comp.length > 800) mejor = mejor ? mejor.concat(comp) : comp
}
let x0 = W, y0 = H, x1 = 0, y1 = 0, sum = [0, 0, 0], n = 0
for (const i of mejor) {
  const x = i % W, y = (i / W) | 0, p = i * C
  if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
  sum[0] += esc.data[p]; sum[1] += esc.data[p + 1]; sum[2] += esc.data[p + 2]; n++
}
const medEsc = sum.map(v => v / n)
const obj0 = await sharp(RENDER).trim({ threshold: 1 }).resize({ width: x1 - x0 + 1, height: y1 - y0 + 1, fit: 'fill' }).toBuffer()
// Igualar el color medio del objeto al que el modelo dio en esa escena (misma luz, mismo balance).
const o = await sharp(obj0).raw().toBuffer({ resolveWithObject: true })
let s2 = [0, 0, 0], m = 0
for (let i = 0; i < o.info.width * o.info.height; i++) { const p = i * 4; if (o.data[p + 3] < 200) continue; s2[0] += o.data[p]; s2[1] += o.data[p + 1]; s2[2] += o.data[p + 2]; m++ }
const medObj = s2.map(v => v / m)
const k = medEsc.map((v, i) => v / medObj[i])
const ajustado = await sharp(obj0).linear(k, [0, 0, 0]).toBuffer()
await sharp(ESCENA).composite([{ input: ajustado, left: x0, top: y0 }]).png().toFile(OUT)
console.log(JSON.stringify({ caja: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], medEsc: medEsc.map(Math.round), medObj: medObj.map(Math.round) }))
