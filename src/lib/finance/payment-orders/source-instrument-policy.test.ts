import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { PaymentOrderValidationError } from './errors'
import { resolvePaymentOrderSourcePolicy } from './source-instrument-policy'

type SourcePolicyClient = Parameters<typeof resolvePaymentOrderSourcePolicy>[0]

type AccountRow = Record<string, unknown> & {
  account_id: string
  currency: string
  instrument_category: string
  provider_slug: string | null
  is_active: boolean
  default_for: string[] | null
}

const rows: AccountRow[] = [
  {
    account_id: 'deel-clp',
    currency: 'CLP',
    instrument_category: 'payment_platform',
    provider_slug: 'deel',
    is_active: true,
    default_for: ['payroll']
  },
  {
    account_id: 'global66-clp',
    currency: 'CLP',
    instrument_category: 'fintech',
    provider_slug: 'global66',
    is_active: true,
    default_for: ['payroll']
  },
  {
    account_id: 'santander-corp-clp',
    currency: 'CLP',
    instrument_category: 'credit_card',
    provider_slug: 'mastercard',
    is_active: true,
    default_for: ['supplier_payment']
  },
  {
    account_id: 'previred-clp',
    currency: 'CLP',
    instrument_category: 'payroll_processor',
    provider_slug: 'previred',
    is_active: true,
    default_for: ['payroll']
  }
]

const makeClient = (): SourcePolicyClient => ({
  query: async <T extends Record<string, unknown>>(sql: string, values: unknown[] = []) => {
    if (sql.includes('account_id = $1')) {
      return { rows: rows.filter(row => row.account_id === values[0]) as T[] }
    }

    if (sql.includes("account_id = 'santander-corp-clp'")) {
      return { rows: rows.filter(row => row.account_id === 'santander-corp-clp').slice(0, 1) as T[] }
    }

    if (sql.includes("provider_slug = 'global66' AND currency = $1")) {
      return { rows: rows.filter(row => row.provider_slug === 'global66' && row.currency === values[0]).slice(0, 1) as T[] }
    }

    if (sql.includes("provider_slug = 'global66'")) {
      return { rows: rows.filter(row => row.provider_slug === 'global66').slice(0, 1) as T[] }
    }

    return { rows: [] as T[] }
  }
})

describe('resolvePaymentOrderSourcePolicy', () => {
  it('defaults Deel orders to Santander corporate card, not Deel', async () => {
    const result = await resolvePaymentOrderSourcePolicy(makeClient(), {
      processorSlug: 'deel',
      paymentMethod: 'deel',
      currency: 'USD'
    })

    expect(result.sourceAccountId).toBe('santander-corp-clp')
    expect(result.snapshot.reason).toBe('default_deel_corporate_card')
  })

  it('rejects Deel as source instrument for Deel rail', async () => {
    await expect(
      resolvePaymentOrderSourcePolicy(makeClient(), {
        processorSlug: 'deel',
        paymentMethod: 'deel',
        currency: 'USD',
        sourceAccountId: 'deel-clp'
      })
    ).rejects.toMatchObject({
      code: 'processor_cannot_be_source_account'
    } satisfies Partial<PaymentOrderValidationError>)
  })

  it('rejects Deel as source instrument even when the order was created with a legacy generic rail', async () => {
    await expect(
      resolvePaymentOrderSourcePolicy(makeClient(), {
        processorSlug: null,
        paymentMethod: 'bank_transfer',
        currency: 'CLP',
        sourceAccountId: 'deel-clp'
      })
    ).rejects.toMatchObject({
      code: 'processor_cannot_be_source_account'
    } satisfies Partial<PaymentOrderValidationError>)
  })

  it('allows Global66 active fintech as source instrument', async () => {
    const result = await resolvePaymentOrderSourcePolicy(makeClient(), {
      processorSlug: 'global66',
      paymentMethod: 'global66',
      currency: 'USD'
    })

    expect(result.sourceAccountId).toBe('global66-clp')
    expect(result.snapshot.reason).toBe('default_global66_active_account')
  })

  it('rejects payroll processors as source instruments', async () => {
    await expect(
      resolvePaymentOrderSourcePolicy(makeClient(), {
        processorSlug: 'previred',
        paymentMethod: 'bank_transfer',
        currency: 'CLP',
        sourceAccountId: 'previred-clp'
      })
    ).rejects.toMatchObject({
      code: 'processor_cannot_be_source_account'
    } satisfies Partial<PaymentOrderValidationError>)
  })
})
