import { describe, expect, it } from 'vitest'

import { computeScorecardSummary } from './scorecard-summary'

describe('computeScorecardSummary (ISSUE-159)', () => {
  it('caso fuente EO-ASM-0050: 2 objetivas en 100 + 7 pendientes JAMÁS es 100/100', () => {
    const rows = [
      { score: 100, weight: 8, pending: false }, // SEO auto-scored
      { score: 100, weight: 8, pending: false }, // Vendor auto-scored
      { score: null, weight: 20, pending: true },
      { score: null, weight: 15, pending: true },
      { score: null, weight: 12, pending: true },
      { score: null, weight: 10, pending: true },
      { score: null, weight: 10, pending: true },
      { score: null, weight: 10, pending: true },
      { score: null, weight: 7, pending: true }
    ]

    const summary = computeScorecardSummary(rows)

    expect(summary.state).toBe('partial')
    expect(summary.overall).toBeNull()
    expect(summary.scoredCount).toBe(2)
    expect(summary.totalCount).toBe(9)
  })

  it('competencia con score parcial pero respuestas abiertas pendientes sigue siendo partial', () => {
    // Competencia mixta: la pregunta objetiva ya tiene score pero la abierta espera corrección.
    const summary = computeScorecardSummary([
      { score: 80, weight: 10, pending: true },
      { score: 90, weight: 10, pending: false }
    ])

    expect(summary.state).toBe('partial')
    expect(summary.overall).toBeNull()
    expect(summary.scoredCount).toBe(1)
  })

  it('complete reproduce EXACTAMENTE la matemática previa (ponderada por peso)', () => {
    // Scorecard real de EO-ASM-0050 tras corrección completa: rollup canónico 75.54 → display 76.
    const rows = [
      { score: 68, weight: 20, pending: false },
      { score: 86, weight: 15, pending: false },
      { score: 69, weight: 12, pending: false },
      { score: 65, weight: 10, pending: false },
      { score: 58, weight: 10, pending: false },
      { score: 92, weight: 10, pending: false },
      { score: 100, weight: 8, pending: false },
      { score: 100, weight: 8, pending: false },
      { score: 48, weight: 7, pending: false }
    ]

    const summary = computeScorecardSummary(rows)

    expect(summary.state).toBe('complete')

    const expected = Math.round(rows.reduce((s, r) => s + (r.score ?? 0) * r.weight, 0) / 100)

    expect(summary.overall).toBe(expected)
    expect(summary.scoredCount).toBe(9)
  })

  it('complete con peso total 0 usa promedio simple (paridad con la lógica previa)', () => {
    const summary = computeScorecardSummary([
      { score: 60, weight: 0, pending: false },
      { score: 80, weight: 0, pending: false }
    ])

    expect(summary.state).toBe('complete')
    expect(summary.overall).toBe(70)
  })

  it('sin filas es empty; todas pendientes es partial con 0 corregidas', () => {
    expect(computeScorecardSummary([]).state).toBe('empty')

    const allPending = computeScorecardSummary([
      { score: null, weight: 50, pending: true },
      { score: null, weight: 50, pending: true }
    ])

    expect(allPending.state).toBe('partial')
    expect(allPending.scoredCount).toBe(0)
  })
})
