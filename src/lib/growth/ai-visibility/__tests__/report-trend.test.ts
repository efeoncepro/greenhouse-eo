import { describe, expect, it } from 'vitest'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import { buildGraderReport, type ReportRunMeta } from '../report/builder'
import { buildReportTrend, type PreviousScoreInput } from '../report/trend'
import { makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-current',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

const previousOf = (
  scores: Parameters<typeof makeScore>[0],
  overrides: { promptPackVersion?: string; finishedAt?: string | null } = {}
): PreviousScoreInput => ({
  score: makeScore(scores),
  promptPackVersion: overrides.promptPackVersion ?? 'prompt-pack.v1',
  finishedAt: overrides.finishedAt ?? '2026-05-24T12:00:00.000Z'
})

describe('growth/ai-visibility — report temporal trend', () => {
  it('sin run previo → sin_historico (sin delta fabricado)', () => {
    const result = buildReportTrend(makeScore({ ai_visibility: 30 }), 'prompt-pack.v1', null)

    expect(result.status).toBe('sin_historico')
    expect(result.reason).toBe(GH_GROWTH_AI_VISIBILITY.trend_status.sin_historico)
    expect(result.overall).toBeNull()
    expect(result.dimensions).toEqual([])
    expect(result.previousAsOf).toBeNull()
  })

  it('prompt-pack distinto → incomparable (no compara contra otra muestra)', () => {
    const result = buildReportTrend(
      makeScore({ ai_visibility: 30 }),
      'prompt-pack.v1',
      previousOf({ ai_visibility: 10 }, { promptPackVersion: 'prompt-pack.v2' })
    )

    expect(result.status).toBe('incomparable')
    expect(result.overall).toBeNull()
    expect(result.dimensions).toEqual([])
    expect(result.previousAsOf).toBe('2026-05-24T12:00:00.000Z')
  })

  it('con_tendencia: delta overall + por dimensión, dirección nombrada', () => {
    const current = makeScore({ ai_visibility: 30, entity_clarity: 40 })
    const previous = previousOf({ ai_visibility: 10, entity_clarity: 60 })

    const result = buildReportTrend(current, 'prompt-pack.v1', previous)

    expect(result.status).toBe('con_tendencia')
    expect(result.previousAsOf).toBe('2026-05-24T12:00:00.000Z')
    expect(result.overall?.delta).toBe(Math.round((current.overallScore! - previous.score.overallScore!) * 10) / 10)

    const ai = result.dimensions.find(d => d.key === 'ai_visibility')!

    expect(ai).toMatchObject({ current: 30, previous: 10, delta: 20, direction: 'subio' })

    const entity = result.dimensions.find(d => d.key === 'entity_clarity')!

    expect(entity).toMatchObject({ current: 40, previous: 60, delta: -20, direction: 'bajo' })
  })

  it('mismo score en ambos extremos → sin_cambio (delta 0)', () => {
    const result = buildReportTrend(makeScore({ ai_visibility: 30 }), 'prompt-pack.v1', previousOf({ ai_visibility: 30 }))
    const ai = result.dimensions.find(d => d.key === 'ai_visibility')!

    expect(ai.delta).toBe(0)
    expect(ai.direction).toBe('sin_cambio')
  })

  it('null ≠ 0: dimensión null en cualquier extremo → delta null (sin_dato), no 0', () => {
    const currentNull = buildReportTrend(
      makeScore({ message_alignment: null }),
      'prompt-pack.v1',
      previousOf({ message_alignment: 40 })
    )

    const previousNull = buildReportTrend(
      makeScore({ message_alignment: 40 }),
      'prompt-pack.v1',
      previousOf({ message_alignment: null })
    )

    const a = currentNull.dimensions.find(d => d.key === 'message_alignment')!
    const b = previousNull.dimensions.find(d => d.key === 'message_alignment')!

    expect(a).toMatchObject({ current: null, delta: null, direction: 'sin_dato' })
    expect(b).toMatchObject({ previous: null, delta: null, direction: 'sin_dato' })
  })

  it('es determinista: mismo input → mismo trend', () => {
    const current = makeScore({ ai_visibility: 30 })
    const previous = previousOf({ ai_visibility: 10 })

    expect(buildReportTrend(current, 'prompt-pack.v1', previous)).toEqual(
      buildReportTrend(current, 'prompt-pack.v1', previous)
    )
  })

  it('el builder integra el trend (interno + público) sin tocar el resto', () => {
    const report = buildGraderReport({
      score: makeScore({ ai_visibility: 30 }),
      findings: [],
      run: RUN,
      previous: previousOf({ ai_visibility: 10 })
    })

    expect(report.trend.status).toBe('con_tendencia')
    expect(report.trend.overall?.direction).toBe('subio')

    // sin previous → sin_historico
    const noPrev = buildGraderReport({ score: makeScore({ ai_visibility: 30 }), findings: [], run: RUN })

    expect(noPrev.trend.status).toBe('sin_historico')
  })
})
