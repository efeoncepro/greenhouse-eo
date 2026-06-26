import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1244 Slice 2 — comandos del gate humano de release (approve/reject).
 * Cubre: only-review_required (not_reviewable), reason obligatoria en reject, happy-path
 * (audit insert + publish + delivery state), idempotencia (re-aprobar re-drivea publish sin
 * doble insert) y el anti-flip terminal (approved→reject inválido). El LLM nunca aprueba:
 * el comando exige `reviewedByUserId`.
 */

const state = {
  gate: 'review_required' as string,
  reviewState: 'pending' as 'pending' | 'approved' | 'rejected',
}

const spies = {
  insert: vi.fn(),
  publish: vi.fn(),
  setDelivery: vi.fn(),
  handoff: vi.fn(),
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    if (sql.includes('INSERT INTO greenhouse_growth.grader_report_reviews')) spies.insert(params)

    return []
  },
}))

vi.mock('../report/command', () => {
  class GraderReportError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }

  return {
    GraderReportError,
    readGraderReport: async () => ({
      report: { runId: 'grun-1', scoreVersion: 'v1', gate: { status: state.gate } },
    }),
  }
})

vi.mock('../report/snapshot', () => ({
  publishGraderReportSnapshot: async (input: unknown) => {
    spies.publish(input)

    return { reportToken: 'grt-xyz' }
  },
}))

vi.mock('../public-delivery/finalize-delivery', () => ({
  setPublicDeliveryState: async (runId: string, deliveryState: string) => {
    spies.setDelivery(runId, deliveryState)
  },
}))

vi.mock('../hubspot/command', () => ({
  syncAiVisibilityRunToHubSpot: async (input: unknown) => {
    spies.handoff(input)

    return { status: 'requested', runId: 'grun-1' }
  },
}))

vi.mock('../review/queries', () => ({
  readReportReviewState: async () => state.reviewState,
}))

const load = async () => await import('../review/commands')

beforeEach(() => {
  state.gate = 'review_required'
  state.reviewState = 'pending'
  spies.insert.mockClear()
  spies.publish.mockClear()
  spies.setDelivery.mockClear()
  spies.handoff.mockClear()
})

describe('TASK-1244 — approveAiVisibilityReport', () => {
  it('pending → aprueba: audit insert + publish + delivery ready + handoff', async () => {
    const { approveAiVisibilityReport } = await load()
    const result = await approveAiVisibilityReport({ runId: 'grun-1', reviewedByUserId: 'user-1' })

    expect(result).toEqual({ runId: 'grun-1', scoreVersion: 'v1', state: 'approved', reportToken: 'grt-xyz' })
    expect(spies.insert).toHaveBeenCalledTimes(1)
    expect(spies.publish).toHaveBeenCalledWith({ runId: 'grun-1', createdBy: 'user-1' })
    expect(spies.setDelivery).toHaveBeenCalledWith('grun-1', 'ready')
    expect(spies.handoff).toHaveBeenCalledWith({ runId: 'grun-1', trigger: 'report_published' })
  })

  it('idempotente: ya aprobado → NO re-inserta pero re-drivea publish + ready (recovery)', async () => {
    state.reviewState = 'approved'

    const { approveAiVisibilityReport } = await load()

    await approveAiVisibilityReport({ runId: 'grun-1', reviewedByUserId: 'user-1' })
    expect(spies.insert).not.toHaveBeenCalled()
    expect(spies.publish).toHaveBeenCalledTimes(1)
    expect(spies.setDelivery).toHaveBeenCalledWith('grun-1', 'ready')
  })

  it('gate completed (no review_required) → not_reviewable, no publica', async () => {
    state.gate = 'completed'

    const { approveAiVisibilityReport } = await load()
    const { ReportReviewError } = await import('../review/state')

    await expect(approveAiVisibilityReport({ runId: 'grun-1', reviewedByUserId: 'user-1' })).rejects.toMatchObject({
      code: 'not_reviewable',
    })
    void ReportReviewError
    expect(spies.publish).not.toHaveBeenCalled()
  })

  it('anti-flip: ya rechazado → approve inválido (invalid_transition)', async () => {
    state.reviewState = 'rejected'

    const { approveAiVisibilityReport } = await load()

    await expect(approveAiVisibilityReport({ runId: 'grun-1', reviewedByUserId: 'user-1' })).rejects.toMatchObject({
      code: 'invalid_transition',
    })
    expect(spies.publish).not.toHaveBeenCalled()
  })
})

describe('TASK-1244 — rejectAiVisibilityReport', () => {
  it('pending + reason → rechaza: audit insert + delivery unavailable, NUNCA publica', async () => {
    const { rejectAiVisibilityReport } = await load()

    const result = await rejectAiVisibilityReport({
      runId: 'grun-1',
      reviewedByUserId: 'user-1',
      reason: 'Afirma un beneficio no verificable.',
    })

    expect(result).toEqual({ runId: 'grun-1', scoreVersion: 'v1', state: 'rejected' })
    expect(spies.insert).toHaveBeenCalledTimes(1)
    expect(spies.setDelivery).toHaveBeenCalledWith('grun-1', 'unavailable')
    expect(spies.publish).not.toHaveBeenCalled()
  })

  it('sin reason → reason_required (no inserta)', async () => {
    const { rejectAiVisibilityReport } = await load()

    await expect(
      rejectAiVisibilityReport({ runId: 'grun-1', reviewedByUserId: 'user-1', reason: '   ' })
    ).rejects.toMatchObject({ code: 'reason_required' })
    expect(spies.insert).not.toHaveBeenCalled()
  })

  it('anti-flip: ya aprobado → reject inválido (invalid_transition)', async () => {
    state.reviewState = 'approved'

    const { rejectAiVisibilityReport } = await load()

    await expect(
      rejectAiVisibilityReport({ runId: 'grun-1', reviewedByUserId: 'user-1', reason: 'x' })
    ).rejects.toMatchObject({ code: 'invalid_transition' })
  })
})
