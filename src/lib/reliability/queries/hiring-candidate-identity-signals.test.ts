/**
 * TASK-1736 Slice 4 — tests de las 2 señales de identidad del intake de candidatos.
 *
 * Por señal se cubre: steady (ok), umbral warning, umbral error y degradación honesta a
 * `unknown` cuando la query revienta; más el corto-circuito flag OFF de la señal de cobertura
 * (ok con nota, SIN tocar la DB). Todo con mocks de PG: la forma del SQL vive acá como
 * contrato, el live-testing es del canary del runbook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()
const flagMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

vi.mock('@/lib/hiring/candidate-intake/config', () => ({
  isCandidateIdentityNormalizationEnabled: () => flagMock(),
}))

import {
  getHiringCandidateIdentityEvidenceCoverageGapSignal,
  getHiringCandidateIdentityNeedsReviewBacklogSignal,
  getHiringCandidateIdentitySignals,
} from './hiring-candidate-identity-signals'

beforeEach(() => {
  runQueryMock.mockReset()
  flagMock.mockReset()
  flagMock.mockReturnValue(false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getHiringCandidateIdentityNeedsReviewBacklogSignal', () => {
  it('steady=0 → ok', async () => {
    runQueryMock.mockResolvedValueOnce([{ pending_rows: 0, pending_profiles: 0 }])

    const signal = await getHiringCandidateIdentityNeedsReviewBacklogSignal()

    expect(signal.signalId).toBe('hiring.candidate_identity.needs_review_backlog')
    expect(signal.moduleKey).toBe('hiring')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
  })

  it('1-5 pendientes → warning', async () => {
    runQueryMock.mockResolvedValueOnce([{ pending_rows: 3, pending_profiles: 2 }])

    const signal = await getHiringCandidateIdentityNeedsReviewBacklogSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 fila(s)')
    expect(signal.summary).toContain('2 identidad(es)')
  })

  it('>5 pendientes → error (backlog sistemático)', async () => {
    runQueryMock.mockResolvedValueOnce([{ pending_rows: 7, pending_profiles: 6 }])

    const signal = await getHiringCandidateIdentityNeedsReviewBacklogSignal()

    expect(signal.severity).toBe('error')
  })

  it('el SQL descarta filas con corrección humana posterior (contrato de la query)', async () => {
    runQueryMock.mockResolvedValueOnce([{ pending_rows: 0, pending_profiles: 0 }])

    await getHiringCandidateIdentityNeedsReviewBacklogSignal()

    const sql = String(runQueryMock.mock.calls[0]?.[0])

    expect(sql).toContain("a.outcome = 'needs_review'")
    expect(sql).toContain("h.source = 'human'")
    expect(sql).toContain("h.outcome = 'applied'")
    expect(sql).toContain('h.created_at >= a.created_at')
  })

  it('query falla → unknown (degradación honesta, sin PII)', async () => {
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringCandidateIdentityNeedsReviewBacklogSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.observedAt).toBeNull()
  })
})

describe('getHiringCandidateIdentityEvidenceCoverageGapSignal', () => {
  it('flag OFF → ok con nota y SIN consultar la DB', async () => {
    flagMock.mockReturnValue(false)

    const signal = await getHiringCandidateIdentityEvidenceCoverageGapSignal()

    expect(signal.signalId).toBe('hiring.candidate_identity.evidence_coverage_gap')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('OFF')
    expect(runQueryMock).not.toHaveBeenCalled()
  })

  it('flag ON sin gap → ok', async () => {
    flagMock.mockReturnValue(true)
    runQueryMock.mockResolvedValueOnce([{ evidence_rows: 12, missing_applications: 0 }])

    const signal = await getHiringCandidateIdentityEvidenceCoverageGapSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('data_quality')
  })

  it('flag ON con 1-3 applications sin evidencia → warning', async () => {
    flagMock.mockReturnValue(true)
    runQueryMock.mockResolvedValueOnce([{ evidence_rows: 5, missing_applications: 2 }])

    const signal = await getHiringCandidateIdentityEvidenceCoverageGapSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 application(s)')
  })

  it('flag ON con >3 gaps → error (silent-skip del write path)', async () => {
    flagMock.mockReturnValue(true)
    runQueryMock.mockResolvedValueOnce([{ evidence_rows: 5, missing_applications: 4 }])

    const signal = await getHiringCandidateIdentityEvidenceCoverageGapSignal()

    expect(signal.severity).toBe('error')
  })

  it('flag ON sin NINGUNA evidencia y applications recientes → warning con nota de flip', async () => {
    flagMock.mockReturnValue(true)
    runQueryMock.mockResolvedValueOnce([{ evidence_rows: 0, missing_applications: 1 }])

    const signal = await getHiringCandidateIdentityEvidenceCoverageGapSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('CERO filas de evidencia')
  })

  it('flag ON y query falla → unknown', async () => {
    flagMock.mockReturnValue(true)
    runQueryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringCandidateIdentityEvidenceCoverageGapSignal()

    expect(signal.severity).toBe('unknown')
  })
})

describe('getHiringCandidateIdentitySignals', () => {
  it('retorna las 2 señales y nunca lanza (cada getter degrada solo)', async () => {
    flagMock.mockReturnValue(true)
    runQueryMock.mockRejectedValue(new Error('db down'))

    const signals = await getHiringCandidateIdentitySignals()

    expect(signals).toHaveLength(2)
    expect(signals.map(signal => signal.signalId)).toEqual([
      'hiring.candidate_identity.needs_review_backlog',
      'hiring.candidate_identity.evidence_coverage_gap',
    ])
    expect(signals.every(signal => signal.severity === 'unknown')).toBe(true)
  })

  it('con flag OFF y DB sana: backlog ok + cobertura ok con nota', async () => {
    flagMock.mockReturnValue(false)
    runQueryMock.mockResolvedValueOnce([{ pending_rows: 0, pending_profiles: 0 }])

    const signals = await getHiringCandidateIdentitySignals()

    expect(signals.every(signal => signal.severity === 'ok')).toBe(true)
  })
})
