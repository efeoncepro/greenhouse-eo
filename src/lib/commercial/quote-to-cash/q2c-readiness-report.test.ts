/**
 * TASK-1206 Slice 1 — readiness report (read-only) flag logic + agregados.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }))

import { buildQ2CReadinessRow, getQuoteToCashReadinessReport } from './q2c-readiness-report'

afterEach(() => vi.clearAllMocks())

const base = {
  quotation_id: 'q-1',
  status: 'issued',
  organization_id: 'org-1',
  hubspot_deal_id: 'deal-1',
  converted_to_income_id: null,
  contract_id: 'ctr-1',
  has_q2c_audit: false,
  q2c_audit_status: null
}

describe('buildQ2CReadinessRow', () => {
  it('issued con org → canCloseSimple; con deal → NO issuedWithoutDeal', () => {
    const r = buildQ2CReadinessRow(base)

    expect(r.canCloseSimple).toBe(true)
    expect(r.issuedWithoutDeal).toBe(false)
  })

  it('issued sin deal → issuedWithoutDeal (no lo puede cerrar el autopromoter)', () => {
    const r = buildQ2CReadinessRow({ ...base, hubspot_deal_id: null })

    expect(r.issuedWithoutDeal).toBe(true)
  })

  it('issued sin org → NO canCloseSimple', () => {
    const r = buildQ2CReadinessRow({ ...base, organization_id: null })

    expect(r.canCloseSimple).toBe(false)
  })

  it('converted sin income → convertedWithoutIncome (AR faltante)', () => {
    const r = buildQ2CReadinessRow({ ...base, status: 'converted', converted_to_income_id: null })

    expect(r.convertedWithoutIncome).toBe(true)
    expect(r.canCloseSimple).toBe(false)
  })

  it('converted sin audit → convertedWithoutAudit (se saltó el substrate)', () => {
    const r = buildQ2CReadinessRow({
      ...base,
      status: 'converted',
      converted_to_income_id: 'INC-1',
      has_q2c_audit: false
    })

    expect(r.convertedWithoutAudit).toBe(true)
    expect(r.convertedWithoutIncome).toBe(false)
  })

  it('Q2C suspendido en contract_only → contractOnlySuspended', () => {
    const r = buildQ2CReadinessRow({ ...base, has_q2c_audit: true, q2c_audit_status: 'suspended' })

    expect(r.contractOnlySuspended).toBe(true)
  })
})

describe('getQuoteToCashReadinessReport', () => {
  it('agrega los totales desde las filas', async () => {
    queryMock.mockResolvedValue([
      base,
      { ...base, quotation_id: 'q-2', hubspot_deal_id: null },
      { ...base, quotation_id: 'q-3', status: 'converted', converted_to_income_id: null }
    ])

    const report = await getQuoteToCashReadinessReport()

    expect(report.totals.rows).toBe(3)
    expect(report.totals.issuedWithoutDeal).toBe(1)
    expect(report.totals.convertedWithoutIncome).toBe(1)
    expect(report.totals.canCloseSimple).toBe(2)
  })
})
