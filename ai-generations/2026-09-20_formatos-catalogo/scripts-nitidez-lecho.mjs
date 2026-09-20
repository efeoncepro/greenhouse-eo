// Medir DESENFOQUE del lecho, que es lo que el chequeo actual dice medir y no mide.
//
// La sesión de fotografía encontró el límite: en L* el lecho no disuelto es indistinguible
// de los disueltos, y en Y el bueno da 0,0035 contra 0,0043 el malo — 20% de margen, ruido.
// Ese chequeo nunca midió desenfoque; separaba por casualidad. Lo dejó marcado como señal
// débil y pidió otra métrica. Ésta es esa métrica.
//
// Por qué un gradiente no sirve: un lecho disuelto puede tener una rampa suave de luz (mucho
// gradiente) y CERO detalle fino. Uno nítido tiene las dos cosas. El gradiente promedio las
// confunde. Lo que distingue desenfoque es en qué ESCALA vive la energía.
//
// Métrica: energía fina (σ=2) dividida por energía gruesa (σ=16), en L*.
//   · disuelto → casi nada en σ=2, algo en σ=16 → razón BAJA
//   · nítido   → detalle en ambas escalas → razón ALTA
// Es invariante al nivel (L*) y al contraste general (es un cociente).
//
// Verdad conocida, misma toma y mismo formato, todo constante salvo el verbatim del lecho:
//   ola1 y ola2 SIN la frase → nítidas · ola3 y ola4 CON la frase → disueltas
import sharp from 'sharp'

const lum = (r, g, b) => { const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const Lstar = Y => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y)

const LECHO = { '16:9': 0.16, '4:5': 0.18, '9:16': 0.22, '1:1': 0.18 }

const medir = async file => {
  const { width: W, height: H } = await sharp(file).metadata()
  const r = W / H
  const frac = Math.abs(r - 1.7778) < 0.03 ? LECHO['16:9'] : Math.abs(r - 0.8) < 0.02 ? LECHO['4:5'] : Math.abs(r - 0.5625) < 0.02 ? LECHO['9:16'] : LECHO['1:1']
  const top = Math.round(H * (1 - frac))
  const reg = { left: 0, top, width: W, height: H - top }

  const aL = async blur => {
    let p = sharp(file).extract(reg).greyscale()
    if (blur) p = p.blur(blur)
    const d = await p.raw().toBuffer()
    return Float64Array.from(d, v => Lstar(lum(v, v, v)))
  }

  const [base, fino, grueso] = await Promise.all([aL(0), aL(2), aL(16)])
  let ef = 0, eg = 0
  for (let i = 0; i < base.length; i++) { ef += Math.abs(base[i] - fino[i]); eg += Math.abs(base[i] - grueso[i]) }

  return { fina: ef / base.length, gruesa: eg / base.length, razon: ef / Math.max(eg, 1e-6) }
}

const CASOS = [
  ['ola1/T19-picado-60-sobre-la-obra-169-plate.png', 'SIN la frase → nítido'],
  ['ola2/T19-picado-60-sobre-la-obra-169-plate.png', 'SIN lecho (lo quité yo) → nítido'],
  ['ola3/T19-picado-60-sobre-la-obra-169-plate.png', 'CON la frase → disuelto'],
  ['ola4-claro/T19-picado-169-claro.png', 'CON la frase → disuelto']
]

console.log('  energía fina (σ=2) / energía gruesa (σ=16), en L*\n')
const filas = []
for (const [p, verdad] of CASOS) {
  const m = await medir('ai-generations/2026-09-20_formatos-catalogo/rondas/' + p)
  filas.push({ p, verdad, ...m })
  console.log(' ', p.split('/')[0].padEnd(10), 'fina', m.fina.toFixed(3).padStart(6), '· gruesa', m.gruesa.toFixed(3).padStart(6), '· RAZÓN', m.razon.toFixed(3).padStart(6), '·', verdad)
}

const nit = filas.filter(f => f.verdad.includes('nítido')).map(f => f.razon)
const dis = filas.filter(f => f.verdad.includes('disuelto')).map(f => f.razon)
const peorNitido = Math.min(...nit); const mejorDisuelto = Math.max(...dis)
console.log(
  '\n  disueltos hasta', mejorDisuelto.toFixed(3), '· nítidos desde', peorNitido.toFixed(3),
  mejorDisuelto < peorNitido ? `\n  ✓ SEPARA · hueco ${(peorNitido / mejorDisuelto).toFixed(2)}×` : '\n  ✗ NO separa: la métrica no sirve'
)
