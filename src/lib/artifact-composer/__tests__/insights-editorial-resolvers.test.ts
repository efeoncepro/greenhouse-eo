import { describe, expect, it } from 'vitest'

import { resolveFieldDirective, UnknownResolverValueError } from '../resolver-contract'
import { channelIsotypeEffects, CHANNEL_ISOTYPES } from '../catalogs/insights-shared/channels'
import {
  insightsEditorialResolvers,
  levelDotsEffects,
  weekSpanEffects
} from '../catalogs/insights-shared/editorial-resolvers'
import { chapterNumeralX } from '../catalogs/insights-shared/layout-hooks'

const ctx = (index: number) => ({ item: {}, index, itemCount: 5, slots: {} })

describe('resolvers editoriales de Insights (TASK-1889)', () => {
  it('la barra de semanas sale del rango sobre 4 semanas, con 2 px de aire (regla del canvas)', () => {
    expect(weekSpanEffects('1-2')).toEqual([
      { selector: '.week-bar', styleProp: 'left', styleValue: 'calc(0% + 2px)' },
      { selector: '.week-bar', styleProp: 'width', styleValue: 'calc(50% - 4px)' }
    ])
    expect(weekSpanEffects('2-4')?.map(e => e.styleValue)).toEqual(['calc(25% + 2px)', 'calc(75% - 4px)'])
    expect(weekSpanEffects('3')?.map(e => e.styleValue)).toEqual(['calc(50% + 2px)', 'calc(25% - 4px)'])
  })

  it('un rango imposible no dibuja nada: falla cerrado', () => {
    expect(weekSpanEffects('3-1')).toBeNull()
    expect(weekSpanEffects('0-2')).toBeNull()
    expect(weekSpanEffects('5')).toBeNull()
    expect(weekSpanEffects('dos semanas')).toBeNull()
  })

  it('sin semanas declaradas, la pista desaparece (nunca un rango por defecto)', () => {
    expect(weekSpanEffects('undefined')).toEqual([{ selector: '.week-track', remove: true }])
  })

  it('los puntos encienden exactamente el nivel 1–3 y sin nivel desaparece el bloque', () => {
    expect(levelDotsEffects('.impact-dots', '2')?.map(e => e.toneClass)).toEqual(['pip--on', 'pip--on', 'pip--off'])
    expect(levelDotsEffects('.impact-dots', '4')).toBeNull()
    expect(levelDotsEffects('.effort-dots', 'undefined')).toEqual([{ selector: '.level:has(.effort-dots)', remove: true }])
  })

  it('el ordinal y el número salen de la posición del ítem', () => {
    const resolvers = insightsEditorialResolvers('report')

    expect(resolvers['report-ordinal']!.build('', ctx(2))).toEqual([{ selector: ':field', asText: true, value: '03' }])
    expect(resolvers['report-number']!.build('', ctx(2))).toEqual([{ selector: ':field', asText: true, value: '3' }])
  })

  it('el ícono de cierre sólo conoce measure y action', () => {
    const resolvers = insightsEditorialResolvers('deck')

    expect(() =>
      resolveFieldDirective(resolvers, { resolver: 'deck-closing-icon' }, 'warning')
    ).toThrow(UnknownResolverValueError)
  })

  it('un canal conocido toma su isotipo del catálogo; uno desconocido queda con su nombre, sin disco', () => {
    expect(channelIsotypeEffects('chatgpt')).toEqual([{ selector: ':field', attr: 'src', value: 'assets/channels/chatgpt.svg' }])
    expect(CHANNEL_ISOTYPES.google_ai_overview).toBe(CHANNEL_ISOTYPES.google)
    expect(channelIsotypeEffects('bing')).toEqual([{ selector: '.channel-disc', remove: true }])
  })

  it('el número de capítulo terminado en 1 se corre 20 px (compensación óptica del canvas)', () => {
    expect(chapterNumeralX('01')).toBe(830)
    expect(chapterNumeralX('11')).toBe(830)
    expect(chapterNumeralX('02')).toBe(850)
    expect(chapterNumeralX('10')).toBe(850)
  })
})
