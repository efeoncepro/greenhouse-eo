// Mide un plate limpio por bandas horizontales dentro de la columna de texto:
// tono (p2/p50/p98), contraste contra tinta blanca y tinta oscura, y "ocupación" (gradiente medio).
// Sirve para saber hasta dónde baja de verdad la zona libre, en vez de confiar en el % declarado.
import path from 'node:path'
import sharp from 'sharp'

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100
const WHITE = lum(255, 255, 255)
const DARK = lum(0, 40, 77) // #00284d

const file = process.argv[2]
const x0f = Number(process.argv[3] ?? 0.07)
const x1f = Number(process.argv[4] ?? 0.69)
const step = Number(process.argv[5] ?? 0.05)

const img = sharp(file)
const meta = await img.metadata()
const W = meta.width
const H = meta.height
const left = Math.round(W * x0f)
const width = Math.round(W * (x1f - x0f))

console.log(`${path.basename(file)}  ${W}×${H}  columna x ${x0f}–${x1f} (${left}–${left + width}px)\n`)
console.log('banda        p2     p50    p98    blanco  oscuro  ocupación')

for (let y = 0; y < 1 - 1e-9; y += step) {
  const top = Math.round(H * y)
  const height = Math.min(Math.round(H * step), H - top)

  if (height < 2) break
  const { data } = await sharp(file).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  const sorted = [...ls].sort((a, b) => a - b)
  const p = q => sorted[Math.floor(sorted.length * q)]
  let grad = 0
  let n = 0

  for (let row = 0; row < height; row++) {
    for (let col = 1; col < width; col++) {
      grad += Math.abs(ls[row * width + col] - ls[row * width + col - 1])
      n++
    }
  }
  const busy = Math.round((grad / n) * 10000) / 10000

  console.log(
    `${y.toFixed(2)}-${(y + step).toFixed(2)}  ` +
    `${p(0.02).toFixed(3)}  ${p(0.5).toFixed(3)}  ${p(0.98).toFixed(3)}  ` +
    `${String(ratio(WHITE, p(0.98))).padEnd(7)} ${String(ratio(DARK, p(0.02))).padEnd(7)} ${busy}`
  )
}
