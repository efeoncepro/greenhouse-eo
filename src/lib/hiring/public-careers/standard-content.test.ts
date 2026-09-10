import { describe, expect, it } from 'vitest'

import { EFEONCE_OPERATING_MARKETS } from '@/config/efeonce-brand'

import {
  EFEONCE_CAREERS_COMPANY_CONTEXT,
  EFEONCE_CAREERS_STANDARD_BENEFITS,
  resolveEfeonceCareersBenefits
, EFEONCE_CAREERS_BENEFITS_QUALIFIER } from './standard-content'

describe('contenido estándar público de Careers', () => {
  it('mantiene un contexto corporativo factual y un baseline de beneficios sin aporte de equipo', () => {
    // PDR-008 capa 1: la categoría, en la definición del operador, más la huella operativa.
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('agencia de marketing y tecnología')

    // La huella se compone desde el SSOT de marca, nunca a mano: si mañana entra o sale un país,
    // este bloque tiene que moverse con él. Estados Unidos entró el 2026-08-31 y varias
    // superficies quedaron mostrando cuatro países.
    for (const market of EFEONCE_OPERATING_MARKETS) {
      expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain(market)
    }

    // PDR-008 §Reglas duras: «agencia» NUNCA queda como promesa suelta. El reencuadre no-es-X-es-Y
    // vive en la segunda oración; un test no puede verificar retórica, así que ancla su carga útil.
    // Si el wording cambia, el reencuadre tiene que seguir existiendo — no borres este assert.
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('un solo equipo')

    // Mecanismo, no adjetivo: `medios` es capability propia y la prueba es `software propio`
    // —nunca «tecnología» a secas, que es el claim sin mecanismo de la disciplina anti-humo (`09`).
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('medios')
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('software propio')

    // Le habla al candidato, no al cliente: la vacante es su superficie, no la del comprador.
    expect(EFEONCE_CAREERS_COMPANY_CONTEXT).toContain('Para ti')

    // Convicción canónica (SSOT `docs/context/09_marca-agencia.md` §WHY), no una paráfrasis.
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
