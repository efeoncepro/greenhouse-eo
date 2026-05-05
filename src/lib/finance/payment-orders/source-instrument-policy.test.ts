import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { PaymentOrderValidationError } from './errors'
import {
  listPaymentOrderSourceInstrumentOptions,
  resolvePaymentOrderSourcePolicy
} from './source-instrument-policy'

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
    if (sql.includes('payment_order_processor_funding_policies')) {
      const rail = values[0]
      const currency = values[1]
      const sourceAccountId = values[2]
      const matchesDeel = rail === 'deel' && (currency === 'USD' || currency === 'CLP')
      const source = rows.find(row => row.account_id === 'santander-corp-clp')
      const intermediary = rows.find(row => row.account_id === 'deel-clp')

      if (!matchesDeel || !source || !intermediary) return { rows: [] as T[] }
      if (sourceAccountId && sourceAccountId !== source.account_id) return { rows: [] as T[] }

      return {
        rows: ([{
          policy_id: `popfp-deel-${String(currency).toLowerCase()}-santander-corp`,
          processor_slug: 'deel',
          payment_method: 'deel',
          order_currency: currency,
          source_account_id: source.account_id,
          intermediary_account_id: intermediary.account_id,
          settlement_mode: 'via_intermediary',
          priority: 10,
          notes: 'Deel funded by Santander Corp',
          source_account_name: 'Santander Corp.',
          source_bank_name: 'Santander Corp.',
          source_currency: source.currency,
          source_instrument_category: source.instrument_category,
          source_provider_slug: source.provider_slug,
          source_is_active: source.is_active,
          source_default_for: source.default_for,
          intermediary_account_name: 'Deel',
          intermediary_bank_name: 'Deel',
          intermediary_currency: intermediary.currency,
          intermediary_instrument_category: intermediary.instrument_category,
          intermediary_provider_slug: intermediary.provider_slug,
          intermediary_is_active: intermediary.is_active
        }] as unknown) as T[]
      }
    }

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
  it('defaults Deel orders to configured Santander corporate funding policy, not Deel', async () => {
    const result = await resolvePaymentOrderSourcePolicy(makeClient(), {
      processorSlug: 'deel',
      paymentMethod: 'deel',
      currency: 'USD'
    })

    expect(result.sourceAccountId).toBe('santander-corp-clp')
    expect(result.snapshot.reason).toBe('default_processor_policy:popfp-deel-usd-santander-corp')
    expect(result.snapshot.intermediaryAccountId).toBe('deel-clp')
    expect(result.settlementConfig).toMatchObject({
      settlementMode: 'via_intermediary',
      fundingInstrumentId: 'santander-corp-clp',
      intermediaryInstrumentId: 'deel-clp',
      intermediaryMode: 'counterparty_only'
    })
  })

  it('keeps Deel settlement policy when source account is explicitly assigned', async () => {
    const result = await resolvePaymentOrderSourcePolicy(makeClient(), {
      processorSlug: null,
      paymentMethod: 'deel',
      currency: 'USD',
      sourceAccountId: 'santander-corp-clp'
    })

    expect(result.sourceAccountId).toBe('santander-corp-clp')
    expect(result.snapshot.reason).toBe('explicit_source_account_with_processor_policy')
    expect(result.settlementConfig?.intermediaryInstrumentId).toBe('deel-clp')
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

  it('lists Deel source options from processor funding policy only', async () => {
    const options = await listPaymentOrderSourceInstrumentOptions(makeClient(), {
      processorSlug: 'deel',
      paymentMethod: 'deel',
      currency: 'USD'
    })

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      accountId: 'santander-corp-clp',
      recommended: true,
      settlementMode: 'via_intermediary',
      intermediaryAccountId: 'deel-clp'
    })
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
