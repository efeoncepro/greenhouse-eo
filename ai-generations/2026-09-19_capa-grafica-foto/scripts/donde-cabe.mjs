// ¿Dónde cabe de verdad un bloque de texto en este plate?
// Barre posiciones candidatas para una caja del tamaño pedido y reporta, por posición:
// contraste contra la tinta (píxel extremo) y OCUPACIÓN (gradiente medio = cuán movida está la zona).
// Un texto puede pasar contraste y aun así "desencajar" porque cae sobre una zona con detalle.
// Uso: node donde-cabe.mjs <plate> <anchoFrac> <altoFrac> <tintaHex>
import path from 'node:path'
import sharp from 'sharp'

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const hexLum = h => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16))
const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100

const [file, aF, hF, hex] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5] ?? '#cfe4fa']
const { width: W, height: H } = await sharp(file).metadata()
const bw = Math.round(W * aF)
const bh = Math.round(H * hF)
const inkL = hexLum(hex)

console.log(`${path.basename(file)} ${W}×${H} · caja ${bw}×${bh} · tinta ${hex}\n`)
console.log('x     y     contraste  ocupación')
for (let yf = 0.05; yf <= 0.9; yf += 0.05) {
  const line = []

  for (const xf of [0.055, 0.2, 0.42, 0.62]) {
    const left = Math.round(W * xf)
    const top = Math.round(H * yf)

    if (left + bw > W || top + bh > H) { line.push('—'); continue }
    const { data } = await sharp(file).extract({ left, top, width: bw, height: bh }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const ls = []

    for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
    const sorted = [...ls].sort((a, b) => a - b)
    const bg = inkL > 0.5 ? sorted[Math.floor(sorted.length * 0.98)] : sorted[Math.floor(sorted.length * 0.02)]
    let g = 0
    let n = 0

    for (let r = 0; r < bh; r++) for (let c = 1; c < bw; c++) { g += Math.abs(ls[r * bw + c] - ls[r * bw + c - 1]); n++ }
    const cr = ratio(inkL, bg)
    const oc = Math.round((g / n) * 1000) / 1000

    line.push(`${xf.toFixed(3)} ${String(cr).padStart(6)} ${String(oc).padStart(6)}${cr >= 4.5 && oc < 0.006 ? ' ✓' : '  '}`)
  }
  console.log(`y ${yf.toFixed(2)} │ ${line.join(' │ ')}`)
}
