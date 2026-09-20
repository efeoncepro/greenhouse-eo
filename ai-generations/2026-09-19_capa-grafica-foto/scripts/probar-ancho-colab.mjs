// ¿Cuánto hay que estrechar el titular para que quepa la placa del colaborador?
// El canon lo dice en palabras —«con dos colaboradores el aire lateral se paga dos veces»— y acá se
// mide: la placa vive FUERA de la caja, así que necesita lienzo libre al costado de la palabra.
import path from 'node:path'
import { componer } from './capas.mjs'
import * as M from '../brief/matriz.mjs'

const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TODAS = [...M.piezas, ...M.piezas2, ...M.piezas3, ...M.piezas4, ...M.piezasG, ...M.piezasG2]

for (const id of process.argv.slice(2)) {
  const base = TODAS.find(p => p.id === id)
  const plate = path.resolve(RUN, base.plate)
  const fila = []

  for (const ancho of [0.58, 0.5, 0.44, 0.38, 0.32, 0.26]) {
    const p = JSON.parse(JSON.stringify(base))

    p.capas[0].ajuste.objetivo = ancho
    try {
      const { informe } = await componer({ pieza: p, plate })
      const s = informe.find(c => c.tipo === 'seleccion')

      fila.push(`${ancho}${s.pasa ? '✓' : '✗'}`)
    } catch { fila.push(`${ancho}!`) }
  }
  console.log(id.padEnd(26) + fila.join('  '))
}
