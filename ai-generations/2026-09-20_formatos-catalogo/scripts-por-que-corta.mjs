// El validador canónico dice hasta dónde llega la reserva, pero no POR QUÉ se corta.
// Replico su barrido de columnas (16:9: x 0.06→0.48, alto 0.05→0.95) e imprimo, tira por tira,
// contraste de cada tinta y ocupación. Así se ve si corta por contraste o por textura.
import sharp from 'sharp'

const lum = (r, g, b) => { const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const hexLum = h => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16))
const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100
const TINTA = { blanca: '#ffffff', oscura: '#00284d' }

for (const file of process.argv.slice(2)) {
  const { width: W, height: H } = await sharp(file).metadata()
  console.log('\n═══', file.split('/').pop())
  console.log('  x      lum p2   lum p98  ocupación  blanca  navy')
  for (let x = 0.06; x < 0.48; x += 0.04) {
    const left = Math.round(x * W); const top = Math.round(0.05 * H)
    const w = Math.round(0.04 * W); const h = Math.round(0.9 * H)
    const data = await sharp(file).extract({ left, top, width: w, height: h }).removeAlpha().raw().toBuffer()
    const ls = []
    for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
    const ord = [...ls].sort((a, b) => a - b)
    const p2 = ord[Math.floor(ord.length * 0.02)]; const p98 = ord[Math.floor(ord.length * 0.98)]
    let g = 0, n = 0
    for (let y = 0; y < h; y++) for (let i = 1; i < w; i++) { g += Math.abs(ls[y * w + i] - ls[y * w + i - 1]); n++ }
    const oc = g / n
    const cb = ratio(hexLum(TINTA.blanca), p98); const cn = ratio(hexLum(TINTA.oscura), p2)
    console.log(
      ' ', x.toFixed(2), p2.toFixed(3).padStart(8), p98.toFixed(3).padStart(9), oc.toFixed(4).padStart(10),
      (cb.toFixed(2) + (cb >= 4.5 ? '✓' : '✗')).padStart(9), (cn.toFixed(2) + (cn >= 4.5 ? '✓' : '✗')).padStart(9),
      oc < 0.005 ? '' : ' ← ocupación'
    )
  }
}
