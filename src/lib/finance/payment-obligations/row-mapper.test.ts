// TASK-748 — Tests for row mapper.

import { describe, expect, it } from 'vitest'

import { mapObligationRow } from './row-mapper'

describe('mapObligationRow', () => {
  const baseRow = {
    obligation_id: 'pob-abc',
    space_id: null,
    source_kind: 'payroll',
    source_ref: '2026-04',
    period_id: '2026-04',
    beneficiary_type: 'member',
    beneficiary_id: 'melkin-hernandez',
    beneficiary_name: 'Melkin Hernandez',
    obligation_kind: 'employee_net_pay',
    amount: '758.75',
    currency: 'USD',
    status: 'generated',
    due_date: '2026-04-30',
    metadata_json: { payrollEntryId: '2026-04_melkin-hernandez' },
    superseded_by: null,
    cancelled_reason: null,
    created_at: '2026-05-01T13:00:00Z',
    updated_at: '2026-05-01T13:00:00Z'
  }

  it('mapea snake_case → camelCase y normaliza tipos', () => {
    const o = mapObligationRow(baseRow)

    expect(o.obligationId).toBe('pob-abc')
    expect(o.sourceKind).toBe('payroll')
    expect(o.beneficiaryType).toBe('member')
    expect(o.amount).toBe(758.75)
    expect(o.currency).toBe('USD')
    expect(o.status).toBe('generated')
    expect(o.metadataJson).toEqual({ payrollEntryId: '2026-04_melkin-hernandez' })
  })

  it('amount como number directo', () => {
    const o = mapObligationRow({ ...baseRow, amount: 1500 })

    expect(o.amount).toBe(1500)
  })

  it('amount como string no numerico → 0', () => {
    const o = mapObligationRow({ ...baseRow, amount: 'abc' })

    expect(o.amount).toBe(0)
  })

  it('metadata vacio → {}', () => {
    const o = mapObligationRow({ ...baseRow, metadata_json: undefined as unknown as Record<string, unknown> })

    expect(o.metadataJson).toEqual({})
  })

  it('preserva nullables (space_id, period_id, superseded_by, cancelled_reason, due_date)', () => {
    const o = mapObligationRow({
      ...baseRow,
      space_id: null,
      period_id: null,
      superseded_by: null,
      cancelled_reason: null,
      due_date: null
    })

    expect(o.spaceId).toBeNull()
    expect(o.periodId).toBeNull()
    expect(o.supersededBy).toBeNull()
    expect(o.cancelledReason).toBeNull()
    expect(o.dueDate).toBeNull()
  })
})
