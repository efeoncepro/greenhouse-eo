import { describe, expect, it } from 'vitest'

import type { SeoPerformanceSummary, SeoPerformanceTotals } from '../../contracts'
import { deriveSeoPerformanceInsight } from '../derive-insight'

/**
 * TASK-1307 — la lectura cruzada sólo habla cuando el patrón es inequívoco: cada regla se
 * prueba con su caso positivo Y con el borde donde debe callarse (null > insight ambiguo).
 */

const totals = (partial: Partial<SeoPerformanceTotals>): SeoPerformanceTotals => ({
  clicks: 1000,
  impressions: 100000,
  position: 5,
  ctr: 0.01,
  ...partial
})

const summary = (current: SeoPerformanceTotals, previous: SeoPerformanceTotals | null): SeoPerformanceSummary => ({
  current,
  previous,
  series: []
})

describe('deriveSeoPerformanceInsight', () => {
  it('sin ventana previa no hay insight (nada contra qué leer)', () => {
    expect(deriveSeoPerformanceInsight(summary(totals({}), null))).toBeNull()
  })

  it('demand_drop: clics e impresiones caen juntos con posición estable', () => {
    const insight = deriveSeoPerformanceInsight(
      summary(totals({ clicks: 700, impressions: 70000, position: 5.1 }), totals({}))
    )

    expect(insight?.kind).toBe('demand_drop')
    expect(insight?.clicksDeltaPercent).toBeCloseTo(-30)
    expect(insight?.impressionsDeltaPercent).toBeCloseTo(-30)
  })

  it('ctr_erosion: posición e impresiones estables pero el CTR cae (patrón AIO)', () => {
    const insight = deriveSeoPerformanceInsight(
      // CTR 1% → 0.4% = −0.6 puntos; impresiones −5% (estables); posición Δ 0.1 (estable).
      summary(totals({ clicks: 380, impressions: 95000, ctr: 0.004, position: 5.1 }), totals({}))
    )

    expect(insight?.kind).toBe('ctr_erosion')
    expect(insight?.ctrDeltaPoints).toBeCloseTo(-0.6)
  })

  it('rank_gain: la mejora de posición explica el alza de clics', () => {
    const insight = deriveSeoPerformanceInsight(summary(totals({ clicks: 1400, position: 3.2 }), totals({})))

    expect(insight?.kind).toBe('rank_gain')
    // El delta conserva el signo real: mejorar es NEGATIVO (5 → 3.2).
    expect(insight?.positionDelta).toBeCloseTo(-1.8)
  })

  it('rank_loss: la pérdida de posición explica la caída de clics', () => {
    const insight = deriveSeoPerformanceInsight(summary(totals({ clicks: 600, position: 8 }), totals({})))

    expect(insight?.kind).toBe('rank_loss')
    expect(insight?.positionDelta).toBeCloseTo(3)
  })

  it('se calla con señales mezcladas (posición mejora pero los clics caen poco)', () => {
    expect(
      deriveSeoPerformanceInsight(summary(totals({ clicks: 950, position: 3 }), totals({})))
    ).toBeNull()
  })

  it('se calla cuando falta la posición en alguna ventana', () => {
    expect(
      deriveSeoPerformanceInsight(summary(totals({ clicks: 700, impressions: 70000, position: null }), totals({})))
    ).toBeNull()
  })
})
