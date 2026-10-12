import type { z } from 'zod'

import { catalogSelectionKey } from '../catalog/catalog'
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
  /**
   * `hard_expiry`: a quote dated after `date` cannot use the value. That blocks the quote (`blocksWith`) unless
   * `consequence` says what happens instead. `review`: look at it again; it never blocks.
   */
  kind: 'hard_expiry' | 'review'
  /** `third_party_quote`: the quote of a supplier for a re-invoiced third-party cost; only in the notices of a quote. */
  subject: 'tool_price' | 'resource_policy' | 'catalog_record' | 'credit_provider' | 'third_party_quote'
  /** `toolId:priceId`, the policy version, the catalog record id, the credit provider id or the third-party cost id. */
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
   * currency) or CATALOG_RESOURCE_PRICE_REQUIRED (a tool price the policy reads from the catalog). Null as well for
   * a hard date whose passing blocks nothing: then `consequence` is present.
   */
  blocksWith: string | null
  /**
   * What a quote dated after a hard `date` gets when it is not a blocking diagnostic. Present only then: a catalog
   * record whose absence resolution accepts in silence, or one another record answers for (`supersededBy`).
   */
  consequence?: string
  /**
   * Only for a catalog record whose selection another record answers once this one has ended: the ids of the
   * records in force then (on the reading date for a validity already passed, on the day after `date` otherwise).
   * A quote selects one of those and is not blocked by the end of this one, so `blocksWith` is null.
   */
  supersededBy?: string[]
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
  /**
   * Catalog records whose validity has passed and whose selection another record in force on `asOf` answers
   * (`supersededBy`): history, not an expiry. They block no quote and are never listed under `expired`.
   */
  superseded: PriceDateNotice[]
}

const DAY = 86_400_000
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)

/**
 * A contingency reserve is the one catalog value a quote can lose without being told: resolution selects the reserve
 * in force for the quote date and, with none, selects none. The quote is then priced without a reserve and nothing
 * names it, on its earlier contract when nothing else needs 1.4.0. Only a brief that waives the reserve notices, and
 * that one is blocked.
 */
const RESERVE_EXPIRY_CONSEQUENCE =
  'A quote dated after this date finds no contingency reserve in this record. Unless another reserve record in force applies to it, it is priced without a reserve and no diagnostic says so; a brief that waives the reserve is blocked with CONTINGENCY_WAIVER_WITHOUT_RESERVE.'

const WAIVER_WITHOUT_RESERVE = 'CONTINGENCY_WAIVER_WITHOUT_RESERVE'

/**
 * A catalog record is one value of a selection (the rate of a currency pair, the cost of a profile in a country).
 * When it ends and another record answers the same selection, nothing a quote needs has gone missing: resolution
 * selects by what the record states, never by its id. Only a declaration that names the record itself is touched.
 */
const SUPERSEDED_CONSEQUENCE =
  'Another record in force answers the same selection (`supersededBy`): a quote selects that one and is not blocked. A demand or a brief that names this record by its id has to name the one that replaced it.'

const dayAfter = (date: string) => {
  const time = new Date(`${date}T00:00:00Z`)

  time.setUTCDate(time.getUTCDate() + 1)

  return time.toISOString().slice(0, 10)
}

const ordered = (notices: PriceDateNotice[]) =>
  [...notices].sort(
    (a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref) || a.kind.localeCompare(b.kind)
  )

/**
 * Dates of the resource policy worth acting on, read at `asOf`. Pure and derived: it changes no price, no validity
 * and no calculation. With `catalog` or `credits` it also reads the other hard dates that can block a quote.
 *
 * A catalog record that ends because its next revision starts is not an expiry and is not listed. One that ends
 * while another record answers the same selection (`catalogSelectionKey`: another record id for the same currency
 * pair, the same cost, the same rule) is not an expiry either: once its validity has passed it is listed under
 * `superseded`, with the records that replaced it, and before that it stays under `dueSoon` without a blocker.
 */
export function reviewResourcePrices(
  policy: CompositionPolicy,
  asOf: string,
  options: { withinDays?: number; catalog?: Catalog; credits?: CreditCatalog } = {}
): PriceReview {
  return readDates(policy, asOf, options, [])
}

/** The reading itself. `more` are dated values of one quote (its supplier quotes), classified by the same rule. */
function readDates(
  policy: CompositionPolicy,
  asOf: string,
  options: { withinDays?: number; catalog?: Catalog; credits?: CreditCatalog },
  more: Omit<PriceDateNotice, 'daysLeft'>[]
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
    expired: [],
    superseded: []
  }

  const read = (notice: Omit<PriceDateNotice, 'daysLeft'>) => {
    const daysLeft = daysBetween(asOf, notice.date)
    const row = { ...notice, daysLeft }

    if (daysLeft < 0)
      (notice.kind === 'review' ? review.reviewDue : notice.supersededBy ? review.superseded : review.expired).push(row)
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

    // Whether a quote dated after the end of this record still finds its value: the records of other ids that
    // answer the same selection and are in force then. "Then" is the reading date once the validity has passed
    // (what a quote of today gets) and the day after the end before that (what the first quote without it gets).
    const until = record.source.effectiveUntil
    const then = until < asOf ? asOf : dayAfter(until)
    const selection = catalogSelectionKey(record)

    const supersededBy = [
      ...new Set(
        (options.catalog?.records ?? [])
          .filter(
            other =>
              other.recordId !== record.recordId &&
              other.kind === record.kind &&
              catalogSelectionKey(other) === selection &&
              other.source.effectiveFrom <= then &&
              then <= other.source.effectiveUntil
          )
          .map(other => other.recordId)
      )
    ].sort()

    read({
      kind: 'hard_expiry',
      subject: 'catalog_record',
      ref: record.recordId,
      toolId: null,
      priceId: null,
      label: `${record.kind} revision ${record.revision}`,
      date: until,
      ...(supersededBy.length
        ? { blocksWith: null, consequence: SUPERSEDED_CONSEQUENCE, supersededBy }
        : // Every other kind is a value a quote that needs it cannot be resolved without.
          record.kind === 'contingency_reserve'
          ? { blocksWith: null, consequence: RESERVE_EXPIRY_CONSEQUENCE }
          : { blocksWith: 'MISSING_CATALOG_SELECTION' })
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

  for (const notice of more) read(notice)

  return {
    ...review,
    reviewDue: ordered(review.reviewDue),
    dueSoon: ordered(review.dueSoon),
    expired: ordered(review.expired),
    superseded: ordered(review.superseded)
  }
}

/**
 * The same notices, kept only for what one composed quote actually used: the tool prices of its attributions, the
 * catalog records it bound, the credit providers it budgeted and the policy itself. Takes the result or its artifact.
 *
 * `policy` is the policy to read the dates from, normally the one the quote was composed with. A price the quote
 * used that this policy no longer has is reported in `notInPolicy` instead of being dropped.
 *
 * From contract 1.4.0 the quote also holds dated values of its own: the quote of the supplier of each re-invoiced
 * third-party cost, with the validity the brief froze as its evidence. They are listed under subject
 * `third_party_quote`, by cost id and declared concept (never the supplier): once that validity has passed, the
 * kernel withholds a quote dated after it with `STALE_SOURCE`. A cost the client pays directly is priced by nobody
 * here and is not listed.
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

  // Read from the brief the quote froze. Its `evidence` is what the kernel judges as the source of the amount.
  const brief = result.quote.resolution.brief
  const supplierQuotes: Omit<PriceDateNotice, 'daysLeft'>[] = []

  for (const cost of brief?.thirdPartyCosts ?? [])
    if (cost.settlement === 'reinvoiced')
      supplierQuotes.push({
        kind: 'hard_expiry',
        subject: 'third_party_quote',
        ref: cost.costId,
        toolId: null,
        priceId: null,
        label: cost.label,
        date: cost.evidence.effectiveUntil,
        blocksWith: 'STALE_SOURCE'
      })

  // What the end of a reserve record means for THIS quote: one that waives the reserve is blocked, any other is not.
  const waivesReserve = brief?.contingency?.kind === 'waived'

  const forThisQuote = (n: PriceDateNotice): PriceDateNotice =>
    n.consequence === RESERVE_EXPIRY_CONSEQUENCE && waivesReserve ? { ...n, blocksWith: WAIVER_WITHOUT_RESERVE } : n

  const applies = (n: PriceDateNotice) =>
    n.subject === 'resource_policy' ||
    n.subject === 'third_party_quote' ||
    (n.subject === 'tool_price' && used.includes(n.ref)) ||
    (n.subject === 'catalog_record' && bound.has(n.ref)) ||
    (n.subject === 'credit_provider' && n.toolId !== null && budgeted.has(n.toolId))

  const all = readDates(policy, asOf, options, supplierQuotes)

  return {
    schemaVersion: all.schemaVersion,
    asOf,
    withinDays: all.withinDays,
    pricesUsed: used,
    reviewDue: all.reviewDue.filter(applies).map(forThisQuote),
    dueSoon: all.dueSoon.filter(applies).map(forThisQuote),
    expired: all.expired.filter(applies).map(forThisQuote),
    superseded: all.superseded.filter(applies),
    notInPolicy: used.filter(ref => !known.has(ref))
  }
}
