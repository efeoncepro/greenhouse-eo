import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1303 Slice 2 — `runRankCaptureBatch`: elegibilidad por assignment `seo_v1`,
 * per-target resilience (un target que lanza no detiene el batch) y agregación honesta
 * del summary (blocked/degraded/failed nunca se disfrazan de éxito).
 */

vi.mock('server-only', () => ({}))

const state = {
  targets: [] as Array<{ seo_target_id: string; organization_id: string }>,
  assignmentSql: ''
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    state.assignmentSql = sql

    return state.targets
  }
}))

const captureMock = vi.fn()

vi.mock('../rank-capture', () => ({
  captureRankSnapshot: (...args: unknown[]) => captureMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { SEO_RANK_CAPTURE_CRON_ACTOR, runRankCaptureBatch } from '../rank-capture-batch'

const okResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  ok: true,
  seoTargetId: 'seot-1',
  organizationId: 'org-1',
  captureDate: '2026-08-06',
  status: 'succeeded',
  eligible: 3,
  captured: 3,
  alreadyCaptured: 0,
  budgetBlocked: 0,
  providerErrors: 0,
  breakerOpen: 0,
  costUsd: 0.024,
  sourceRunId: 'seorun-x',
  outcomes: [],
  ...overrides
})

beforeEach(() => {
  state.targets = [
    { seo_target_id: 'seot-1', organization_id: 'org-1' },
    { seo_target_id: 'seot-2', organization_id: 'org-2' }
  ]
  captureMock.mockReset().mockResolvedValue(okResult())
})

describe('runRankCaptureBatch', () => {
  it('filtra elegibilidad por assignment seo_v1 vigente y ejecuta el command por target', async () => {
    const summary = await runRankCaptureBatch()

    expect(state.assignmentSql).toContain('module_assignments')
    expect(state.assignmentSql).toContain("status IN ('active', 'pilot')")
    expect(state.assignmentSql).toContain('effective_to IS NULL')

    expect(captureMock).toHaveBeenCalledTimes(2)
    expect(captureMock).toHaveBeenCalledWith('seot-1', SEO_RANK_CAPTURE_CRON_ACTOR, { captureDate: undefined })
    expect(summary.targets).toBe(2)
    expect(summary.succeededTargets).toBe(2)
    expect(summary.snapshots).toBe(6)
    expect(summary.costUsd).toBeCloseTo(0.048, 10)
  })

  it('per-target resilience: un target que LANZA no detiene el batch', async () => {
    captureMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(okResult({ seoTargetId: 'seot-2', organizationId: 'org-2' }))

    const summary = await runRankCaptureBatch()

    expect(captureMock).toHaveBeenCalledTimes(2)
    expect(summary.failedTargets).toBe(1)
    expect(summary.succeededTargets).toBe(1)
    expect(summary.outcomes[0]).toMatchObject({ seoTargetId: 'seot-1', status: 'failed', errorCode: 'unexpected_error' })
  })

  it('degradación declarada por el command (ok:false) se registra como blocked con su código', async () => {
    captureMock
      .mockResolvedValueOnce({ ok: false, errorCode: 'budget_exhausted', status: null })
      .mockResolvedValueOnce(okResult({ seoTargetId: 'seot-2', organizationId: 'org-2', status: 'degraded', captured: 0 }))

    const summary = await runRankCaptureBatch()

    expect(summary.blockedTargets).toBe(1)
    expect(summary.degradedTargets).toBe(1)
    expect(summary.succeededTargets).toBe(0)
    expect(summary.outcomes[0]).toMatchObject({ status: 'blocked', errorCode: 'budget_exhausted' })
  })

  it('propaga captureDate explícito y maxTargets acota la iteración', async () => {
    await runRankCaptureBatch({ captureDate: '2026-08-01', maxTargets: 1 })

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith('seot-1', SEO_RANK_CAPTURE_CRON_ACTOR, { captureDate: '2026-08-01' })
  })
})
