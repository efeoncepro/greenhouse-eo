// ¿Dónde puede vivir el TRAZO de una caja de selección en este plate?
// El canon: «los controles (trazo #a6cdf5, tiradores blancos) están diseñados para fondo oscuro y
// desaparecen sobre claro: el fondo bajo la selección debe ser oscuro por escenografía de la imagen».
// Se barren cajas candidatas y se mide la banda del perímetro contra el trazo. Piso 3:1 (WCAG para
// elementos gráficos). Lo que pasa es dónde el trazo se ve; si ahí no hay objeto con sentido, esa
// pieza no lleva caja sobre objeto.
import path from 'node:path'
import sharp from 'sharp'

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const L = h => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16))
const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100
const TRAZO = L('#a6cdf5')

const file = process.argv[2]
const { width: W, height: H } = await sharp(file).metadata()
const ancho = 0.22
const alto = 0.14

console.log(`${path.basename(file)} ${W}×${H} · caja candidata ${ancho}×${alto} · trazo #a6cdf5, piso 3:1\n`)
console.log('     ' + [0.05, 0.2, 0.35, 0.5, 0.65].map(x => `x${x.toFixed(2)}`.padStart(7)).join(''))
for (let y = 0.05; y <= 0.82; y += 0.07) {
  const fila = []

  for (const x of [0.05, 0.2, 0.35, 0.5, 0.65]) {
    const caja = { left: x * W, top: y * H, right: (x + ancho) * W, bottom: (y + alto) * H }
    const g = Math.max(6, (caja.bottom - caja.top) * 0.08)
    const bandas = [
      { left: caja.left, right: caja.right, top: caja.top - g, bottom: caja.top + g },
      { left: caja.left, right: caja.right, top: caja.bottom - g, bottom: caja.bottom + g }
    ]
    let peor = Infinity

    for (const b of bandas) {
      const left = Math.max(0, Math.floor(b.left))
      const top = Math.max(0, Math.floor(b.top))
      const width = Math.max(1, Math.min(W - left, Math.ceil(b.right - b.left)))
      const height = Math.max(1, Math.min(H - top, Math.ceil(b.bottom - b.top)))
      const { data } = await sharp(file).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const ls = []

      for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
      ls.sort((a, b2) => a - b2)
      peor = Math.min(peor, ratio(TRAZO, ls[Math.floor(ls.length * 0.98)]))
    }
    fila.push((peor >= 3 ? `${peor}✓` : `${peor}`).padStart(7))
  }
  console.log(`y${y.toFixed(2)}` + fila.join(''))
}
