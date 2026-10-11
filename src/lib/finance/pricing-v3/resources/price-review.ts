import type { z } from 'zod'

import type { Catalog } from '../catalog/contracts'
import { pricingV3RequestSchema } from '../schemas'
import type { composeResourceQuote } from './composition'
import type { CompositionPolicy } from './composition-contracts'
import type { creditCatalogSchema } from './credit-budget'

type Composition = ReturnType<typeof composeResourceQuote>
type CreditCatalog = z.infer<typeof creditCatalogSchema>

export const PRICE_REVIEW_VERSION = 'pricing-v3-price-review/1'

/** How far ahead a date counts as "soon" unless the caller says otherwise. */
export const PRICE_REVIEW_WINDOW_DAYS = 30

export type PriceDateNotice = {
  /** `hard_expiry`: a quote dated after `date` is blocked. `review`: look at it again; it never blocks. */
  kind: 'hard_expiry' | 'review'
  subject: 'tool_price' | 'resource_policy' | 'catalog_record' | 'credit_provider'
  /** `toolId:priceId`, the policy version, the catalog record id or the credit provider id. */
  ref: string
  toolId: string | null
  priceId: string | null
  label: string
  date: string
  /** `date` minus the reading date, in days. Negative once the date has passed; 0 is the last valid day. */
  daysLeft: number
  /**
   * The diagnostic a quote gets once a hard date has passed; null for a review date. For a catalog record it is the
   * code of catalog resolution; the composition names the same gap RESOURCE_FX_SELECTION_REQUIRED (the FX of a tool
   * currency) or CATALOG_RESOURCE_PRICE_REQUIRED (a tool price the policy reads from the catalog).
   */
  blocksWith: string | null
}

export type PriceReview = {
  schemaVersion: typeof PRICE_REVIEW_VERSION
  asOf: string
  withinDays: number
  /** Review dates already passed. A reminder, never a blocker: the price keeps its hard validity. */
  reviewDue: PriceDateNotice[]
  /** Hard validities and review dates that fall from `asOf` to `asOf + withinDays`, both ends included. */
  dueSoon: PriceDateNotice[]
  /** Hard validities already passed: a quote dated `asOf` cannot use these. */
  expired: PriceDateNotice[]
}

const DAY = 86_400_000
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)

const ordered = (notices: PriceDateNotice[]) =>
  [...notices].sort(
    (a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref) || a.kind.localeCompare(b.kind)
  )

/**
 * Dates of the resource policy worth acting on, read at `asOf`. Pure and derived: it changes no price, no validity
 * and no calculation. With `catalog` or `credits` it also reads the other hard dates that can block a quote.
 *
 * A catalog record that ends because its next revision starts is not an expiry and is not listed.
 */
export function reviewResourcePrices(
  policy: CompositionPolicy,
  asOf: string,
  options: { withinDays?: number; catalog?: Catalog; credits?: CreditCatalog } = {}
): PriceReview {
  // Same rule as a quote date. A date that is not one would read as "nothing is due", which is worse than failing.
  pricingV3RequestSchema.shape.quoteDate.parse(asOf)

  const withinDays = options.withinDays ?? PRICE_REVIEW_WINDOW_DAYS

  const review: PriceReview = {
    schemaVersion: PRICE_REVIEW_VERSION,
    asOf,
    withinDays,
    reviewDue: [],
    dueSoon: [],
    expired: []
  }

  const read = (notice: Omit<PriceDateNotice, 'daysLeft'>) => {
    const daysLeft = daysBetween(asOf, notice.date)
    const row = { ...notice, daysLeft }

    if (daysLeft < 0) (notice.kind === 'review' ? review.reviewDue : review.expired).push(row)
    else if (daysLeft <= withinDays) review.dueSoon.push(row)
  }

  read({
    kind: 'hard_expiry',
    subject: 'resource_policy',
    ref: policy.version,
    toolId: null,
    priceId: null,
    label: policy.version,
    date: policy.source.effectiveUntil,
    blocksWith: 'RESOURCE_POLICY_NOT_EFFECTIVE'
  })

  for (const tool of policy.tools)
    for (const price of tool.prices) {
      const base = {
        subject: 'tool_price' as const,
        ref: `${tool.toolId}:${price.priceId}`,
        toolId: tool.toolId,
        priceId: price.priceId,
        label: tool.label
      }

      // A price that points at a catalog record takes its hard validity from that record, listed below.
      if (price.price)
        read({
          ...base,
          kind: 'hard_expiry',
          date: price.price.source.effectiveUntil,
          blocksWith: 'RESOURCE_PRICE_NOT_EFFECTIVE'
        })
      if (price.reviewBy) read({ ...base, kind: 'review', date: price.reviewBy, blocksWith: null })
    }

  const latestStart = new Map<string, string>()

  for (const record of options.catalog?.records ?? [])
    if ((latestStart.get(record.recordId) ?? '') < record.source.effectiveFrom)
      latestStart.set(record.recordId, record.source.effectiveFrom)

  for (const record of options.catalog?.records ?? []) {
    // Ended by its own next revision, or retired on purpose: neither is a value about to go missing.
    if (latestStart.get(record.recordId)! > record.source.effectiveUntil || record.retiredAt) continue

    read({
      kind: 'hard_expiry',
      subject: 'catalog_record',
      ref: record.recordId,
      toolId: null,
      priceId: null,
      label: `${record.kind} revision ${record.revision}`,
      date: record.source.effectiveUntil,
      blocksWith: 'MISSING_CATALOG_SELECTION'
    })
  }

  for (const provider of options.credits?.providers ?? [])
    if (provider.source.priceValidUntil)
      read({
        kind: 'hard_expiry',
        subject: 'credit_provider',
        ref: provider.providerId,
        toolId: policy.tools.find(t => t.providerId === provider.providerId)?.toolId ?? null,
        priceId: null,
        label: provider.providerId,
        date: provider.source.priceValidUntil,
        blocksWith: 'TOPUP_PRICE_EXPIRED'
      })

  return {
    ...review,
    reviewDue: ordered(review.reviewDue),
    dueSoon: ordered(review.dueSoon),
    expired: ordered(review.expired)
  }
}

/**
 * The same notices, kept only for what one composed quote actually used: the tool prices of its attributions, the
 * catalog records it bound, the credit providers it budgeted and the policy itself. Takes the result or its artifact.
 *
 * `policy` is the policy to read the dates from, normally the one the quote was composed with. A price the quote
 * used that this policy no longer has is reported in `notInPolicy` instead of being dropped.
 */
export function quotePriceNotices(
  composed: Composition | { semantic: { result: Composition } },
  policy: CompositionPolicy,
  asOf: string,
  options: { withinDays?: number; catalog?: Catalog; credits?: CreditCatalog } = {}
) {
  const result = 'semantic' in composed ? composed.semantic.result : composed
  const budgeted = new Set(result.creditBudgets.map(b => b.toolId))

  const used = [
    ...new Set(result.attributions.filter(a => !budgeted.has(a.toolId)).map(a => `${a.toolId}:${a.priceId}`))
  ].sort()

  const known = new Set(policy.tools.flatMap(t => t.prices.map(p => `${t.toolId}:${p.priceId}`)))
  const bound = new Set(result.quote.resolution.bindings.map(b => b.record.recordId))

  // A policy price that points at a catalog record: the quote used that record without binding it by a line.
  for (const tool of policy.tools)
    for (const price of tool.prices)
      if (price.catalogResourceId && used.includes(`${tool.toolId}:${price.priceId}`))
        for (const record of options.catalog?.records ?? [])
          if (record.kind === 'resource' && record.value.resourceId === price.catalogResourceId)
            bound.add(record.recordId)

  // An FX rate the composition brought for the currency of a tool is in the frozen snapshot with its source, not in
  // the bindings: it is matched back to its catalog record by pair and source reference.
  const rates = result.quote.resolution.inputs.flatMap(i => i.input.snapshot.fx)

  for (const record of options.catalog?.records ?? [])
    if (
      record.kind === 'fx' &&
      rates.some(
        f => f.from === record.value.from && f.to === record.value.to && f.source.reference === record.source.reference
      )
    )
      bound.add(record.recordId)

  const applies = (n: PriceDateNotice) =>
    n.subject === 'resource_policy' ||
    (n.subject === 'tool_price' && used.includes(n.ref)) ||
    (n.subject === 'catalog_record' && bound.has(n.ref)) ||
    (n.subject === 'credit_provider' && n.toolId !== null && budgeted.has(n.toolId))

  const all = reviewResourcePrices(policy, asOf, options)

  return {
    schemaVersion: all.schemaVersion,
    asOf,
    withinDays: all.withinDays,
    pricesUsed: used,
    reviewDue: all.reviewDue.filter(applies),
    dueSoon: all.dueSoon.filter(applies),
    expired: all.expired.filter(applies),
    notInPolicy: used.filter(ref => !known.has(ref))
  }
}
