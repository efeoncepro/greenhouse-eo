// ¿Qué plate aloja una banda limpia que CUBRA un rango pedido? Recorre todo el archivo de plates.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const INKS = { blanca: lum(255, 255, 255), oscura: lum(0, 40, 77) }
const NEED = { from: Number(process.argv[2]), to: Number(process.argv[3]) }
const root = process.argv[4]

const files = []
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name)

    if (e.isDirectory()) walk(f)
    else if (/\.png$/i.test(e.name) && !/-final\.png$/i.test(e.name)) files.push(f)
  }
}

walk(root)
console.log(`Buscando banda limpia que cubra ${NEED.from}–${NEED.to} · ${files.length} archivos\n`)

for (const file of files) {
  const meta = await sharp(file).metadata()
  const W = meta.width
  const H = meta.height

  if (Math.abs(W / H - 0.8) > 0.02) continue
  const left = Math.round(W * 0.07)
  const width = Math.round(W * 0.62)

  for (const [name, inkL] of Object.entries(INKS)) {
    let ok = true

    for (let y = NEED.from; y < NEED.to - 1e-9 && ok; y += 0.02) {
      const t = Math.round(H * y)
      const height = Math.min(Math.round(H * 0.02), H - t)
      const { data } = await sharp(file).extract({ left, top: t, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const ls = []

      for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
      const sorted = [...ls].sort((a, b) => a - b)
      const bg = inkL > 0.5 ? sorted[Math.floor(sorted.length * 0.98)] : sorted[Math.floor(sorted.length * 0.02)]
      let g = 0
      let n = 0

      for (let r = 0; r < height; r++) for (let c = 1; c < width; c++) { g += Math.abs(ls[r * width + c] - ls[r * width + c - 1]); n++ }
      if (!(ratio(inkL, bg) >= 4.5 && g / n < 0.005)) ok = false
    }
    if (ok) console.log(`  SÍ · ${name.padEnd(8)} ${path.relative(root, file)}`)
  }
}
