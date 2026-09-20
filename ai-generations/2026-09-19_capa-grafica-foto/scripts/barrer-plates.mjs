// Barrido de plates: busca la banda limpia MÁS PROFUNDA de la columna de texto, esté donde esté.
// Por banda de 2% de alto en x 0.07–0.69 exige contraste >= 4.5:1 contra la tinta y ocupación
// (gradiente medio) < 0.005; luego reporta la racha contigua más alta. No asume que empiece arriba.
import path from 'node:path'
import sharp from 'sharp'

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100
const WHITE = lum(255, 255, 255)
const DARK = lum(0, 40, 77)
const STEP = 0.02

const scan = async file => {
  const meta = await sharp(file).metadata()
  const W = meta.width
  const H = meta.height
  const left = Math.round(W * 0.07)
  const width = Math.round(W * 0.62)
  const bands = []

  for (let y = 0; y < 1 - 1e-9; y += STEP) {
    const top = Math.round(H * y)
    const height = Math.min(Math.round(H * STEP), H - top)

    if (height < 2) break
    const { data } = await sharp(file).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const ls = []

    for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
    const sorted = [...ls].sort((a, b) => a - b)
    let g = 0
    let n = 0

    for (let r = 0; r < height; r++) for (let c = 1; c < width; c++) { g += Math.abs(ls[r * width + c] - ls[r * width + c - 1]); n++ }
    bands.push({ y, p2: sorted[Math.floor(sorted.length * 0.02)], p98: sorted[Math.floor(sorted.length * 0.98)], busy: g / n })
  }

  const best = ink => {
    let run = null
    let top = null

    for (const b of bands) {
      const ok = (ink === 'blanca' ? ratio(WHITE, b.p98) : ratio(DARK, b.p2)) >= 4.5 && b.busy < 0.005

      if (ok) { if (top === null) top = b.y } else if (top !== null) {
        const cand = { from: top, to: b.y, h: b.y - top }

        if (!run || cand.h > run.h) run = cand
        top = null
      }
    }
    if (top !== null) {
      const cand = { from: top, to: 1, h: 1 - top }

      if (!run || cand.h > run.h) run = cand
    }

    return run ?? { from: 0, to: 0, h: 0 }
  }

  return { blanca: best('blanca'), oscura: best('oscura'), size: `${W}×${H}` }
}

console.log('plate'.padEnd(34) + 'tamaño'.padEnd(11) + 'banda blanca'.padEnd(20) + 'banda oscura')
for (const file of process.argv.slice(2)) {
  const r = await scan(file)
  const fmt = b => (b.h ? `${b.from.toFixed(2)}–${b.to.toFixed(2)} (${b.h.toFixed(2)})` : '—')

  console.log(path.basename(file).padEnd(34) + r.size.padEnd(11) + fmt(r.blanca).padEnd(20) + fmt(r.oscura))
}
