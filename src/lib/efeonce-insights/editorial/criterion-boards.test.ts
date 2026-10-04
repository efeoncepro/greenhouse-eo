/**
 * TASK-1990/1996 — tableros con isotipo por celda (operador, 2026-10-04): visitas por asistente en tarjetas cuando hay
 * período anterior (dona en el primer período medido) y mención por motor cuando todas las tasas son iguales.
 */
import { describe, expect, it } from 'vitest'

import type { EvidenceFactV1 } from '../contracts/evidence'
import { statBoardChannelsOf } from '../presentation/stat-card'
import { assistantStatFigureFor, compositionChartsFor, engineStatFigureFor } from './criterion-figures'

const fact = (factId: string, metricId: string, value: number | null, extra: Partial<EvidenceFactV1> = {}): EvidenceFactV1 =>
  ({ factId, metricId, value, unit: 'count', label: metricId, module: 'aeo', source: 'ga4:ai_source', observation: 'observed', comparisonFactId: null, ...extra }) as EvidenceFactV1

const assistants = (withPrevious: boolean) => {
  const now = [
    fact('a1', 'ai_source.chatgpt', 1648, { channelId: 'chatgpt', comparisonFactId: withPrevious ? 'p1' : null }),
    fact('a2', 'ai_source.gemini', 30, { channelId: 'gemini', comparisonFactId: withPrevious ? 'p2' : null }),
    fact('a3', 'ai_source.other', 8, { label: 'Otros asistentes' }),
    fact('t', 'ai_sessions', 1686)
  ]

  const previous = withPrevious ? [fact('p1', 'ai_source.chatgpt', 1343, { channelId: 'chatgpt' }), fact('p2', 'ai_source.gemini', 23, { channelId: 'gemini' })] : []

  return { facts: now, byId: new Map([...now, ...previous].map(f => [f.factId, f])) }
}

describe('visitas por asistente: tarjetas o dona', () => {
  it('con período anterior por asistente: tarjetas con el nombre del asistente, «Otros» al final y sin dona', () => {
    const { facts, byId } = assistants(true)
    const board = assistantStatFigureFor('aeo', facts, byId)

    expect(board?.items.map(item => item.label)).toEqual(['ChatGPT', 'Gemini', 'Otros asistentes'])
    expect(compositionChartsFor('aeo', facts, null, { aiSourceAsCards: true }).find(chart => chart.chartId.endsWith('ai-source'))).toBeUndefined()

    // Isotipo en cada celda; «Otros asistentes» queda sólo con su nombre.
    expect(statBoardChannelsOf(facts.filter(f => f.metricId.startsWith('ai_source.')))).toEqual({ title: [], perCell: true })
  })

  it('en el primer período medido: dona, sin tablero', () => {
    const { facts, byId } = assistants(false)

    expect(assistantStatFigureFor('aeo', facts, byId)).toBeNull()
    expect(compositionChartsFor('aeo', facts, null).find(chart => chart.chartId.endsWith('ai-source'))?.family).toBe('donut')
  })
})

describe('mención por motor', () => {
  const engines = (values: number[]) =>
    ['chatgpt', 'gemini', 'google_ai_overview'].map((channelId, i) =>
      fact(`m${i}`, `mention_rate.${channelId}`, values[i]!, { unit: 'percent', source: 'greenhouse_growth.grader_runs', channelId: channelId as EvidenceFactV1['channelId'] })
    )

  it('con la misma tasa en todos los motores: una tarjeta por motor, AI Overview primero', () => {
    const facts = engines([33.3, 33.3, 33.3])

    expect(engineStatFigureFor('aeo', facts, new Map(facts.map(f => [f.factId, f])), new Set())?.items.map(item => item.label)).toEqual(['AI Overview', 'ChatGPT', 'Gemini'])
  })

  it('si las tasas varían, no hay tablero: la comparación va en barras por canal', () => {
    const facts = engines([50, 33.3, 16.7])

    expect(engineStatFigureFor('aeo', facts, new Map(facts.map(f => [f.factId, f])), new Set())).toBeNull()
  })
})
