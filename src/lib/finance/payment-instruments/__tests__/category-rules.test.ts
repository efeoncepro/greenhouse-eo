import { describe, expect, it } from 'vitest'

import {
  getCategoryProviderRule,
  hasFixedProvider
} from '@/lib/finance/payment-instruments/category-rules'

describe('getCategoryProviderRule', () => {
  it('returns the shareholder rule with greenhouse pre-assigned', () => {
    const rule = getCategoryProviderRule('shareholder_account')

    expect(rule).not.toBeNull()
    expect(rule?.requiresProvider).toBe(true)
    expect(rule?.providerLabel).toBe('Plataforma')
    expect(rule?.providerTypesAllowed).toEqual(['platform_operator'])
    expect(rule?.defaultProviderSlug).toBe('greenhouse')
    expect(rule?.requiresCounterparty).toBe(true)
    expect(rule?.counterpartyKind).toBe('identity_profile')
    expect(rule?.counterpartyLabel).toBe('Accionista')
  })

  it('returns the bank_account rule with no fixed provider and no counterparty', () => {
    const rule = getCategoryProviderRule('bank_account')

    expect(rule?.requiresProvider).toBe(true)
    expect(rule?.providerLabel).toBe('Banco emisor')
    expect(rule?.providerTypesAllowed).toEqual(['bank'])
    expect(rule?.defaultProviderSlug).toBeNull()
    expect(rule?.requiresCounterparty).toBe(false)
  })

  it('returns the cash rule with no provider required', () => {
    const rule = getCategoryProviderRule('cash')

    expect(rule?.requiresProvider).toBe(false)
    expect(rule?.requiresCounterparty).toBe(false)
  })

  it('returns null for unknown categories', () => {
    expect(getCategoryProviderRule('made_up_category')).toBeNull()
    expect(getCategoryProviderRule(null)).toBeNull()
    expect(getCategoryProviderRule(undefined)).toBeNull()
    expect(getCategoryProviderRule('')).toBeNull()
  })
})

describe('hasFixedProvider', () => {
  it('returns true for shareholder rule (greenhouse pre-assigned)', () => {
    expect(hasFixedProvider(getCategoryProviderRule('shareholder_account'))).toBe(true)
  })

  it('returns false for bank_account, credit_card, fintech, cash', () => {
    expect(hasFixedProvider(getCategoryProviderRule('bank_account'))).toBe(false)
    expect(hasFixedProvider(getCategoryProviderRule('credit_card'))).toBe(false)
    expect(hasFixedProvider(getCategoryProviderRule('fintech'))).toBe(false)
    expect(hasFixedProvider(getCategoryProviderRule('cash'))).toBe(false)
  })

  it('returns false for null rule', () => {
    expect(hasFixedProvider(null)).toBe(false)
  })
})
