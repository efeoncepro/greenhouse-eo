/**
 * TASK-890 Slice 6 — tests para getIdentityRelationshipMemberContractDriftSignal.
 *
 * Paths cubiertos:
 *   1. count = 0 → severity 'ok' + summary "Sin drift"
 *   2. count > 0 → severity 'warning' + summary con count + reconciliation hint
 *   3. SQL incluye filtros canónicos (contract_type ANY, payroll_via ANY, employee, active)
 *   4. query throws → severity 'unknown' (degraded, captureWithDomain identity)
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

describe('getIdentityRelationshipMemberContractDriftSignal — TASK-890 Slice 6', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.signalId).toBe(IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID)
    expect(signal.summary).toContain('Sin drift')
  })

  it('returns warning when count > 0 + summary includes count + reconciliation hint', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 colaboradores')
    expect(signal.summary).toContain('TASK-891')
  })

  it('SQL query passes contract_type + payroll_via param arrays', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getIdentityRelationshipMemberContractDriftSignal()

    expect(queryMock).toHaveBeenCalledOnce()

    const [sql, params] = queryMock.mock.calls[0]

    expect(sql).toContain('greenhouse_core.members')
    expect(sql).toContain('greenhouse_core.person_legal_entity_relationships')
    expect(sql).toContain("rel.relationship_type = 'employee'")
    expect(sql).toContain("rel.status = 'active'")
    expect(sql).toContain('m.active = TRUE')

    const [contractTypes, payrollVias] = params as [string[], string[]]

    expect(contractTypes).toContain('contractor')
    expect(contractTypes).toContain('eor')
    expect(contractTypes).toContain('honorarios')
    expect(payrollVias).toContain('deel')
    expect(payrollVias).toContain('none')
  })

  it('singular form when count = 1', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1 }])

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

  it('evidence includes count metric + spec doc reference', async () => {
    queryMock.mockResolvedValueOnce([{ n: 7 }])

    const signal = await getIdentityRelationshipMemberContractDriftSignal()

    const evidence = signal.evidence ?? []
    const countEvidence = evidence.find(e => e.label === 'count')
    const docEvidence = evidence.find(e => e.label === 'Spec')

    expect(countEvidence?.value).toBe('7')
    expect(docEvidence?.value).toContain('GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1')
  })
})
