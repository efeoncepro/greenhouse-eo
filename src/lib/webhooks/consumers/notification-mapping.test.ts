import { describe, expect, it } from 'vitest'

import { findNotificationMapping, NOTIFICATION_EVENT_TYPES } from './notification-mapping'
import type { WebhookEnvelope } from '@/lib/webhooks/types'

const makeEnvelope = (overrides: Partial<WebhookEnvelope> = {}): WebhookEnvelope => ({
  eventId: 'evt-1',
  eventType: 'payroll_period.exported',
  aggregateType: 'payroll_period',
  aggregateId: '2026-03',
  occurredAt: '2026-03-29T10:00:00.000Z',
  version: 1,
  source: 'greenhouse',
  data: {
    periodId: '2026-03',
    year: 2026,
    month: 3
  },
  ...overrides
})

describe('notification mappings', () => {
  it('exposes the expected first-lot event types', () => {
    expect(NOTIFICATION_EVENT_TYPES).toEqual([
      'assignment.created',
      'assignment.updated',
      'assignment.removed',
      'compensation_version.created',
      'member.created',
      'finance.income_payment.recorded',
      'finance.expense.created',
      'finance.dte.discrepancy_found',
      'finance.income.created',
      'finance.exchange_rate.upserted',
      'finance.credit_note.created',
      'finance.purchase_order.expiring',
      'finance.purchase_order.consumed',
      'finance.hes.approved',
      'finance.hes.rejected',
      'finance.sii_claim.detected',
      'finance.balance_divergence.detected',
      'identity.email_verification.completed',
      'payroll_period.exported'
    ])
  })

  it('returns null for unmapped events', () => {
    expect(findNotificationMapping('service.created')).toBeNull()
  })

  it('builds the payroll exported title and action url', () => {
    const mapping = findNotificationMapping('payroll_period.exported')

    expect(mapping).not.toBeNull()
    expect(mapping?.title(makeEnvelope())).toBe('Tu nómina de marzo de 2026 está lista')
    expect(mapping?.actionUrl?.(makeEnvelope())).toBe('/my/payroll')
  })

  it('builds the member-created action url from the member id', () => {
    const mapping = findNotificationMapping('member.created')

    expect(mapping?.actionUrl?.(makeEnvelope({
      eventType: 'member.created',
      aggregateType: 'member',
      aggregateId: 'member-julio',
      data: {
        memberId: 'member-julio',
        displayName: 'Julio Reyes'
      }
    }))).toBe('/people/member-julio')
  })

  it('keeps income-related action urls aligned with the deep-link resolver output', () => {
    const paymentRecorded = findNotificationMapping('finance.income_payment.recorded')
    const incomeCreated = findNotificationMapping('finance.income.created')
    const balanceDivergence = findNotificationMapping('finance.balance_divergence.detected')

    expect(paymentRecorded?.actionUrl?.(makeEnvelope({
      eventType: 'finance.income_payment.recorded',
      aggregateType: 'income_payment',
      aggregateId: 'pay-1',
      data: {
        incomeId: 'inc-100'
      }
    }))).toBe('/finance/income/inc-100')

    expect(incomeCreated?.actionUrl?.(makeEnvelope({
      eventType: 'finance.income.created',
      aggregateType: 'income',
      aggregateId: 'inc-200',
      data: {
        incomeId: 'inc-200'
      }
    }))).toBe('/finance/income/inc-200')

    expect(balanceDivergence?.actionUrl?.(makeEnvelope({
      eventType: 'finance.balance_divergence.detected',
      aggregateType: 'income',
      aggregateId: 'inc-300',
      data: {}
    }))).toBe('/finance/income')
  })

  it('keeps expense-related action urls aligned with the deep-link resolver output', () => {
    const expenseCreated = findNotificationMapping('finance.expense.created')
    const siiClaim = findNotificationMapping('finance.sii_claim.detected')

    expect(expenseCreated?.actionUrl?.(makeEnvelope({
      eventType: 'finance.expense.created',
      aggregateType: 'expense',
      aggregateId: 'exp-100',
      data: {
        expenseId: 'exp-100'
      }
    }))).toBe('/finance/expenses/exp-100')

    expect(siiClaim?.actionUrl?.(makeEnvelope({
      eventType: 'finance.sii_claim.detected',
      aggregateType: 'expense',
      aggregateId: 'exp-200',
      data: {}
    }))).toBe('/finance/expenses')
  })
})
