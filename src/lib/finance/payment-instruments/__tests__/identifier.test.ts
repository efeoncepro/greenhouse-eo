import { describe, expect, it } from 'vitest'

import { resolveDisplayIdentifier } from '@/lib/finance/payment-instruments/identifier'

describe('resolveDisplayIdentifier', () => {
  it('resolves bank_account identifier from accountNumberMasked', () => {
    expect(
      resolveDisplayIdentifier(
        { accountNumberMasked: '•••• 4661', cardLastFour: null, accountNumber: null },
        'bank_account'
      )
    ).toBe('•••• 4661')
  })

  it('formats credit_card identifier from raw cardLastFour with bank-style mask', () => {
    expect(
      resolveDisplayIdentifier(
        { cardLastFour: '2505', accountNumberMasked: null },
        'credit_card'
      )
    ).toBe('•••• 2505')
  })

  it('passes through pre-masked credit_card identifier without double-masking', () => {
    expect(
      resolveDisplayIdentifier(
        { cardLastFour: '•••• 2505' },
        'credit_card'
      )
    ).toBe('•••• 2505')
  })

  it('falls back to accountNumberMasked when cardLastFour is empty', () => {
    expect(
      resolveDisplayIdentifier(
        { cardLastFour: '', accountNumberMasked: '•••• 1111' },
        'credit_card'
      )
    ).toBe('•••• 1111')
  })

  it('resolves shareholder_account identifier (TASK-700 generated number)', () => {
    expect(
      resolveDisplayIdentifier(
        { accountNumberMasked: '•••• 0001' },
        'shareholder_account'
      )
    ).toBe('•••• 0001')
  })

  it('returns null for cash (no identifier source)', () => {
    expect(
      resolveDisplayIdentifier(
        { accountNumberMasked: 'should-be-ignored', cardLastFour: 'also-ignored' },
        'cash'
      )
    ).toBeNull()
  })

  it('returns null for unknown category', () => {
    expect(
      resolveDisplayIdentifier({ accountNumberMasked: '•••• 0001' }, 'unknown_category')
    ).toBeNull()
  })

  it('returns null when category is null/undefined', () => {
    expect(resolveDisplayIdentifier({ cardLastFour: '2505' }, null)).toBeNull()
    expect(resolveDisplayIdentifier({ cardLastFour: '2505' }, undefined)).toBeNull()
  })

  it('returns null when no identifier fields are populated', () => {
    expect(
      resolveDisplayIdentifier(
        { accountNumberMasked: null, accountNumber: null, cardLastFour: null },
        'bank_account'
      )
    ).toBeNull()
  })

  it('trims whitespace before checking emptiness', () => {
    expect(
      resolveDisplayIdentifier(
        { accountNumberMasked: '   ', accountNumber: '•••• 9999' },
        'bank_account'
      )
    ).toBe('•••• 9999')
  })
})
