import { describe, expect, it } from 'vitest'

import { resolveFieldDirective, UnknownResolverValueError } from '../resolvers'

describe('deck field resolvers', () => {
  it('un campo sin resolver se escribe como texto', () => {
    expect(resolveFieldDirective({}, 'hola')).toEqual({ mode: 'text' })
  })

  it('un campo validation-only NUNCA se pinta', () => {
    // `evidenceRef` es munición interna: se exige para validar la cifra, pero la fuente no es copy
    // para el comité. Si se pintara, la lámina mostraría "aeo-run-sky-2026-07" al cliente.
    const directive = resolveFieldDirective({ consumer: 'validation-only' }, 'aeo-run-sky-2026-07')

    expect(directive).toEqual({ mode: 'skip' })
  })

  it('validation-only gana sobre el resolver', () => {
    expect(resolveFieldDirective({ consumer: 'validation-only', resolver: 'stat-goal-icon' }, 'visibility')).toEqual({
      mode: 'skip'
    })
  })

  it('el kind de un goal resuelve a su ícono Solar', () => {
    const directive = resolveFieldDirective({ resolver: 'stat-goal-icon' }, 'visibility')

    expect(directive).toEqual({
      mode: 'apply',
      effects: [{ selector: '.goal-icon', attr: 'src', value: 'assets/solar/target-bold.svg' }]
    })
  })

  it('el kind de un pilar resuelve ícono Y tono', () => {
    const directive = resolveFieldDirective({ resolver: 'four-pillars-icon-and-tone' }, 'data')

    expect(directive).toEqual({
      mode: 'apply',
      effects: [
        { selector: '.icon-stage img', attr: 'src', value: 'assets/solar/chart-square-bold.svg' },
        { selector: ':self', toneClass: 'data', toneGroup: ['ai', 'data', 'method', 'human'] }
      ]
    })
  })

  it('isProposed=false LIMPIA el tono destacado del blueprint', () => {
    // Sin esto, el blueprint (que es el plan destacado) contagia su clase a todos los planes y la
    // lámina económica afirma que TODOS son "el propuesto" — una afirmación falsa sobre la oferta.
    const directive = resolveFieldDirective({ resolver: 'pricing-option-tone' }, 'false')

    expect(directive).toEqual({ mode: 'apply', effects: [{ selector: ':self', toneGroup: ['is-proposed'] }] })
  })

  it('isProposed=true marca el plan propuesto', () => {
    expect(resolveFieldDirective({ resolver: 'pricing-option-tone' }, 'true')).toEqual({
      mode: 'apply',
      effects: [{ selector: ':self', toneClass: 'is-proposed' }]
    })
  })

  it('un valor desconocido NO cae a un ícono por defecto: revienta', () => {
    // El fallback silencioso acá pondría un ícono arbitrario en una lámina de oferta. Preferimos el
    // throw: o el mapa está incompleto, o el enum del contrato está mal.
    expect(() => resolveFieldDirective({ resolver: 'stat-goal-icon' }, 'inventado')).toThrow(UnknownResolverValueError)
  })

  it('un resolver declarado en el contrato pero no implementado revienta', () => {
    expect(() => resolveFieldDirective({ resolver: 'no-existe' }, 'x')).toThrow(/no implementado/)
  })
})
