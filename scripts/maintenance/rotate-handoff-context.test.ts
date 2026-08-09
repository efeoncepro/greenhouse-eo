import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { detectDatedSections } from './rotate-handoff-context.mjs'

/**
 * Este test existe porque la rotación de contexto se quedó ciega DOS veces por la misma razón: el
 * patrón de secciones estaba pegado a una convención de títulos que después derivó.
 *
 * La primera vez (`^## Sesi[oó]n…`) degradó mal pero degradó: decía "nada que archivar" mientras el
 * gate gritaba que sobraban 400 líneas. La segunda vez (`^## …fecha…` contra un archivo que ya usaba
 * `###`) fue peor — `matches[0].index` sobre un array vacío, `TypeError`, y la herramienta que el
 * propio gate te manda a correr muere sin decir por qué. Rotar a mano después de eso es cómo se
 * corrompen los marcadores de integridad de los shards.
 *
 * El contrato que se fija acá no es "el nivel es 3": es que el nivel se DESCUBRE.
 */
describe('detectDatedSections — la rotación no se casa con un nivel de heading', () => {
  it('descubre el nivel dominante en vez de asumirlo', () => {
    const nivelDos = ['# Título', '', '## Algo (2026-01-01)', 'cuerpo', '', '## Otro (2026-01-02)', 'cuerpo'].join('\n')
    const nivelTres = ['# Título', '', '### Algo (2026-01-01)', 'cuerpo', '', '### Otro (2026-01-02)', 'cuerpo'].join('\n')

    expect(detectDatedSections(nivelDos).level).toBe(2)
    expect(detectDatedSections(nivelDos).matches).toHaveLength(2)
    expect(detectDatedSections(nivelTres).level).toBe(3)
    expect(detectDatedSections(nivelTres).matches).toHaveLength(2)
  })

  it('con niveles mezclados gana el que más secciones produce', () => {
    const mezclado = [
      '# Título',
      '',
      '## Sección vieja (2026-01-01)',
      'cuerpo',
      '',
      '### Entrada A (2026-02-01)',
      'cuerpo',
      '',
      '### Entrada B (2026-02-02)',
      'cuerpo',
      '',
      '### Entrada C (2026-02-03)',
      'cuerpo'
    ].join('\n')

    expect(detectDatedSections(mezclado).level).toBe(3)
    expect(detectDatedSections(mezclado).matches).toHaveLength(3)
  })

  it('un heading SIN fecha no es una sección archivable', () => {
    // La fecha no es decoración: es el criterio de ranking. Un heading sin ella no se puede ordenar
    // por antigüedad, así que aceptarlo archivaría por posición y no por edad.
    const sinFecha = ['# Título', '', '### Algo importante', 'cuerpo', '', '### Otra cosa', 'cuerpo'].join('\n')

    expect(detectDatedSections(sinFecha).matches).toHaveLength(0)
    expect(detectDatedSections(sinFecha).level).toBeNull()
  })

  it('un documento vacío devuelve cero secciones en vez de reventar', () => {
    expect(() => detectDatedSections('')).not.toThrow()
    expect(detectDatedSections('').matches).toHaveLength(0)
  })

  it('alcanza el Handoff.md REAL del repo, no solo fixtures', () => {
    // El fixture verde con el archivo real ciego es exactamente el modo de falla que se está
    // cerrando. Este assert es el que se rompe la próxima vez que la convención derive — y cuando
    // se rompa, la respuesta es agregar el nivel nuevo a DATED_SECTION_LEVELS, no bajar el assert.
    const handoff = readFileSync(resolve(process.cwd(), 'Handoff.md'), 'utf8')
    const { matches } = detectDatedSections(handoff)

    expect(
      matches.length,
      'La rotación no encuentra ninguna sección fechada en Handoff.md. Si la convención de títulos ' +
        'cambió, extiende DATED_SECTION_LEVELS; no dejes la herramienta ciega otra vez.'
    ).toBeGreaterThan(0)
  })
})
