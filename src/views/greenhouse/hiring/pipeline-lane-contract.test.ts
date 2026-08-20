import { describe, expect, it, vi } from 'vitest'

import { HIRING_APPLICATION_STAGES } from '@/types/hiring'
import { LANES } from './PipelineDeskView'

vi.mock('server-only', () => ({}))

/**
 * TASK-1754 — el tablero escribe la etapa que muestra.
 *
 * El 2026-08-19 la columna "Evaluación" tomaba su nombre de `shortlisted` —la etapa que la
 * automatización de assessment vigila— y al soltar una tarjeta escribía `qualified`. Catorce
 * vacantes tenían su política configurada y ninguna disparaba. Dos candidatas reales pasaron por
 * esa columna sin recibir su test, y el fallo NO dejaba rastro: una vacante sin política y una
 * cuya automatización apunta al vacío se ven idénticas en pantalla.
 *
 * El destino estaba DENTRO del carril, así que un invariante de pertenencia lo habría dejado
 * pasar. El invariante correcto es más fuerte: lo que el operador lee es lo que el sistema escribe.
 */

describe('contrato de carriles del pipeline', () => {
  it('cada carril escribe la etapa que le da nombre', () => {
    for (const lane of LANES) {
      expect(lane.destination, `el carril "${lane.id}" se titula desde "${lane.titleStage}" y escribe "${lane.destination}"`)
        .toBe(lane.titleStage)
    }
  })

  it('la etapa que da nombre pertenece al carril', () => {
    for (const lane of LANES) {
      expect(lane.stages).toContain(lane.titleStage)
    }
  })

  it('ninguna etapa del dominio queda fuera del tablero', () => {
    // Una etapa que ningún carril contiene es una postulación que desaparece de la vista: sigue
    // existiendo en la base y nadie la ve. Es la misma clase de fallo silencioso.
    const cubiertas = new Set(LANES.flatMap((lane) => lane.stages))

    for (const stage of HIRING_APPLICATION_STAGES) {
      expect(cubiertas.has(stage), `la etapa "${stage}" no aparece en ningún carril`).toBe(true)
    }
  })

  it('ninguna etapa aparece en dos carriles', () => {
    // Si una etapa vive en dos columnas, la tarjeta se duplica o el conteo miente.
    const vistas = new Set<string>()

    for (const lane of LANES) {
      for (const stage of lane.stages) {
        expect(vistas.has(stage), `la etapa "${stage}" aparece en más de un carril`).toBe(false)
        vistas.add(stage)
      }
    }
  })
})
