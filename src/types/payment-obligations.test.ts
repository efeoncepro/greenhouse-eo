import { describe, expect, it } from 'vitest'

import {
  PAYMENT_OBLIGATION_STATUSES,
  canCreatePaymentOrderFromObligationStatus
} from './payment-obligations'

describe('payment obligation order eligibility', () => {
  it('only allows obligations that can become a new payment order', () => {
    const eligible = PAYMENT_OBLIGATION_STATUSES.filter(canCreatePaymentOrderFromObligationStatus)

    expect(eligible).toEqual(['generated', 'partially_paid'])
  })
})
