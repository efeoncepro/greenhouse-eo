// El umbral de calma del validador canónico (ocupacion < 0.005) mide el gradiente en luminancia
// LINEAL. Eso castiga estructuralmente a toda reserva CLARA: la misma textura física produce un
// salto de luminancia mucho mayor arriba que abajo de la escala, porque el ojo no es lineal.
// Lo compruebo midiendo lo mismo en L* (CIE), donde un paso vale lo mismo en cualquier nivel.
import sharp from 'sharp'

const lum = (r, g, b) => { const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const Lstar = Y => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y)

for (const file of process.argv.slice(2)) {
  const { width: W, height: H } = await sharp(file).metadata()
  const left = Math.round(0.06 * W); const top = Math.round(0.05 * H)
  const w = Math.round(0.36 * W); const h = Math.round(0.9 * H)
  const data = await sharp(file).extract({ left, top, width: w, height: h }).removeAlpha().raw().toBuffer()

  const Y = []; const L = []
  for (let i = 0; i < data.length; i += 3) { const y = lum(data[i], data[i + 1], data[i + 2]); Y.push(y); L.push(Lstar(y)) }

  let gY = 0, gL = 0, n = 0
  for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) { const i = y * w + x; gY += Math.abs(Y[i] - Y[i - 1]); gL += Math.abs(L[i] - L[i - 1]); n++ }
  const p50 = [...Y].sort((a, b) => a - b)[Math.floor(Y.length / 2)]

  console.log(
    file.split('/').pop().replace('.png', '').padEnd(34),
    'nivel L*', Lstar(p50).toFixed(0).padStart(3),
    '· gradiente Y', (gY / n).toFixed(4),
    (gY / n < 0.005 ? '✓' : '✗'), 'contra el umbral canónico',
    '· gradiente L*', (gL / n).toFixed(2).padStart(5)
  )
}
