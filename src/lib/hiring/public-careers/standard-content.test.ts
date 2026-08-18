import { describe, expect, it } from 'vitest'

import {
  EFEONCE_CAREERS_COMPANY_CONTEXT,
  EFEONCE_CAREERS_STANDARD_BENEFITS,
  resolveEfeonceCareersBenefits
, EFEONCE_CAREERS_BENEFITS_QUALIFIER } from './standard-content'

describe('contenido estándar público de Careers', () => {
  it('mantiene un contexto corporativo factual y un baseline de beneficios sin aporte de equipo', () => {
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('plataforma de servicios de marketing y crecimiento')
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
