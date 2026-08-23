import { describe, expect, it, vi } from 'vitest'

import { HIRING_APPLICATION_STAGES } from '@/types/hiring'
import { LANES, stagesOfLane } from './PipelineDeskView'

vi.mock('server-only', () => ({}))

/**
 * TASK-1754 — invariantes del tablero que el tipo NO puede expresar.
 *
 * Este archivo tenía cuatro pruebas y ahora tiene dos, y la resta es el resultado del slice:
 * las dos que se fueron —«cada carril escribe la etapa que le da nombre» y «la etapa que da
 * nombre pertenece al carril»— vigilaban una divergencia entre `titleStage` y `destination` que
 * ya no existe, porque el carril declara UN solo campo. Un invariante que se vuelve
 * irrepresentable no necesita guardián: mantenerlo enseñaría que el defecto sigue siendo
 * posible.
 *
 * Las dos que quedan no son residuo del parche. Dependen del CONJUNTO de carriles, no de la
 * forma de uno, así que ningún tipo las alcanza — y la primera es la que evita el mismo daño
 * silencioso por otra vía: una etapa que ningún carril agrupa manda la tarjeta a la primera
 * columna (`?? 'inbox'`) sin decirlo. La postulación sigue existiendo en la base y nadie la ve
 * donde debería.
 *
 * El archivo se borra cuando el contract (Slice F) retire los literales y `absorbs` quede
 * vacía en todos los carriles: ahí «una etapa, un carril» pasa a ser cierto por construcción.
 * Hasta entonces sigue siendo una afirmación sobre datos, no sobre tipos.
 */
describe('contrato de carriles del pipeline', () => {
  it('ninguna etapa del dominio queda fuera del tablero', () => {
    const cubiertas = new Set(LANES.flatMap(stagesOfLane))

    for (const stage of HIRING_APPLICATION_STAGES) {
      expect(cubiertas.has(stage), `la etapa "${stage}" no aparece en ningún carril`).toBe(true)
    }
  })

  it('ninguna etapa aparece en dos carriles', () => {
    // Si una etapa vive en dos columnas, la tarjeta se duplica o el conteo miente.
    const vistas = new Set<string>()

    for (const lane of LANES) {
      for (const stage of stagesOfLane(lane)) {
        expect(vistas.has(stage), `la etapa "${stage}" aparece en más de un carril`).toBe(false)
        vistas.add(stage)
      }
    }
  })
})
