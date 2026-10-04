import { describe, expect, it } from 'vitest'

import { consolidateMethodology } from './methodology'

// Las 9 líneas del plan congelado del canary de producción del 2026-10-04 (Berel, septiembre de 2026): la página «Cómo
// se midió» del A4 admite 8 y el render se rechazó. Agrupadas por origen son 7 y ninguna fecha se pierde.
const canary = [
  'Visibilidad orgánica: Google Search Console, corte al 29 de septiembre de 2026.',
  'Visibilidad orgánica: posiciones en buscadores, corte al 30 de septiembre de 2026.',
  'Visibilidad orgánica: tráfico orgánico estimado, corte al 3 de septiembre de 2026.',
  'Visibilidad orgánica: Google Analytics 4, corte al 4 de octubre de 2026.',
  'Visibilidad orgánica: Google Search Console, corte al 31 de agosto de 2026.',
  'Visibilidad orgánica: posiciones en buscadores, corte al 31 de agosto de 2026.',
  'Visibilidad orgánica: cola de trabajo SEO priorizada, corte al 3 de octubre de 2026.',
  'Visibilidad en motores de respuesta: Efeonce AEO Assessment, corte al 3 de septiembre de 2026.',
  'Visibilidad en motores de respuesta: Google Analytics 4, corte al 4 de octubre de 2026.'
]

describe('consolidateMethodology', () => {
  it('agrupa un origen con varias fechas de corte, en orden cronológico y sin perder ninguna', () => {
    const lines = consolidateMethodology(canary, 'es-CL')

    expect(lines).toHaveLength(7)
    expect(lines[0]).toBe('Visibilidad orgánica: Google Search Console, cortes al 31 de agosto y al 29 de septiembre de 2026.')
    expect(lines[1]).toBe('Visibilidad orgánica: posiciones en buscadores, cortes al 31 de agosto y al 30 de septiembre de 2026.')
    expect(lines).toContain('Visibilidad en motores de respuesta: Google Analytics 4, corte al 4 de octubre de 2026.')

    for (const line of canary) expect(lines.join(' ')).toContain(line.match(/al (\d+ de \p{L}+)/u)![1]!)
  })

  it('es idempotente: el planner la aplica al escribir y los mappers al componer', () => {
    const once = consolidateMethodology(canary, 'es-CL')

    expect(consolidateMethodology(once, 'es-CL')).toEqual(once)
  })

  it('con años distintos, cada fecha conserva el suyo', () => {
    expect(consolidateMethodology(['X: Y, corte al 31 de diciembre de 2025.', 'X: Y, corte al 31 de enero de 2026.'], 'es-CL')).toEqual([
      'X: Y, cortes al 31 de diciembre de 2025 y al 31 de enero de 2026.'
    ])
  })

  it('tres fechas se leen «al A, al B y al C»; una línea sin la forma esperada pasa tal cual y sin duplicar', () => {
    const lines = consolidateMethodology(
      [
        'X: Y, corte al 3 de octubre de 2026.',
        'X: Y, corte al 1 de agosto de 2026.',
        'X: Y, corte al 2 de septiembre de 2026.',
        'Las cifras provienen del snapshot sellado de la edición.',
        'Las cifras provienen del snapshot sellado de la edición.'
      ],
      'es-CL'
    )

    expect(lines).toEqual([
      'X: Y, cortes al 1 de agosto, al 2 de septiembre y al 3 de octubre de 2026.',
      'Las cifras provienen del snapshot sellado de la edición.'
    ])
  })
})
