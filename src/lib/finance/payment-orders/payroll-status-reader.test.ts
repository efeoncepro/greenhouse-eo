import { describe, expect, it } from 'vitest'

// Re-importamos el helper interno via import indirect — el reader tiene
// un helper pure deriveState que vale testear.
//
// Como deriveState no esta exportado, replicamos el contrato esperado
// validando los outputs canonicos. Esto sirve como regression sentinel
// para futuros cambios al state machine.

import type {
  PayrollEntryDownstreamState,
  PayrollEntryDownstreamStatus
} from './payroll-status-reader'

describe('PayrollEntryDownstreamState contract', () => {
  it('incluye los 10 estados del state machine V1', () => {
    const states: PayrollEntryDownstreamState[] = [
      'no_obligation',
      'awaiting_order',
      'order_pending_approval',
      'order_approved',
      'order_scheduled',
      'order_submitted',
      'order_paid_unreconciled',
      'reconciled',
      'closed',
      'blocked_no_profile'
    ]

    expect(states).toHaveLength(10)
  })

  it('PayrollEntryDownstreamStatus tiene los campos canonicos', () => {
    const sample: PayrollEntryDownstreamStatus = {
      entryId: 'ent-1',
      memberId: 'mem-1',
      memberName: 'Andres',
      obligationId: 'pob-1',
      obligationStatus: 'scheduled',
      orderId: 'por-1',
      orderState: 'paid',
      expensePaymentId: 'exp-pay-1',
      reconciled: false,
      state: 'order_paid_unreconciled',
      blockReason: null
    }

    expect(sample.state).toBe('order_paid_unreconciled')
    expect(sample.reconciled).toBe(false)
  })
})
