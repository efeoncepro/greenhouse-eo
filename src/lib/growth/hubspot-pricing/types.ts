// HubSpot pricebook (TASK-1405): the vendor list price, governed. Types only.
//
// A HubSpot licence has no Efeonce cost and no Efeonce margin: it has a list price published by the vendor. This
// domain never holds a fee, a cost, a margin or a bill rate of Efeonce, and never imports the cost-plus engine.

/** primary = read at a HubSpot source on `asOf`; secondary = a source not reverified on `asOf`; not_published. */
export type PriceEvidence = 'primary' | 'secondary' | 'not_published'

export type PriceFact<T> = {
  /** Null when, and only when, `evidence` is `not_published`. */
  value: T | null
  evidence: PriceEvidence
  sourceUrl: string | null
  asOf: string
  note?: string
}

export type HubSpotTier = 'starter' | 'pro' | 'enterprise'

export const HUBSPOT_TIERS: readonly HubSpotTier[] = ['starter', 'pro', 'enterprise']

export type HubSpotHubId =
  | 'sales'
  | 'service'
  | 'smart_crm'
  | 'revenue'
  | 'marketing'
  | 'content'
  | 'data'
  | 'marketing_plus'
  | 'customer_platform'

/**
 * How a tier is charged.
 * - `per_seat`: `price` is per licence and month.
 * - `per_account`: `price` is per account and month and includes `includedSeats`; a licence over those costs
 *   `additionalSeatFrom`, which HubSpot publishes as a floor («a partir de»), never as an exact price.
 */
export type HubSpotTierEntry = {
  tier: HubSpotTier
  unit: 'per_seat' | 'per_account'
  price: PriceFact<number>
  includedSeats?: PriceFact<number>
  additionalSeatFrom?: PriceFact<number>
  includedMarketingContacts?: PriceFact<number>
  includedCredits: PriceFact<number>
  /** One-off mandatory onboarding fee (USD). */
  onboardingFee: PriceFact<number>
}

export type HubSpotHubEntry = {
  hubId: HubSpotHubId
  label: string
  kind: 'hub' | 'bundle'
  /** Page of the pricing read, inside the Efeonce portal. */
  sourceUrl: string
  tiers: HubSpotTierEntry[]
  note?: string
}

export type HubSpotAddOnEntry = {
  addOnId: string
  label: string
  /** USD per month, except where `unitNote` says otherwise. */
  price: PriceFact<number>
  unitNote?: string
}

export type HubSpotSeatRule = {
  seatType: 'view_only'
  free: PriceFact<boolean>
}

export type HubSpotPricebook = {
  pricebookId: 'hubspot-list-price'
  version: string
  /** The freshness gate reads this date. */
  asOf: string
  currency: 'USD'
  taxNote: string
  hubs: HubSpotHubEntry[]
  addOns: HubSpotAddOnEntry[]
  seatRules: HubSpotSeatRule[]
  /** The partner waiver of the mandatory onboarding fee. */
  onboardingWaiver: PriceFact<boolean>
  /** Marketing contacts over the included ones are charged in graduated bands whose amount is not published. */
  contactBands: PriceFact<number>
}

export type HubSpotEstimateItemInput = {
  hubId: HubSpotHubId
  tier: HubSpotTier
  /** Paid licences. For `per_account` tiers, the total licences wanted (included ones count). */
  seats: number
  /** View-only licences: never charged. */
  viewOnlySeats?: number
  marketingContacts?: number
}

export type HubSpotEstimateInput = {
  items: HubSpotEstimateItemInput[]
  /** Months the licences run in year one. Default 12. */
  months?: number
  /** A certified partner implements: the mandatory onboarding fee is waived. */
  waiveOnboarding?: boolean
}

export type HubSpotEstimateLine = {
  lineId: string
  hubId: HubSpotHubId
  tier: HubSpotTier
  kind: 'licence' | 'additional_seats' | 'view_only_seats' | 'onboarding' | 'marketing_contacts'
  label: string
  recurrence: 'monthly' | 'once'
  /** Exact USD, or null when the amount cannot be stated exactly (see `evidence` and `notPublished`). */
  unitAmountUsd: number | null
  quantity: number
  monthlyUsd: number | null
  /** Over the months of the estimate (monthly) or once (one-off). Null when not exact. */
  totalUsd: number | null
  evidence: PriceEvidence
  notPublished?: true
  /** A floor or an approximate amount, never charged as exact. */
  approximateUsd?: { kind: 'from' | 'approximate'; amountUsd: number }
  sourceUrl: string | null
  asOf: string
  note?: string
}

export type HubSpotCostEstimate = {
  pricebookVersion: string
  asOf: string
  currency: 'USD'
  months: number
  lines: HubSpotEstimateLine[]
  totals: {
    /** Exact recurring USD per month, or null if any recurring line is not exact. */
    monthlyUsd: number | null
    /** Licences over `months` plus one-offs; null if any line is not exact. */
    yearOneUsd: number | null
    /** What is exact, leaving out lines that are not. */
    exactPartYearOneUsd: number
    /** Lines left out of the exact totals. */
    notExactLineIds: string[]
  }
  credits: { includedPerMonth: number; rule: 'max_across_hubs'; note: string }
  waiver: {
    applied: boolean
    /** Onboarding fees the waiver removes (exact or approximate), USD. */
    onboardingFeeUsd: number | null
    approximate: boolean
    note: string
  }
  disclaimer: string
  implementation: 'quote_required'
}
