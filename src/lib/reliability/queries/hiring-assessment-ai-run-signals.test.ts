/**
 * TASK-1734 Slice 6 — tests de las 5 señales del run de scoring IA de assessments.
 *
 * Por señal se cubre: steady (ok), umbral warning, umbral error (cuando existe) y
 * degradación honesta a `unknown` cuando la query revienta. Todo con mocks de PG:
 * la forma del SQL vive acá como contrato, el live-testing es del rollout Slice 6.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

import {
  getHiringAssessmentAiAbstentionRateSignal,
  getHiringAssessmentAiOrphanReconciliationSignal,
  getHiringAssessmentAiOverrideDeltaSignal,
  getHiringAssessmentAiProviderFailureSignal,
  getHiringAssessmentAiRunBacklogStuckSignal,
  getHiringAssessmentAiRunSignals,
} from './hiring-assessment-ai-run-signals'

beforeEach(() => {
  runQueryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getHiringAssessmentAiRunBacklogStuckSignal', () => {
  it('steady=0 → ok', async () => {
    runQueryMock.mockResolvedValueOnce([{ n: 0, oldest_minutes: 0 }])

    const signal = await getHiringAssessmentAiRunBacklogStuckSignal()

    expect(signal.signalId).toBe('hiring.assessment_ai.run_backlog_stuck')
    expect(signal.moduleKey).toBe('hiring')
    expect(signal.kind).toBe('lag')
    expect(signal.severity).toBe('ok')
  })

  it('runs atascados recientes → warning', async () => {
    runQueryMock.mockResolvedValueOnce([{ n: 2, oldest_minutes: 45 }])

    const signal = await getHiringAssessmentAiRunBacklogStuckSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 run(s)')
  })

  it('el más viejo pasa 120 min → error', async () => {
    runQueryMock.mockResolvedValueOnce([{ n: 1, oldest_minutes: 180 }])

    const signal = await getHiringAssessmentAiRunBacklogStuckSignal()

    expect(signal.severity).toBe('error')
  })

  it('query falla → unknown (degradación honesta)', async () => {
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringAssessmentAiRunBacklogStuckSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.observedAt).toBeNull()
  })
})

describe('getHiringAssessmentAiProviderFailureSignal', () => {
  it('sin failed en 24h → ok', async () => {
    runQueryMock.mockResolvedValueOnce([])

    const signal = await getHiringAssessmentAiProviderFailureSignal()

    expect(signal.signalId).toBe('hiring.assessment_ai.provider_failure_rate')
    expect(signal.kind).toBe('dead_letter')
    expect(signal.severity).toBe('ok')
  })

  it('1-3 failed → warning con dimensión por modelo', async () => {
    runQueryMock.mockResolvedValueOnce([{ model: 'claude-sonnet-5', n: 2 }])

    const signal = await getHiringAssessmentAiProviderFailureSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('claude-sonnet-5=2')
  })

  it('>3 failed acumulados entre modelos → error', async () => {
    runQueryMock.mockResolvedValueOnce([
      { model: 'claude-sonnet-5', n: 3 },
      { model: 'claude-haiku-4', n: 2 },
    ])

    const signal = await getHiringAssessmentAiProviderFailureSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('5 item(s)')
  })

  it('query falla → unknown', async () => {
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringAssessmentAiProviderFailureSignal()

    expect(signal.severity).toBe('unknown')
  })
})

describe('getHiringAssessmentAiAbstentionRateSignal', () => {
  it('sin actividad → ok', async () => {
    runQueryMock.mockResolvedValueOnce([{ abstained: 0, attempted: 0 }])

    const signal = await getHiringAssessmentAiAbstentionRateSignal()

    expect(signal.signalId).toBe('hiring.assessment_ai.abstention_rate')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('Sin actividad')
  })

  it('tasa alta con muestra suficiente → warning (advisory: nunca error)', async () => {
    runQueryMock.mockResolvedValueOnce([{ abstained: 4, attempted: 10 }])

    const signal = await getHiringAssessmentAiAbstentionRateSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('4/10')
  })

  it('tasa alta pero muestra chica (<5) → ok (no alerta con ruido)', async () => {
    runQueryMock.mockResolvedValueOnce([{ abstained: 2, attempted: 3 }])

    const signal = await getHiringAssessmentAiAbstentionRateSignal()

    expect(signal.severity).toBe('ok')
  })

  it('tasa normal → ok', async () => {
    runQueryMock.mockResolvedValueOnce([{ abstained: 1, attempted: 20 }])

    const signal = await getHiringAssessmentAiAbstentionRateSignal()

    expect(signal.severity).toBe('ok')
  })

  it('query falla → unknown', async () => {
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringAssessmentAiAbstentionRateSignal()

    expect(signal.severity).toBe('unknown')
  })
})

describe('getHiringAssessmentAiOverrideDeltaSignal', () => {
  it('sin resoluciones en 30d → ok', async () => {
    runQueryMock.mockResolvedValueOnce([{ overridden: 0, confirmed: 0, rejected: 0 }])

    const signal = await getHiringAssessmentAiOverrideDeltaSignal()

    expect(signal.signalId).toBe('hiring.assessment_ai.override_delta')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
  })

  it('disagreement >25% con n>=5 → warning', async () => {
    // 2 overridden + 1 rejected sobre 8 resoluciones = 37.5%
    runQueryMock.mockResolvedValueOnce([{ overridden: 2, confirmed: 5, rejected: 1 }])

    const signal = await getHiringAssessmentAiOverrideDeltaSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3/8')
  })

  it('disagreement >50% con n>=10 → error', async () => {
    runQueryMock.mockResolvedValueOnce([{ overridden: 5, confirmed: 4, rejected: 2 }])

    const signal = await getHiringAssessmentAiOverrideDeltaSignal()

    expect(signal.severity).toBe('error')
  })

  it('disagreement alto pero muestra chica → ok (sin alerta con ruido)', async () => {
    runQueryMock.mockResolvedValueOnce([{ overridden: 2, confirmed: 1, rejected: 0 }])

    const signal = await getHiringAssessmentAiOverrideDeltaSignal()

    expect(signal.severity).toBe('ok')
  })

  it('query falla → unknown', async () => {
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringAssessmentAiOverrideDeltaSignal()

    expect(signal.severity).toBe('unknown')
  })
})

describe('getHiringAssessmentAiOrphanReconciliationSignal', () => {
  it('steady=0 → ok', async () => {
    runQueryMock.mockResolvedValueOnce([{ orphan_proposals: 0, orphan_items: 0 }])

    const signal = await getHiringAssessmentAiOrphanReconciliationSignal()

    expect(signal.signalId).toBe('hiring.assessment_ai.orphan_reconciliation')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
  })

  it('huérfanas <=5 → warning con remediación por reconcile', async () => {
    runQueryMock.mockResolvedValueOnce([{ orphan_proposals: 2, orphan_items: 1 }])

    const signal = await getHiringAssessmentAiOrphanReconciliationSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 proposal(s)')
    expect(signal.summary).toContain('nunca DELETE')
  })

  it('huérfanas >5 → error (backlog sistemático)', async () => {
    runQueryMock.mockResolvedValueOnce([{ orphan_proposals: 5, orphan_items: 3 }])

    const signal = await getHiringAssessmentAiOrphanReconciliationSignal()

    expect(signal.severity).toBe('error')
  })

  it('query falla → unknown', async () => {
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringAssessmentAiOrphanReconciliationSignal()

    expect(signal.severity).toBe('unknown')
  })
})

describe('getHiringAssessmentAiRunSignals (agregador)', () => {
  it('retorna las 5 señales y nunca lanza aunque todas las queries fallen', async () => {
    runQueryMock.mockRejectedValue(new Error('pg down'))

    const signals = await getHiringAssessmentAiRunSignals()

    expect(signals).toHaveLength(5)
    expect(signals.map(s => s.signalId).sort()).toEqual([
      'hiring.assessment_ai.abstention_rate',
      'hiring.assessment_ai.orphan_reconciliation',
      'hiring.assessment_ai.override_delta',
      'hiring.assessment_ai.provider_failure_rate',
      'hiring.assessment_ai.run_backlog_stuck',
    ])
    expect(signals.every(s => s.severity === 'unknown')).toBe(true)
    expect(signals.every(s => s.moduleKey === 'hiring')).toBe(true)
  })

  it('steady state completo → todas ok', async () => {
    runQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('oldest_minutes')) return [{ n: 0, oldest_minutes: 0 }]
      if (sql.includes('GROUP BY')) return []
      if (sql.includes('attempted')) return [{ abstained: 0, attempted: 0 }]
      if (sql.includes('resolution')) return [{ overridden: 0, confirmed: 0, rejected: 0 }]

      return [{ orphan_proposals: 0, orphan_items: 0 }]
    })

    const signals = await getHiringAssessmentAiRunSignals()

    expect(signals.every(s => s.severity === 'ok')).toBe(true)
  })
})
