/**
 * TASK-892 Slice 2 — tests para getOffboardingCompletenessPartialSignal.
 *
 * Paths cubiertos:
 *   1. count = 0 → severity 'ok' + summary "Sin cases"
 *   2. count > 0 → severity 'warning' + summary con pluralizacion correcta
 *   3. SQL incluye filtros canonicos: status terminal + member.active + non-employee contract + employee relacion activa
 *   4. query throws → severity 'unknown' (degraded, captureWithDomain identity)
 *   5. Evidence incluye threshold + sets de contract types canonical
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
  OFFBOARDING_COMPLETENESS_PARTIAL_SIGNAL_ID,
  getOffboardingCompletenessPartialSignal
} from './offboarding-completeness-partial'

beforeEach(() => {
  queryMock.mockReset()
  captureMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getOffboardingCompletenessPartialSignal — TASK-892 Slice 2', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getOffboardingCompletenessPartialSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.signalId).toBe(OFFBOARDING_COMPLETENESS_PARTIAL_SIGNAL_ID)
    expect(signal.summary).toContain('Sin cases terminales')
  })

  it('returns warning when count > 0 (case-level partial)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1 }])

    const signal = await getOffboardingCompletenessPartialSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('1 case terminal con cierre parcial')
  })

  it('pluraliza correctamente cuando count > 1', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getOffboardingCompletenessPartialSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 cases terminales con cierre parcial')
  })

  it('SQL query usa filtros canonicos (case status terminal + active member + non-employee contract + employee relation activa)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getOffboardingCompletenessPartialSignal()

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]

    // Tablas canonicas
    expect(sql).toContain('greenhouse_hr.work_relationship_offboarding_cases')
    expect(sql).toContain('greenhouse_core.members')
    expect(sql).toContain('greenhouse_core.person_legal_entity_relationships')

    // Filtros canonicos
    expect(sql).toContain("c.status IN ('executed', 'cancelled')")
    expect(sql).toContain('m.active = TRUE')
    expect(sql).toContain('m.identity_profile_id IS NOT NULL')
    expect(sql).toContain("rel.relationship_type = 'employee'")
    expect(sql).toContain("rel.status = 'active'")
    expect(sql).toContain('rel.effective_to IS NULL OR rel.effective_to > NOW()')

    // Params canonical sets
    expect(params).toEqual([
      ['contractor', 'eor', 'honorarios'],
      ['deel', 'none']
    ])
  })

  it('returns unknown + captureWithDomain identity cuando query falla', async () => {
    const err = new Error('connection timeout')

    queryMock.mockRejectedValueOnce(err)

    const signal = await getOffboardingCompletenessPartialSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock.mock.calls[0][0]).toBe(err)
    expect(captureMock.mock.calls[0][1]).toBe('identity')
    expect(captureMock.mock.calls[0][2]?.tags?.source).toBe(
      'reliability_signal_offboarding_completeness_partial'
    )
  })

  it('evidence incluye contract types + spec doc reference', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getOffboardingCompletenessPartialSignal()

    const contractTypes = signal.evidence?.find(e => e.label === 'non_employee_contract_types')

    expect(contractTypes?.value).toBe('contractor, eor, honorarios')

    const payrollVia = signal.evidence?.find(e => e.label === 'non_internal_payroll_via')

    expect(payrollVia?.value).toBe('deel, none')

    const spec = signal.evidence?.find(e => e.label === 'Spec')

    expect(spec?.value).toContain('TASK-892')
  })

  it('signalId es el canonical id', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getOffboardingCompletenessPartialSignal()

    expect(signal.signalId).toBe('hr.offboarding.completeness_partial')
  })

  it('observedAt es ISO timestamp', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getOffboardingCompletenessPartialSignal()

    expect(signal.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
