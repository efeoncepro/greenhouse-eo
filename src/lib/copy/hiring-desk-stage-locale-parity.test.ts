import { describe, expect, it } from 'vitest'

import { hiringDesk as enUS } from './dictionaries/en-US/hiringDesk'
import { hiringDesk as esCL } from './dictionaries/es-CL/hiringDesk'
import { HIRING_APPLICATION_STAGES } from '@/types/hiring'

/**
 * TASK-1754 — `en-US` tiene que NOMBRAR sus etapas, no heredarlas.
 *
 * `dictionaries/en-US/hiringDesk.ts` arma `pipeline` con `...esCL.pipeline` y durante meses
 * nunca sobreescribió `stages`: un operador con locale `en-US` leía el tablero completo en
 * inglés y las seis columnas en castellano. No había línea que borrar, así que ningún diff lo
 * mostraba — sólo aparecía abriendo el desk en inglés.
 *
 * El test se apoya en la MECÁNICA del defecto, no en las palabras: si alguien vuelve a
 * heredar por spread, las dos claves quedan siendo el MISMO objeto, y eso se detecta sin
 * escribir a mano ninguna traducción esperada. Un test que enumerara los seis nombres en
 * inglés se estaría probando a sí mismo.
 */
describe('Hiring Desk — nombres de etapa por locale (TASK-1754)', () => {
  it('en-US redefine `stages` en vez de heredarlo de es-CL', () => {
    expect(
      enUS.pipeline.stages,
      'en-US volvió a heredar `stages` por spread: el desk en inglés muestra las columnas en castellano',
    ).not.toBe(esCL.pipeline.stages)
  })

  it('cada etapa del dominio tiene nombre en los dos diccionarios', () => {
    // Una etapa sin nombre visible es una columna sin título en pantalla. El tipo
    // `Record<HiringApplicationStage, string>` (Slice A) ya lo exige en compilación; acá se
    // fija también en runtime, porque los diccionarios se serializan al cliente.
    for (const stage of HIRING_APPLICATION_STAGES) {
      expect(esCL.pipeline.stages[stage], `es-CL no nombra la etapa "${stage}"`).toBeTruthy()
      expect(enUS.pipeline.stages[stage], `en-US no nombra la etapa "${stage}"`).toBeTruthy()
    }
  })

  it('sólo coinciden las etiquetas que son la misma palabra en ambos idiomas', () => {
    // `Sourced` y `Screening` son anglicismos que el desk en castellano ya usa tal cual, así
    // que coincidir es correcto. Cualquier OTRA coincidencia significa castellano filtrándose
    // al inglés — que es la forma parcial del mismo defecto y la que un spread arreglado a
    // medias produce.
    const legitimamenteIguales = new Set(['Sourced', 'Screening'])

    const coincidencias = HIRING_APPLICATION_STAGES.filter(
      stage => esCL.pipeline.stages[stage] === enUS.pipeline.stages[stage],
    ).map(stage => `${stage}="${enUS.pipeline.stages[stage]}"`)

    const inesperadas = coincidencias.filter(
      entry => !legitimamenteIguales.has(entry.split('="')[1].slice(0, -1)),
    )

    expect(inesperadas, `castellano filtrándose al desk en inglés: ${inesperadas.join(', ')}`).toEqual([])
  })
})
