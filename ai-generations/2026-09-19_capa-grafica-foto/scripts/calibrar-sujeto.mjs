// Calibra el detector «control sobre el sujeto» contra casos que se pueden juzgar a ojo.
// DEBE marcar: V34 (puntero en la cara de Julio) · V47 (placa de Nexa sobre el panadero).
// NO debe marcar: V49 y V45 (cursor sobre pared vacía) · V61 (ídem).
// Sin esta calibración el umbral sería un número inventado.
import path from 'node:path'
import sharp from 'sharp'

const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(RUN, 'out')
const { variantes } = JSON.parse((await import('node:fs')).readFileSync(path.join(OUT, 'qa.json'), 'utf8'))

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const mapa = async (file, W, H, celdas, percentil, dilatar) => {
  const ancho = 320
  const alto = Math.max(1, Math.round((H / W) * ancho))
  const { data } = await sharp(file).resize({ width: ancho, height: alto, fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  const cw = Math.max(1, Math.floor(ancho / celdas))
  const ch = Math.max(1, Math.floor(alto / celdas))
  const rejilla = []

  for (let cy = 0; cy < celdas; cy++) {
    for (let cx = 0; cx < celdas; cx++) {
      let g = 0
      let n = 0

      for (let y = cy * ch; y < (cy + 1) * ch && y < alto - 1; y++) {
        for (let x = cx * cw + 1; x < (cx + 1) * cw && x < ancho; x++) { g += Math.abs(ls[y * ancho + x] - ls[y * ancho + x - 1]); n++ }
      }
      rejilla.push({ x0: (cx * cw) / ancho, x1: ((cx + 1) * cw) / ancho, y0: (cy * ch) / alto, y1: ((cy + 1) * ch) / alto, detalle: n ? g / n : 0 })
    }
  }
  const orden = [...rejilla].map(c => c.detalle).sort((a, b) => b - a)
  const umbral = orden[Math.floor(orden.length * percentil)]
  const caliente = new Set()

  rejilla.forEach((c, i) => { if (c.detalle >= umbral) caliente.add(i) })
  if (!dilatar) return [...caliente].map(i => rejilla[i])
  const exp = new Set()

  for (const i of caliente) {
    const cx = i % celdas
    const cy = Math.floor(i / celdas)

    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx
      const ny = cy + dy

      if (nx >= 0 && nx < celdas && ny >= 0 && ny < celdas) exp.add(ny * celdas + nx)
    }
  }

  return [...exp].map(i => rejilla[i])
}

const CASOS = [
  ['V34-169-enfasis-decide', 'DEBE marcar'], ['V47-45-enfasis-escala', 'DEBE marcar'],
  ['V49-45-enfasis-guttery', 'no marcar'], ['V45-45-enfasis-local', 'no marcar'],
  ['V61-45-brackets', 'no marcar'], ['V11-916-caja-local', 'no marcar']
]

const fraccionSobreSujeto = (cajas, celdas, W, H) => {
  let peor = 0

  for (const caja of cajas) {
    const area = Math.max(1, (caja.right - caja.left) * (caja.bottom - caja.top))
    let inv = 0

    for (const c of celdas) {
      const w = Math.min(caja.right, c.x1 * W) - Math.max(caja.left, c.x0 * W)
      const h = Math.min(caja.bottom, c.y1 * H) - Math.max(caja.top, c.y0 * H)

      if (w > 0 && h > 0) inv += w * h
    }
    peor = Math.max(peor, inv / area)
  }

  return Math.round(peor * 100) / 100
}

console.log('config                     ' + CASOS.map(([id]) => id.slice(0, 10).padEnd(12)).join(''))
for (const [pct, dil] of [[0.12, true], [0.08, true], [0.05, true], [0.05, false], [0.10, false]]) {
  const fila = []

  for (const [id] of CASOS) {
    const v = variantes.find(x => x.id === id)
    const s2 = v.capas.find(c => c.tipo === 'seleccion')
    const [W, H] = v.lienzo.split('×').map(Number)
    const celdas = await mapa(path.resolve(RUN, v.plateRuta), W, H, 16, pct, dil)

    fila.push(String(fraccionSobreSujeto(s2.evidencia.cajasDeControl ?? [], celdas, W, H)).padEnd(12))
  }
  console.log(`pct ${pct} dilatar ${String(dil).padEnd(6)}  ` + fila.join(''))
}
console.log('\nesperado:                  ALTO        ALTO        bajo        bajo        bajo        bajo')
