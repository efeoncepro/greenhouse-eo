import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  HUBSPOT_PRICEBOOK_MAX_AGE_DAYS,
  HubSpotEstimateInputError,
  estimateHubSpotCost,
  getHubSpotPricebook,
  pricebookAgeDays
} from '..'
import type { PriceFact } from '../types'

const pricebook = getHubSpotPricebook()

const facts = (): PriceFact<unknown>[] => {
  const out: PriceFact<unknown>[] = []

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    if ('evidence' in value && 'asOf' in value && 'value' in value) out.push(value as PriceFact<unknown>)
    Object.values(value).forEach(visit)
  }

  visit(pricebook)

  return out
}

const keysOf = (value: unknown, keys = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach(item => keysOf(item, keys))
  else if (value && typeof value === 'object')
    Object.entries(value).forEach(([key, nested]) => {
      keys.add(key)
      keysOf(nested, keys)
    })

  return keys
}

describe('HubSpot pricebook — data', () => {
  it('every datum declares its evidence; a not_published datum is never a number', () => {
    const all = facts()

    expect(all.length).toBeGreaterThan(50)

    for (const fact of all) {
      expect(['primary', 'secondary', 'not_published']).toContain(fact.evidence)
      expect(fact.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      if (fact.evidence === 'not_published') expect(fact.value).toBeNull()
      else expect(fact.value).not.toBeNull()
      if (fact.evidence === 'primary')
        expect(fact.sourceUrl).toMatch(/^https:\/\/app\.hubspot\.com\/pricing\/48713323\//)
    }
  })

  it('holds the portal reading of 2026-11-05 for the prices that drive quotes', () => {
    const price = (hubId: string, tier: string) =>
      pricebook.hubs.find(hub => hub.hubId === hubId)?.tiers.find(entry => entry.tier === tier)?.price.value

    expect(pricebook.asOf).toBe('2026-11-05')
    expect(price('sales', 'pro')).toBe(100)
    expect(price('sales', 'enterprise')).toBe(150)
    expect(price('marketing', 'pro')).toBe(890)
    expect(price('customer_platform', 'enterprise')).toBe(4700)
  })

  it('freshness gate: the pricebook is at most 90 days old', () => {
    const today = new Date().toISOString().slice(0, 10)
    const age = pricebookAgeDays(pricebook.asOf, today)

    expect(
      age,
      `El pricebook de HubSpot tiene ${age} días. Reverifica en app.hubspot.com/pricing/<portal>/<producto> y bumpea asOf y version en src/lib/growth/hubspot-pricing/catalog.ts. Ver hubspot-solutions-partner/SOURCES.md.`
    ).toBeLessThanOrEqual(HUBSPOT_PRICEBOOK_MAX_AGE_DAYS)
  })

  it('counts age in whole days', () => {
    expect(pricebookAgeDays('2026-11-05', '2027-02-03')).toBe(90)
    expect(pricebookAgeDays('2026-11-05', '2027-02-04')).toBe(91)
  })
})

describe('HubSpot pricebook — estimator invariants', () => {
  it('credits are the max across hubs, never the sum: four Enterprise hubs give 5.000', () => {
    const estimate = estimateHubSpotCost({
      items: ['sales', 'service', 'marketing', 'content'].map(hubId => ({
        hubId: hubId as 'sales',
        tier: 'enterprise',
        seats: 5
      })),
      waiveOnboarding: true
    })

    expect(estimate.credits.includedPerMonth).toBe(5000)
    expect(estimate.credits.rule).toBe('max_across_hubs')
  })

  it('Sales Hub Professional, 10 licences: US$ 1.000 a month', () => {
    const estimate = estimateHubSpotCost({ items: [{ hubId: 'sales', tier: 'pro', seats: 10 }], waiveOnboarding: true })

    expect(estimate.totals.monthlyUsd).toBe(1000)
    expect(estimate.totals.yearOneUsd).toBe(12000)
  })

  it('Sales Hub Enterprise, 10 licences with the partner waiver: US$ 18.000 in year one', () => {
    const estimate = estimateHubSpotCost({
      items: [{ hubId: 'sales', tier: 'enterprise', seats: 10 }],
      waiveOnboarding: true
    })

    expect(estimate.totals.monthlyUsd).toBe(1500)
    expect(estimate.totals.yearOneUsd).toBe(18000)
    expect(estimate.waiver).toMatchObject({ applied: true, onboardingFeeUsd: 3500, approximate: true })
  })

  it('the waiver case: Marketing Hub Pro loses its onboarding fee with a certified partner', () => {
    const withPartner = estimateHubSpotCost({
      items: [{ hubId: 'marketing', tier: 'pro', seats: 3 }],
      waiveOnboarding: true
    })

    const withoutPartner = estimateHubSpotCost({ items: [{ hubId: 'marketing', tier: 'pro', seats: 3 }] })

    expect(withPartner.totals.yearOneUsd).toBe(890 * 12)
    expect(withPartner.lines.find(line => line.kind === 'onboarding')?.totalUsd).toBe(0)

    // The fee is secondary (legal catalog, not reverified on asOf): never charged as exact.
    const fee = withoutPartner.lines.find(line => line.kind === 'onboarding')

    expect(fee?.totalUsd).toBeNull()
    expect(fee?.approximateUsd).toEqual({ kind: 'approximate', amountUsd: 3000 })
    expect(withoutPartner.totals.yearOneUsd).toBeNull()
    expect(withoutPartner.totals.exactPartYearOneUsd).toBe(890 * 12)
  })

  it('a not_published datum stays not published, never a number', () => {
    const estimate = estimateHubSpotCost({ items: [{ hubId: 'smart_crm', tier: 'starter', seats: 2 }] })
    const licence = estimate.lines.find(line => line.kind === 'licence')

    expect(licence).toMatchObject({ notPublished: true, unitAmountUsd: null, totalUsd: null })
    expect(estimate.totals.yearOneUsd).toBeNull()
  })

  it('additional licences priced «from» are a floor, never an exact amount', () => {
    const estimate = estimateHubSpotCost({
      items: [{ hubId: 'marketing', tier: 'pro', seats: 5 }],
      waiveOnboarding: true
    })

    const extra = estimate.lines.find(line => line.kind === 'additional_seats')

    expect(extra?.quantity).toBe(2)
    expect(extra?.totalUsd).toBeNull()
    expect(extra?.approximateUsd).toEqual({ kind: 'from', amountUsd: 2 * 50 * 12 })
  })

  it('view-only licences are never charged', () => {
    const estimate = estimateHubSpotCost({
      items: [{ hubId: 'sales', tier: 'pro', seats: 10, viewOnlySeats: 25 }],
      waiveOnboarding: true
    })

    expect(estimate.lines.find(line => line.kind === 'view_only_seats')?.totalUsd).toBe(0)
    expect(estimate.totals.monthlyUsd).toBe(1000)
  })

  it('marketing contacts over the included ones are not published', () => {
    const estimate = estimateHubSpotCost({
      items: [{ hubId: 'marketing', tier: 'pro', seats: 3, marketingContacts: 8000 }],
      waiveOnboarding: true
    })

    expect(estimate.lines.find(line => line.kind === 'marketing_contacts')).toMatchObject({
      notPublished: true,
      quantity: 6000
    })
  })

  it('carries no fee, cost, margin or bill rate of Efeonce', () => {
    const estimate = estimateHubSpotCost({ items: [{ hubId: 'sales', tier: 'enterprise', seats: 10 }] })
    const keys = [...keysOf(estimate)]

    expect(keys.filter(key => /margin|cost|billrate|markup/i.test(key))).toEqual([])
    expect(estimate.implementation).toBe('quote_required')
  })

  it('is pure: same input, same output; no I/O in the domain', () => {
    const input = { items: [{ hubId: 'service' as const, tier: 'pro' as const, seats: 4 }], months: 6 }

    expect(estimateHubSpotCost(input)).toEqual(estimateHubSpotCost(input))

    // The text scan below is a regression signal, not the proof (GREENHOUSE_CANONICAL_PATTERNS_V1 § 7): the
    // behavioural check is the equality above, and the import boundary of the domain is what keeps it pure. It names
    // the forbidden regressions — I/O, the clock, randomness, env, an import of the cost-plus engine — so one of them
    // appearing fails here first.
    const dir = join(__dirname, '..')

    for (const file of readdirSync(dir).filter(name => name.endsWith('.ts'))) {
      const source = readFileSync(join(dir, file), 'utf8')

      expect(source, file).not.toMatch(/from 'node:|require\(|fetch\(|Date\.now|new Date\(|Math\.random|process\.env/)
      expect(source, file).not.toMatch(/finance\/pricing/)
    }
  })

  it('rejects an input it cannot price', () => {
    expect(() => estimateHubSpotCost({ items: [] })).toThrow(HubSpotEstimateInputError)
    expect(() => estimateHubSpotCost({ items: [{ hubId: 'sales', tier: 'pro', seats: 0 }] })).toThrow('INVALID_SEATS')
    expect(() => estimateHubSpotCost({ items: [{ hubId: 'nope' as 'sales', tier: 'pro', seats: 1 }] })).toThrow(
      'UNKNOWN_HUB'
    )
    expect(() => estimateHubSpotCost({ items: [{ hubId: 'sales', tier: 'pro', seats: 1 }], months: 0 })).toThrow(
      'INVALID_MONTHS'
    )
  })
})
