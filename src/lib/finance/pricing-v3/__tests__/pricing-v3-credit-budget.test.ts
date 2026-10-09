import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { creditCatalogSchema, planCreditBudget } from '../resources/credit-budget'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const catalog = () => read('data/pricing/v3-resources/ai-credits.review-v1.json')
const request = (provider = 'higgsfield') => read(`data/pricing/v3-resources/examples/${provider}.request.json`)

const extraOnly = (amount: number, more = {}) => ({
  ...request(),
  requestedCredits: amount,
  subscriptionCreditsAllocated: 0,
  subscriptionCreditsAvailable: 0,
  ...more
})

describe('AI subscription and incremental credit budget', () => {
  it('chooses mixed packs, counts full cash and attributes base separately', () => {
    const result = planCreditBudget(catalog(), request())

    expect(result.breakdown).toMatchObject({
      currency: 'USD',
      totalBudgetCost: '50.78',
      incrementalCash: '32.25',
      subscription: { attributedCost: '18.53' },
      extra: {
        requestedCredits: 600,
        purchasedCredits: 600,
        remainingCredits: 0,
        purchaseCost: '32.25',
        expiresAt: '2027-01-07'
      }
    })
    expect(result.breakdown!.extra.packages.map(p => p.creditsEach).sort((a, b) => a - b)).toEqual([100, 500])
    expect(result.binding).toBe(false)
    expect(result.reviewStatus).toBe('requires_review')
  })

  it('uses cheapest whole package instead of prorating the extra price', () => {
    const result = planCreditBudget(catalog(), { ...request('magnific'), requestedCredits: 21000 })

    expect(result.breakdown).toMatchObject({
      currency: 'EUR',
      totalBudgetCost: '22.93',
      incrementalCash: '9.60',
      extra: { requestedCredits: 6000, purchasedCredits: 10000, remainingCredits: 4000, expiresAt: '2029-10-09' }
    })
  })

  it('finds global mix 5000+1000 at284 rather than4000+2000 at285', () => {
    expect(planCreditBudget(catalog(), extraOnly(6000)).breakdown!.extra.purchaseCost).toBe('284.00')
  })

  it('does not buy extras when normal capacity covers demand', () => {
    expect(planCreditBudget(catalog(), { ...request(), requestedCredits: 400 }).breakdown).toMatchObject({
      totalBudgetCost: '18.53',
      incrementalCash: '0.00',
      extra: { packages: [], remainingCredits: 0, expiresAt: null }
    })
  })

  it('allows repeat packs only by explicit simulation input', () => {
    const single = planCreditBudget(catalog(), extraOnly(10000))
    const repeated = planCreditBudget(catalog(), extraOnly(10000, { allowRepeatedPacks: true }))

    expect(single.breakdown!.extra.purchaseCost).toBe('474.00')
    expect(repeated.breakdown!.extra.purchaseCost).toBe('470.00')
    expect(repeated.breakdown!.extra.packages).toMatchObject([{ packId: 'higgsfield-5000', quantity: 2 }])
    expect(repeated.assumptions).toContain('Repeat purchase of the same pack is an explicit simulation assumption.')
  })

  it('validates allocated base against demand, available capacity and subscription package', () => {
    expect(() => planCreditBudget(catalog(), { ...request(), subscriptionCreditsAvailable: 399 })).toThrow()
    expect(() => planCreditBudget(catalog(), { ...request(), requestedCredits: 399 })).toThrow()
    expect(planCreditBudget(catalog(), { ...request(), subscriptionCreditsAvailable: 3001 }).diagnostics).toContain(
      'SUBSCRIPTION_AVAILABILITY_EXCEEDS_PACKAGE'
    )
  })

  it('does not infer availability, accept fractional/negative requests or expose unknown keys', () => {
    for (const changes of [
      { subscriptionCreditsAvailable: undefined },
      { requestedCredits: 0.1 },
      { requestedCredits: -1 },
      { cost: '1' }
    ])
      expect(() => planCreditBudget(catalog(), { ...request(), ...changes })).toThrow()
  })

  it('preserves unknown provider and active-subscription requirements without costs', () => {
    expect(planCreditBudget(catalog(), { ...request(), providerId: 'unknown' })).toMatchObject({
      calculationStatus: 'needs_input',
      breakdown: null,
      diagnostics: ['PROVIDER_NOT_FOUND']
    })
    expect(planCreditBudget(catalog(), { ...request('magnific'), activeSubscription: false }).diagnostics).toContain(
      'ACTIVE_SUBSCRIPTION_REQUIRED'
    )
  })

  it('rejects expiry-day use, past pricing and implicit base across months', () => {
    expect(planCreditBudget(catalog(), extraOnly(600, { useBy: '2027-01-07' })).diagnostics).toContain(
      'EXTRA_CREDITS_EXPIRE_BEFORE_USE'
    )
    expect(planCreditBudget(catalog(), { ...request(), purchaseDate: '2026-10-08' }).diagnostics).toContain(
      'PRICE_NOT_OBSERVED_AT_PURCHASE_DATE'
    )
    expect(planCreditBudget(catalog(), { ...request(), useBy: '2026-11-01' }).diagnostics).toContain(
      'SUBSCRIPTION_WINDOW_REQUIRES_REVIEW'
    )
  })

  it('handles leap-day calendar anniversaries without turning years into1095days', () => {
    const r = {
      ...request('magnific'),
      subscriptionCreditsAllocated: 0,
      purchaseDate: '2028-02-29',
      useBy: '2028-03-01'
    }

    expect(planCreditBudget(catalog(), r).breakdown!.extra.expiresAt).toBe('2031-02-28')
  })

  it('cannot invent unpriced slider packages and bounds incomplete capacity', () => {
    expect(planCreditBudget(catalog(), extraOnly(1000000))).toMatchObject({
      calculationStatus: 'needs_input',
      breakdown: null,
      diagnostics: ['PACK_CAPACITY_OR_PLANNER_LIMIT']
    })
    expect(
      planCreditBudget(catalog(), extraOnly(7000)).breakdown!.extra.packages.every(p => p.creditsEach <= 5000)
    ).toBe(true)
  })

  it('rejects duplicate packs and currency contamination at schema boundary', () => {
    const c = catalog()

    c.providers[0].packs.push(c.providers[0].packs[0])
    expect(() => planCreditBudget(c, request())).toThrow()
    c.providers[0].packs.pop()
    c.providers[0].currency = 'EURO'
    expect(() => planCreditBudget(c, request())).toThrow()
  })

  it('validates malformed money without escaping safeParse and checks price validity', () => {
    const c = catalog()

    c.providers[0].packs[0].amount = 'NaN'
    expect(creditCatalogSchema.safeParse(c).success).toBe(false)
    c.providers[0].packs[0].amount = '6.25'
    c.providers[0].source.priceValidUntil = '2026-10-09'
    expect(planCreditBudget(c, extraOnly(600, { purchaseDate: '2026-10-10' })).diagnostics).toContain(
      'TOPUP_PRICE_EXPIRED'
    )
    expect(planCreditBudget(c, { ...request(), requestedCredits: 400, purchaseDate: '2026-10-10' }).calculationStatus).toBe('calculated')
  })

  it('returns needs_input rather than malformed expiry beyond representable dates', () => {
    expect(
      planCreditBudget(catalog(), extraOnly(600, { purchaseDate: '9999-12-30', useBy: '9999-12-31' }))
    ).toMatchObject({
      calculationStatus: 'needs_input',
      breakdown: null,
      diagnostics: ['EXPIRY_DATE_NOT_REPRESENTABLE']
    })
  })

  it('CLI calls the same primitive and refuses unrelated options', () => {
    const args = [
      '--import',
      'tsx',
      'scripts/commercial/pricing-v3.ts',
      'resources',
      'budget',
      '--catalog',
      'data/pricing/v3-resources/ai-credits.review-v1.json',
      '--input',
      'data/pricing/v3-resources/examples/higgsfield.request.json'
    ]

    const result = spawnSync('node', args, { encoding: 'utf8' })

    expect(result.status).toBe(3)
    expect(JSON.parse(result.stdout)).toEqual(planCreditBudget(catalog(), request()))
    const invalid = spawnSync('node', [...args, '--format', 'markdown'], { encoding: 'utf8' })

    expect(invalid.status).toBe(1)
    expect(JSON.parse(invalid.stderr).error.code).toBe('INVALID_ARGUMENT')
  })
})
