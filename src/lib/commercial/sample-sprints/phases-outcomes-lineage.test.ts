import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

import { query, withTransaction } from '@/lib/db'

import {
  completePhase,
  declarePhase,
  EngagementPhaseConflictError,
  EngagementPhaseValidationError,
  listPhasesForService
} from './phases'
import {
  EngagementOutcomeConflictError,
  EngagementOutcomeValidationError,
  getOutcomeForService,
  recordOutcome
} from './outcomes'
import {
  addLineage,
  EngagementLineageConflictError,
  EngagementLineageValidationError,
  getAncestors,
  getDescendants
} from './lineage'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>

const eligibleService = {
  service_id: 'SVC-HS-123',
  active: true,
  status: 'active',
  hubspot_sync_status: 'synced'
}

const childService = {
  service_id: 'SVC-HS-456',
  active: true,
  status: 'active',
  hubspot_sync_status: 'synced'
}

const buildClient = (responses: Array<{ rows: unknown[] }>) => {
  const queryMock = vi.fn(async (text: string) => {
    if (responses.length > 0) return responses.shift() ?? { rows: [] }
    if (text.includes('engagement_audit_log')) return { rows: [{ audit_id: 'engagement-audit-1' }] }

    return { rows: [] }
  })

  return { query: queryMock }
}

describe('engagement phases helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => {
      return run(buildClient([]))
    })
  })

  it('declares a phase after TASK-813 eligibility guard', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [{ phase_id: 'engagement-phase-1' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      declarePhase({
        serviceId: 'SVC-HS-123',
        phaseName: 'Kickoff',
        phaseKind: 'kickoff',
        phaseOrder: 1,
        startDate: '2026-05-07',
        deliverables: { access: ['ads'] }
      })
    ).resolves.toEqual({ phaseId: 'engagement-phase-1' })

    expect(client.query).toHaveBeenCalledTimes(2)
    const calls = client.query.mock.calls as unknown as Array<[string, unknown[]?]>

    expect(calls[0][0]).toContain('FROM greenhouse_core.services')
    expect(calls[1][0]).toContain('INSERT INTO greenhouse_commercial.engagement_phases')
  })

  it('rejects duplicate phase order as conflict', async () => {
    const client = buildClient([{ rows: [eligibleService] }])

    client.query.mockResolvedValueOnce({ rows: [eligibleService] })
    client.query.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'engagement_phases_service_id_phase_order_key'
      })
    )
    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      declarePhase({
        serviceId: 'SVC-HS-123',
        phaseName: 'Operation',
        phaseKind: 'operation',
        phaseOrder: 1,
        startDate: '2026-05-07'
      })
    ).rejects.toBeInstanceOf(EngagementPhaseConflictError)
  })

  it('completes a phase transactionally', async () => {
    const client = buildClient([
      { rows: [{ service_id: 'SVC-HS-123' }] },
      { rows: [eligibleService] },
      {
        rows: [
          {
            phase_id: 'engagement-phase-1',
            service_id: 'SVC-HS-123',
            phase_name: 'Kickoff',
            phase_kind: 'kickoff',
            phase_order: 1,
            start_date: '2026-05-07',
            end_date: null,
            status: 'completed',
            deliverables_json: null,
            completed_at: '2026-05-07T10:00:00.000Z',
            completed_by: 'user-1'
          }
        ]
      }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    const phase = await completePhase({
      phaseId: 'engagement-phase-1',
      completedBy: 'user-1',
      completedAt: '2026-05-07'
    })

    expect(phase.status).toBe('completed')
    const calls = client.query.mock.calls as unknown as Array<[string, unknown[]?]>

    expect(calls[2][0]).toContain("SET status = 'completed'")
    expect(calls[3][0]).toContain('INSERT INTO greenhouse_commercial.engagement_audit_log')
    expect(calls[4][0]).toContain('INSERT INTO greenhouse_sync.outbox_events')
  })

  it('filters listed phases through TASK-813 service eligibility', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await listPhasesForService('SVC-HS-123')

    const sql = String(mockedQuery.mock.calls[0][0])

    expect(sql).toContain("s.status != 'legacy_seed_archived'")
    expect(sql).toContain("s.hubspot_sync_status IS DISTINCT FROM 'unmapped'")
  })

  it('validates phase input before opening a transaction', async () => {
    await expect(
      declarePhase({
        serviceId: 'SVC-HS-123',
        phaseName: 'X',
        phaseKind: 'kickoff',
        phaseOrder: 0,
        startDate: '2026-05-07'
      })
    ).rejects.toBeInstanceOf(EngagementPhaseValidationError)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })
})

describe('engagement outcomes helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => {
      return run(buildClient([]))
    })
  })

  it('records an outcome after service eligibility guard', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [{ outcome_id: 'engagement-outcome-1' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      recordOutcome({
        serviceId: 'SVC-HS-123',
        outcomeKind: 'dropped',
        decisionDate: '2026-05-07',
        decisionRationale: 'Client declined continuation after sprint.',
        decidedBy: 'user-1'
      })
    ).resolves.toEqual({ outcomeId: 'engagement-outcome-1' })

    const calls = client.query.mock.calls as unknown as Array<[string, unknown[]?]>

    expect(calls[1][0]).toContain('INSERT INTO greenhouse_commercial.engagement_outcomes')
    expect(calls[2][0]).toContain('INSERT INTO greenhouse_commercial.engagement_audit_log')
    expect(calls[3][0]).toContain('INSERT INTO greenhouse_sync.outbox_events')
  })

  it('requires cancellation reason for cancellation outcomes', async () => {
    await expect(
      recordOutcome({
        serviceId: 'SVC-HS-123',
        outcomeKind: 'cancelled_by_client',
        decisionDate: '2026-05-07',
        decisionRationale: 'Client cancelled before reporting.',
        decidedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementOutcomeValidationError)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })

  it('validates converted outcomes have a next target', async () => {
    await expect(
      recordOutcome({
        serviceId: 'SVC-HS-123',
        outcomeKind: 'converted',
        decisionDate: '2026-05-07',
        decisionRationale: 'Client converted into ongoing service.',
        decidedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementOutcomeValidationError)
  })

  it('checks next service eligibility when converted into a child service', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [childService] },
      { rows: [{ outcome_id: 'engagement-outcome-1' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await recordOutcome({
      serviceId: 'SVC-HS-123',
      outcomeKind: 'converted',
      decisionDate: '2026-05-07',
      decisionRationale: 'Client converted into ongoing service.',
      decidedBy: 'user-1',
      nextServiceId: 'SVC-HS-456'
    })

    expect(client.query).toHaveBeenCalledTimes(7)
  })

  it('maps duplicate terminal outcomes to conflict', async () => {
    const client = buildClient([{ rows: [eligibleService] }])

    client.query.mockResolvedValueOnce({ rows: [eligibleService] })
    client.query.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'engagement_outcomes_service_unique'
      })
    )
    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      recordOutcome({
        serviceId: 'SVC-HS-123',
        outcomeKind: 'dropped',
        decisionDate: '2026-05-07',
        decisionRationale: 'Client declined continuation after sprint.',
        decidedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementOutcomeConflictError)
  })

  it('filters outcome reads through TASK-813 service eligibility', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await getOutcomeForService('SVC-HS-123')

    expect(String(mockedQuery.mock.calls[0][0])).toContain("s.status != 'legacy_seed_archived'")
  })
})

describe('engagement lineage helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedWithTransaction.mockImplementation(async (run: (client: unknown) => Promise<unknown>) => {
      return run(buildClient([]))
    })
  })

  it('adds lineage after checking both services', async () => {
    const client = buildClient([
      { rows: [eligibleService] },
      { rows: [childService] },
      { rows: [{ lineage_id: 'engagement-lineage-1' }] }
    ])

    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      addLineage({
        parentServiceId: 'SVC-HS-123',
        childServiceId: 'SVC-HS-456',
        relationshipKind: 'converted_to',
        transitionDate: '2026-05-07',
        transitionReason: 'Converted after successful sprint.',
        recordedBy: 'user-1'
      })
    ).resolves.toEqual({ lineageId: 'engagement-lineage-1' })

    expect(client.query).toHaveBeenCalledTimes(4)
  })

  it('rejects self-lineage before opening a transaction', async () => {
    await expect(
      addLineage({
        parentServiceId: 'SVC-HS-123',
        childServiceId: 'SVC-HS-123',
        relationshipKind: 'converted_to',
        transitionDate: '2026-05-07',
        transitionReason: 'Invalid self lineage test.',
        recordedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementLineageValidationError)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })

  it('maps duplicate lineage rows to conflict', async () => {
    const client = buildClient([{ rows: [eligibleService] }, { rows: [childService] }])

    client.query.mockResolvedValueOnce({ rows: [eligibleService] })
    client.query.mockResolvedValueOnce({ rows: [childService] })
    client.query.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'engagement_lineage_unique'
      })
    )
    mockedWithTransaction.mockImplementationOnce(async (run: (client: unknown) => Promise<unknown>) => run(client))

    await expect(
      addLineage({
        parentServiceId: 'SVC-HS-123',
        childServiceId: 'SVC-HS-456',
        relationshipKind: 'converted_to',
        transitionDate: '2026-05-07',
        transitionReason: 'Converted after successful sprint.',
        recordedBy: 'user-1'
      })
    ).rejects.toBeInstanceOf(EngagementLineageConflictError)
  })

  it('reads ancestors and descendants with recursive queries plus eligibility filters', async () => {
    mockedQuery.mockResolvedValue([])

    await getAncestors('SVC-HS-456')
    await getDescendants('SVC-HS-123')

    const ancestorSql = String(mockedQuery.mock.calls[0][0])
    const descendantSql = String(mockedQuery.mock.calls[1][0])

    expect(ancestorSql).toContain('WITH RECURSIVE ancestors')
    expect(descendantSql).toContain('WITH RECURSIVE descendants')
    expect(ancestorSql).toContain("parent_s.status != 'legacy_seed_archived'")
    expect(descendantSql).toContain("child_s.hubspot_sync_status IS DISTINCT FROM 'unmapped'")
  })
})
