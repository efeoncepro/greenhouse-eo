/**
 * TASK-890 Slice 6 + TASK-891 Slice 5 — tests para
 * getIdentityRelationshipMemberContractDriftSignal con auto-escalation.
 *
 * Paths cubiertos:
 *   1. count = 0 → severity 'ok' + summary "Sin drift"
 *   2. count > 0 AND age < 30d → severity 'warning' (drift reciente)
 *   3. count > 0 AND age >= 30d → severity 'error' (drift sostenido, TASK-891)
 *   4. SQL incluye filtros canónicos + oldest_drift_age_days computation
 *   5. query throws → severity 'unknown' (degraded, captureWithDomain identity)
 *   6. Summary diferenciado per severity
 *   7. Evidence incluye sustained_threshold_days + oldest_drift_age_days
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import {
  IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID,
  getIdentityRelationshipMemberContractDriftSignal
} from './identity-relationship-member-contract-drift'

beforeEach(() => {
  queryMock.mockReset()
  captureMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getIdentityRelationshipMemberContractDriftSignal — TASK-890 Slice 6 + TASK-891 Slice 5', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0, oldest_drift_age_days: 0 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.signalId).toBe(IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID)
    expect(signal.summary).toContain('Sin drift')
  })

  it('returns warning when count > 0 AND oldest drift age < 30d (recent drift)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3, oldest_drift_age_days: 5 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 colaboradores')
    expect(signal.summary).toContain('TASK-891')
    expect(signal.summary).not.toContain('sostenido')
  })

  it('TASK-891 auto-escalation: severity error when count > 0 AND oldest age >= 30d (sustained drift)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2, oldest_drift_age_days: 45 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2 colaboradores')
    expect(signal.summary).toContain('sostenido')
    expect(signal.summary).toContain('30 días')
    expect(signal.summary).toContain('Admin > Operations')
  })

  it('boundary case: oldest age = exactly 30d → error (>= threshold)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1, oldest_drift_age_days: 30 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('error')
  })

  it('boundary case: oldest age = 29d → warning (< threshold)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1, oldest_drift_age_days: 29 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('warning')
  })

  it('SQL query passes contract_type + payroll_via param arrays + computes oldest_drift_age_days', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0, oldest_drift_age_days: 0 }])

    await getIdentityRelationshipMemberContractDriftSignal()

    expect(queryMock).toHaveBeenCalledOnce()

    const [sql, params] = queryMock.mock.calls[0]

    expect(sql).toContain('greenhouse_core.members')
    expect(sql).toContain('greenhouse_core.person_legal_entity_relationships')
    expect(sql).toContain("rel.relationship_type = 'employee'")
    expect(sql).toContain("rel.status = 'active'")
    expect(sql).toContain('m.active = TRUE')
    expect(sql).toContain('oldest_drift_age_days')
    expect(sql).toContain('GREATEST(m.updated_at, rel.updated_at)')

    const [contractTypes, payrollVias] = params as [string[], string[]]

    expect(contractTypes).toContain('contractor')
    expect(contractTypes).toContain('eor')
    expect(contractTypes).toContain('honorarios')
    expect(payrollVias).toContain('deel')
    expect(payrollVias).toContain('none')
  })

  it('singular form when count = 1', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1, oldest_drift_age_days: 5 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('1 colaborador con')
    expect(signal.summary).not.toContain('1 colaboradores')
  })

  it('degrades to unknown when query throws + captures to identity domain', async () => {
    const error = new Error('Postgres timeout')

    queryMock.mockRejectedValueOnce(error)

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible leer')

    expect(captureMock).toHaveBeenCalledWith(error, 'identity', {
      tags: { source: 'reliability_signal_member_contract_drift' }
    })
  })

  it('evidence includes count + oldest_drift_age_days + sustained_threshold_days + updated spec ref', async () => {
    queryMock.mockResolvedValueOnce([{ n: 7, oldest_drift_age_days: 12 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    const evidence = signal.evidence ?? []
    const countEvidence = evidence.find(e => e.label === 'count')
    const oldestAgeEvidence = evidence.find(e => e.label === 'oldest_drift_age_days')
    const thresholdEvidence = evidence.find(e => e.label === 'sustained_threshold_days')
    const docEvidence = evidence.find(e => e.label === 'Spec')

    expect(countEvidence?.value).toBe('7')
    expect(oldestAgeEvidence?.value).toBe('12')
    expect(thresholdEvidence?.value).toBe('30')
    expect(docEvidence?.value).toContain('GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1')
  })
})
