// ¿Qué tinta puede llevar el gesto? Debe cumplir DOS cosas a la vez, no una:
//   legibilidad  → >= 4.5:1 contra los píxeles reales del plate bajo su caja
//   separación   → >= 1.3 contra la tinta del titular, o las dos voces se leen como una mancha
// Se mide sobre la caja real donde va a caer el gesto en cada pieza.
import path from 'node:path'
import { componer, medirZona, hexLum, ratio } from './capas.mjs'
import { piezas, piezas2, piezas3, piezas4, piezasG, piezasG2, piezasV42 } from '../brief/matriz.mjs'
import { axisAdvertising, axisBrandRamp } from '@efeoncepro/axis-tokens'

const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const C = axisAdvertising.color
const PALETA = {
  blanco: C.inkOnDark, celeste: C.softOnDark,
  azulClaro: axisBrandRamp.greenhouse.primary[200], azulMedio: axisBrandRamp.greenhouse.primary[300],
  tealClaro: axisBrandRamp.greenhouse.secondary[300], teal: axisBrandRamp.greenhouse.secondary[500],
  lima: C.growthOnDark, naranja: C.accentSurface,
  navy: C.stableDarkField, naranjaSobreClaro: C.accentInkOnLight, tintaClara: C.inkOnLight
}

const TODAS = [...piezas, ...piezas2, ...piezas3, ...piezas4, ...piezasG, ...piezasG2, ...piezasV42]

for (const id of process.argv.slice(2)) {
  const pieza = TODAS.find(p => p.id === id)
  const plate = path.resolve(RUN, pieza.plate)
  const { W, H, informe } = await componer({ pieza, plate })
  const gesto = informe.find(c => c.id === 'gesto')
  const titular = informe.find(c => c.id === 'titular')

  if (!gesto) { console.log(`${id}: sin gesto`); continue }
  const box = gesto.cajaPx
  const tintaTitular = pieza.campo === 'claro' ? C.inkOnLight : C.inkOnDark

  console.log(`\n${id}  (campo ${pieza.campo} · titular ${tintaTitular})`)
  console.log('  tinta             legibilidad   separación   veredicto')
  for (const [nombre, hex] of Object.entries(PALETA)) {
    const z = await medirZona(plate, box, hex, W, H)
    const sep = ratio(hexLum(tintaTitular), hexLum(hex))
    const ok = z.contraste >= 4.5 && sep >= 1.3

    console.log(`  ${nombre.padEnd(18)}${String(z.contraste).padStart(6)}       ${String(sep).padStart(6)}      ${ok ? '✓ sirve' : z.contraste < 4.5 ? '✗ no se lee' : '✗ no separa'}`)
  }
}
