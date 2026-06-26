import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1244 Slice 2 — `publishGraderReportSnapshot` honra el gate humano de release.
 * Frontera de SEGURIDAD YMYL: un `review_required` SÓLO se publica con aprobación vigente;
 * `insufficient_data` NUNCA (no hay revisión que lo desbloquee); `completed` publica directo.
 */

const state = {
  gate: 'completed' as string,
  approved: false,
}

const spies = { publishInsert: vi.fn(), isApproved: vi.fn() }

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (sql.includes('INSERT INTO greenhouse_growth.grader_reports')) {
      spies.publishInsert()

      return [
        {
          report_id: 'grpt-1',
          report_token: 'grt-abc',
          as_of: '2026-06-26T00:00:00.000Z',
          expires_at: null,
          public_report_json: { ok: true },
        },
      ]
    }

    return []
  },
}))

vi.mock('../report/command', () => ({
  readGraderReport: async () => ({
    report: {
      runId: 'grun-1',
      scoreVersion: 'v1',
      reportVersion: 'r1',
      recommendationPackVersion: 'p1',
      gate: { status: state.gate },
    },
    publicReport: { ok: true },
  }),
}))

vi.mock('../review/queries', () => ({
  isReportReviewApproved: async (runId: string, scoreVersion: string) => {
    spies.isApproved(runId, scoreVersion)

    return state.approved
  },
}))

const load = async () => await import('../report/snapshot')

beforeEach(() => {
  state.gate = 'completed'
  state.approved = false
  spies.publishInsert.mockClear()
  spies.isApproved.mockClear()
})

describe('TASK-1244 — publish honra la aprobación', () => {
  it('completed → publica directo (sin consultar aprobación)', async () => {
    const { publishGraderReportSnapshot } = await load()
    const snap = await publishGraderReportSnapshot({ runId: 'grun-1' })

    expect(snap.reportToken).toBe('grt-abc')
    expect(spies.publishInsert).toHaveBeenCalledTimes(1)
    expect(spies.isApproved).not.toHaveBeenCalled()
  })

  it('review_required + aprobado → publica', async () => {
    state.gate = 'review_required'
    state.approved = true

    const { publishGraderReportSnapshot } = await load()
    const snap = await publishGraderReportSnapshot({ runId: 'grun-1' })

    expect(snap.reportToken).toBe('grt-abc')
    expect(spies.isApproved).toHaveBeenCalledWith('grun-1', 'v1')
    expect(spies.publishInsert).toHaveBeenCalledTimes(1)
  })

  it('review_required SIN aprobar → not_releasable (no publica)', async () => {
    state.gate = 'review_required'
    state.approved = false

    const { publishGraderReportSnapshot, GraderSnapshotError } = await load()

    await expect(publishGraderReportSnapshot({ runId: 'grun-1' })).rejects.toBeInstanceOf(GraderSnapshotError)
    expect(spies.publishInsert).not.toHaveBeenCalled()
  })

  it('insufficient_data → not_releasable aunque "aprobado" (jamás publicable)', async () => {
    state.gate = 'insufficient_data'
    state.approved = true

    const { publishGraderReportSnapshot, GraderSnapshotError } = await load()

    await expect(publishGraderReportSnapshot({ runId: 'grun-1' })).rejects.toBeInstanceOf(GraderSnapshotError)
    expect(spies.isApproved).not.toHaveBeenCalled()
    expect(spies.publishInsert).not.toHaveBeenCalled()
  })
})
