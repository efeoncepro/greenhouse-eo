import { describe, expect, it } from 'vitest'

import {
  EFEONCE_CAREERS_COMPANY_CONTEXT,
  EFEONCE_CAREERS_STANDARD_BENEFITS,
  resolveEfeonceCareersBenefits
, EFEONCE_CAREERS_BENEFITS_QUALIFIER } from './standard-content'

describe('contenido estándar público de Careers', () => {
  it('mantiene un contexto corporativo factual y un baseline de beneficios sin aporte de equipo', () => {
    // PDR-008 capa 1: la categoría familiar y buscable, la misma con la que lidera el sitio vivo.
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('agencia de marketing digital')
    // PDR-008 §Reglas duras: «agencia» NUNCA queda como promesa suelta; el reencuadre va al lado.
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('no como un menú de servicios')
    // Mecanismo, no adjetivo: `medios` es capability propia y la prueba es `software propio`
    // —nunca «tecnología» a secas, que es el claim sin mecanismo de la disciplina anti-humo (`09`).
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('medios')
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('software propio')
    // Why canónico (SSOT `docs/context/09_marca-agencia.md` §WHY), no una paráfrasis.
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('más capaz de sostenerlo')

    // PDR-008 §Reglas duras: nada de siglas ni metodologías propias en los primeros 30 segundos.
    for (const jerga of ['ICO', 'RpA', 'FTR', 'Loop Marketing', 'ASaaS', 'Growth Operating System']) {
      expect(EFEONCE_CAREERS_COMPANY_CONTEXT).not.toContain(jerga)
    }

    expect(EFEONCE_CAREERS_STANDARD_BENEFITS).toHaveLength(6)
    expect(EFEONCE_CAREERS_STANDARD_BENEFITS.join(' ')).toContain('US$50')
    expect(EFEONCE_CAREERS_STANDARD_BENEFITS.join(' ')).not.toContain('US$400')
    expect(EFEONCE_CAREERS_STANDARD_BENEFITS.join(' ').toLowerCase()).not.toContain('aporte de equipo')
  })

  it('añade beneficios específicos sin duplicar strings exactos', () => {
    const resolved = resolveEfeonceCareersBenefits([
      EFEONCE_CAREERS_STANDARD_BENEFITS[0],
      'Viajes de aprendizaje para este rol.'
    ])

    // estándar + el del rol (el duplicado exacto se descarta) + el calificador de cierre.
    expect(resolved).toHaveLength(EFEONCE_CAREERS_STANDARD_BENEFITS.length + 2)
    expect(resolved.at(-2)).toBe('Viajes de aprendizaje para este rol.')
    expect(resolved.at(-1)).toBe(EFEONCE_CAREERS_BENEFITS_QUALIFIER)
  })
})

describe('calificador de modalidad/país (charter: retener las condiciones)', () => {
  it('cierra SIEMPRE la lista de beneficios, una sola vez y al final', () => {
    const withRole = resolveEfeonceCareersBenefits(['Encuentro presencial anual del equipo.'])

    expect(withRole.at(-1)).toBe(EFEONCE_CAREERS_BENEFITS_QUALIFIER)
    expect(withRole.filter(b => b === EFEONCE_CAREERS_BENEFITS_QUALIFIER)).toHaveLength(1)

    const standardOnly = resolveEfeonceCareersBenefits()

    expect(standardOnly.at(-1)).toBe(EFEONCE_CAREERS_BENEFITS_QUALIFIER)
  })

  it('no se duplica si una vacante ya lo declara en sus propios beneficios', () => {
    const benefits = resolveEfeonceCareersBenefits([EFEONCE_CAREERS_BENEFITS_QUALIFIER])

    expect(benefits.filter(b => b === EFEONCE_CAREERS_BENEFITS_QUALIFIER)).toHaveLength(1)
  })

  it('nombra la condición de modalidad y país, no una promesa uniforme', () => {
    expect(EFEONCE_CAREERS_BENEFITS_QUALIFIER).toContain('modalidad de contratación')
    expect(EFEONCE_CAREERS_BENEFITS_QUALIFIER).toContain('país de residencia')
  })
})
