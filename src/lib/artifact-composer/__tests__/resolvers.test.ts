import { describe, expect, it } from 'vitest'

import { deckAxisResolvers } from '../catalogs/deck-axis/resolvers'
import { resolveFieldDirective as dispatchFieldDirective, UnknownResolverValueError } from '../resolver-contract'

// El dispatch es del motor; la TABLA es del catálogo deck-axis (TASK-1393 Slice 2).
const resolveFieldDirective = (field: Parameters<typeof dispatchFieldDirective>[1], value: unknown, ctx?: Parameters<typeof dispatchFieldDirective>[3]) => dispatchFieldDirective(deckAxisResolvers, field, value, ctx)

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

  it('resolver-only no busca un ancla de copy cuando sólo entrega semántica a otro resolver', () => {
    expect(resolveFieldDirective({ consumer: 'resolver-only' }, undefined)).toEqual({ mode: 'skip' })
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

  it('chart-bar-geometry deriva una única brecha y quita el chrome que el dato no sostiene', () => {
    const series = [
      { name: 'Líder', value: '50%', valuePct: 50, highlight: 'muted' },
      { name: 'SKY', value: '18%', valuePct: 18, highlight: 'sky' }
    ]

    expect(resolveFieldDirective({ resolver: 'chart-bar-geometry' }, 18, { item: series[1]!, index: 1, itemCount: 2, slots: { series } })).toEqual({
      mode: 'apply',
      effects: [
        { selector: ':self', toneClass: 'sky', toneGroup: ['sky'] },
        { selector: '.fill', toneClass: 'sky', toneGroup: ['sky', 'muted'] },
        { selector: '.fill', styleProp: 'width', styleValue: '32%' },
        { selector: '.gap', styleProp: 'left', styleValue: '32%' },
        { selector: '.gap', styleProp: 'width', styleValue: '56%' },
        { selector: '.gap .glabel', asText: true, value: '+32 pts a cerrar' }
      ]
    })

    expect(resolveFieldDirective({ resolver: 'chart-bar-geometry' }, 50, { item: series[0]!, index: 0, itemCount: 2, slots: { series } })).toMatchObject({
      mode: 'apply',
      effects: expect.arrayContaining([{ selector: '.gap', remove: true }])
    })
  })

  it('chart-bar-geometry aborta si la etiqueta contradice valuePct', () => {
    const series = [
      { name: 'Líder', value: '50%', valuePct: 50, highlight: 'muted' },
      { name: 'SKY', value: '20%', valuePct: 18, highlight: 'sky' }
    ]

    expect(() =>
      resolveFieldDirective({ resolver: 'chart-bar-geometry' }, 18, {
        item: series[1]!,
        index: 1,
        itemCount: 2,
        slots: { series }
      })
    ).toThrow(/inconsistente/)
  })
})
