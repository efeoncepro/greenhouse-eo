import { describe, expect, it } from 'vitest'

import {
  EFEONCE_CAREERS_COMPANY_CONTEXT,
  EFEONCE_CAREERS_STANDARD_BENEFITS,
  resolveEfeonceCareersBenefits
} from './standard-content'

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

    expect(resolved).toHaveLength(EFEONCE_CAREERS_STANDARD_BENEFITS.length + 1)
    expect(resolved.at(-1)).toBe('Viajes de aprendizaje para este rol.')
  })
})
