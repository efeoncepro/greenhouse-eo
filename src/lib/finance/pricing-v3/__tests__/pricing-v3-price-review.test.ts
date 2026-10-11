// A unit price does not expire; it has a review date (resources/price-review.ts).
//
// `price.source.effectiveUntil` stays the hard validity and keeps blocking, exactly as before. `reviewBy` is a
// sibling of `price` that only feeds derived notices: the verifier here is to compose the same quote with and
// without it and compare the whole result. Policies and dates are edited in memory; expected lists are derived from
// the dates of the committed fixtures with independent date arithmetic. Nothing is written under data/.
import { readFileSync, readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { catalogDigest } from '../adapters/catalog-local'
import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { applyResourceChange, previewResourceChange } from '../adapters/resource-maintenance'
import { validateCatalog } from '../catalog/catalog'
import { composeResourceQuote } from '../resources/composition'
import { compositionPolicySchema } from '../resources/composition-contracts'
import type { CompositionPolicy } from '../resources/composition-contracts'
import { creditCatalogSchema } from '../resources/credit-budget'
import { inspectOperatingResources } from '../resources/operating'
import { PRICE_REVIEW_WINDOW_DAYS, quotePriceNotices, reviewResourcePrices } from '../resources/price-review'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operatingDir = 'data/pricing/v3-operating'
const operating = (name: string) => read(`${operatingDir}/${name}.json`)

const rawCatalog = operating('catalog.review-v5')
const rawPolicy = operating('resources.review-v5')
const rawCredits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
const demand = operating('managed-care-colombia.demand')
const catalog = validateCatalog(rawCatalog)
const policy = compositionPolicySchema.parse(rawPolicy)
const QUOTE_DATE: string = demand.brief.quoteDate
const OPEN_ENDED = '9999-12-31'

type Price = CompositionPolicy['tools'][number]['prices'][number]

/** Independent date arithmetic for the expectations: calendar days in UTC, formatted back to an ISO date. */
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

const priced = (p: CompositionPolicy) =>
  p.tools.flatMap(tool =>
    tool.prices.flatMap(price => (price.price ? [{ ref: `${tool.toolId}:${price.priceId}`, tool, price }] : []))
  )

const edit = (base: CompositionPolicy, change: (price: Price, ref: string) => void) => {
  const next = clone(base)

  for (const tool of next.tools) for (const price of tool.prices) change(price, `${tool.toolId}:${price.priceId}`)

  return compositionPolicySchema.parse(next)
}

const compose = (p: unknown, d: unknown = demand) => composeResourceQuote(rawCatalog, p, rawCredits, d)

const usedBy = (r: ReturnType<typeof compose>) =>
  [...new Set(r.attributions.map(a => `${a.toolId}:${a.priceId}`))].sort()

const refs = (notices: { ref: string }[]) => notices.map(n => n.ref).sort()

describe('the field: optional, a sibling of the price, and absent unless someone writes it', () => {
  it('every committed policy, and every policy frozen inside an artifact, parses to itself with no key gained', () => {
    const files = readdirSync(operatingDir).filter(name => /^resources\.review-.*\.json$/.test(name))

    const frozen = readdirSync(operatingDir)
      .filter(name => name.endsWith('.artifact.json'))
      .map(name => read(`${operatingDir}/${name}`))
      .filter(artifact => artifact.semantic?.policy)
      .map(artifact => artifact.semantic.policy)

    expect(files.length).toBeGreaterThanOrEqual(4)
    expect(frozen.length).toBeGreaterThan(0)

    for (const raw of [...files.map(name => read(`${operatingDir}/${name}`)), ...frozen]) {
      const parsed = compositionPolicySchema.parse(raw)

      expect(catalogDigest(parsed)).toBe(catalogDigest(raw))
      // No key gained: the field is in the parsed policy exactly when its author wrote it. Whether a committed
      // policy uses it is data and changes with a successor.
      expect(JSON.stringify(parsed).includes('reviewBy')).toBe(JSON.stringify(raw).includes('reviewBy'))
    }
  })

  it('is accepted next to `price`, and nowhere else', () => {
    const [target] = priced(policy)

    const at = (change: (price: Record<string, unknown>) => void) => {
      const next = clone(rawPolicy)

      change(
        next.tools
          .find((t: { toolId: string }) => t.toolId === target.tool.toolId)
          .prices.find((p: { priceId: string }) => p.priceId === target.price.priceId)
      )

      return compositionPolicySchema.safeParse(next)
    }

    const accepted = at(price => (price.reviewBy = '2027-01-31'))

    expect(accepted.success).toBe(true)
    expect(JSON.stringify(accepted.data)).toContain('"reviewBy":"2027-01-31"')
    // The source object is the kernel's and stays strict: a review date does not fit inside it.
    expect(
      at(price => ((price.price as { source: Record<string, unknown> }).source.reviewBy = '2027-01-31')).success
    ).toBe(false)
    expect(at(price => (price.reviewBy = '2027-02-30')).success).toBe(false)
    expect(at(price => (price.reviewBy = 'soon')).success).toBe(false)
  })

  it('a price nobody has yet cannot carry a review date', () => {
    const pending = policy.tools.flatMap(t =>
      t.prices.filter(p => p.pendingReason).map(p => `${t.toolId}:${p.priceId}`)
    )

    const next = clone(rawPolicy)

    expect(pending.length).toBeGreaterThan(0)

    for (const tool of next.tools)
      for (const price of tool.prices)
        if (`${tool.toolId}:${price.priceId}` === pending[0]) price.reviewBy = '2027-01-31'

    expect(compositionPolicySchema.safeParse(next).success).toBe(false)
  })
})

describe('a review date never blocks and never changes a result', () => {
  const base = compose(policy)
  const used = usedBy(base)

  // Every price the quote used gets a review date already in the past.
  const reviewed = edit(policy, (price, ref) => {
    if (used.includes(ref)) price.reviewBy = addDays(QUOTE_DATE, -10)
  })

  it('the same quote with past review dates is the same result, byte for byte', () => {
    const withReview = compose(reviewed)

    expect(used.length).toBeGreaterThan(0)
    expect(base.quote.calculationStatus).toBe('calculated')
    expect(withReview.quote.calculationStatus).toBe('calculated')
    expect(withReview.quote.diagnostics).toEqual([])
    expect(JSON.stringify(withReview)).not.toContain('reviewBy')
    expect(catalogDigest(withReview)).toBe(catalogDigest(base))
  })

  it('frozen: the two artifacts differ only in the policy they were given', () => {
    const at = '2026-10-11T00:00:00Z'
    const plain = runResourceComposition(rawCatalog, policy, rawCredits, demand, at)
    const noted = runResourceComposition(rawCatalog, reviewed, rawCredits, demand, at)

    expect(catalogDigest(noted.semantic.result)).toBe(catalogDigest(plain.semantic.result))
    expect(noted.replayDigest).not.toBe(plain.replayDigest)
    expect(catalogDigest({ ...noted.semantic, policy: plain.semantic.policy })).toBe(plain.replayDigest)
    // The review date travels in the frozen policy: the artifact replays, and touching the date is detected.
    expect(replayResourceComposition(noted).replayDigest).toBe(noted.replayDigest)

    const touched = clone(noted)

    for (const tool of touched.semantic.policy.tools)
      for (const price of tool.prices) if (price.reviewBy) price.reviewBy = addDays(price.reviewBy, 1)
    expect(() => replayResourceComposition(touched)).toThrow('REPLAY_MISMATCH')
  })

  it('the quote gets a review notice for each of those prices, and none of them is a blocker', () => {
    const notices = quotePriceNotices(compose(reviewed), reviewed, QUOTE_DATE)

    expect(notices.pricesUsed).toEqual(used)
    expect(refs(notices.reviewDue)).toEqual(used)

    for (const notice of notices.reviewDue) {
      expect(notice.kind).toBe('review')
      expect(notice.subject).toBe('tool_price')
      expect(notice.date).toBe(addDays(QUOTE_DATE, -10))
      expect(notice.daysLeft).toBe(-10)
      expect(notice.blocksWith).toBeNull()
    }

    expect(notices.expired).toEqual([])
    expect(notices.notInPolicy).toEqual([])
  })
})

describe('the measured problem: a quote dated after the validity window', () => {
  // A date after the validity of several used prices and before the end of the rest of the fixture.
  const later = clone(demand)
  const base = compose(policy)
  const used = usedBy(base)

  later.brief.quoteDate = addDays(QUOTE_DATE, 40)

  const lapsed = priced(policy)
    .filter(p => used.includes(p.ref) && p.price.price!.source.effectiveUntil < later.brief.quoteDate)
    .map(p => p.ref)
    .sort()

  it('the hard validity still blocks, as it always did', () => {
    const blocked = compose(policy, later)

    expect(lapsed.length).toBeGreaterThan(1)
    expect(blocked.quote.calculationStatus).toBe('needs_input')
    expect(blocked.quote.totals).toBeNull()
    expect(
      blocked.quote.diagnostics
        .filter(d => d.code === 'RESOURCE_PRICE_NOT_EFFECTIVE')
        .map(d => d.path.split(':')[1])
        .sort()
    ).toEqual(lapsed.map(ref => ref.split(':')[0]).sort())
  })

  it('a stable price with an open validity and a review date in its place quotes, and says the review is due', () => {
    // What the owner asked for: the price stays valid until someone changes it; the old end date becomes a review.
    const stable = edit(policy, (price, ref) => {
      if (!lapsed.includes(ref) || !price.price) return

      price.reviewBy = price.price.source.effectiveUntil
      price.price.source.effectiveUntil = OPEN_ENDED
    })

    const quoted = compose(stable, later)
    const notices = quotePriceNotices(quoted, stable, later.brief.quoteDate)

    expect(quoted.quote.calculationStatus).toBe('calculated')
    expect(quoted.quote.diagnostics).toEqual([])
    expect(refs(notices.reviewDue)).toEqual(lapsed)
    expect(notices.reviewDue.every(n => n.kind === 'review' && n.daysLeft < 0)).toBe(true)
    expect(notices.expired).toEqual([])

    // Same amounts as the quote of the original date: only the dates moved.
    expect(quoted.attributions.map(a => [a.toolId, a.priceId, a.attributedMonthlyCost])).toEqual(
      base.attributions.map(a => [a.toolId, a.priceId, a.attributedMonthlyCost])
    )
  })
})

describe('notices of one quote are only about what that quote used', () => {
  const base = compose(policy)
  const used = usedBy(base)

  const unused = priced(policy)
    .map(p => p.ref)
    .filter(ref => !used.includes(ref))

  const everywhere = edit(policy, price => {
    if (price.price) price.reviewBy = addDays(QUOTE_DATE, -1)
  })

  it('the policy reading lists every price; the quote reading lists the ones it used', () => {
    const all = reviewResourcePrices(everywhere, QUOTE_DATE)
    const mine = quotePriceNotices(compose(everywhere), everywhere, QUOTE_DATE)

    expect(unused.length).toBeGreaterThan(0)
    expect(refs(all.reviewDue)).toEqual(
      priced(policy)
        .map(p => p.ref)
        .sort()
    )
    expect(refs(mine.reviewDue)).toEqual(used.filter(ref => refs(all.reviewDue).includes(ref)))
    expect(refs(mine.reviewDue).some(ref => unused.includes(ref))).toBe(false)
    // Hard validities about to end: again only those of the prices in the quote.
    expect(refs(mine.dueSoon.filter(n => n.subject === 'tool_price')).every(ref => used.includes(ref))).toBe(true)
    expect(mine.dueSoon.filter(n => n.subject === 'tool_price').length).toBeGreaterThan(0)
    expect(all.dueSoon.length).toBeGreaterThan(mine.dueSoon.length)
  })

  it('takes the result or the artifact that froze it', () => {
    const artifact = runResourceComposition(rawCatalog, everywhere, rawCredits, demand, '2026-10-11T00:00:00Z')

    expect(quotePriceNotices(artifact, artifact.semantic.policy, QUOTE_DATE)).toEqual(
      quotePriceNotices(artifact.semantic.result, everywhere, QUOTE_DATE)
    )
  })

  it('a price the quote used that the policy read no longer has is reported, not dropped', () => {
    const dropped = clone(policy)
    const [toolId, priceId] = used[0].split(':')
    const tool = dropped.tools.find(t => t.toolId === toolId)!

    tool.prices = tool.prices.filter(p => p.priceId !== priceId)

    expect(quotePriceNotices(base, dropped, QUOTE_DATE).notInPolicy).toEqual([used[0]])
  })

  it('a pooled credit budget is not a policy price: it is matched to its provider instead', () => {
    const designer = composeResourceQuote(
      operating('catalog.review-v2'),
      operating('resources.review-v2'),
      rawCredits,
      operating('designer.demand')
    )

    const designerPolicy = compositionPolicySchema.parse(operating('resources.review-v2'))
    const asOf: string = operating('designer.demand').brief.quoteDate
    const expiring = clone(rawCredits)

    expiring.providers[0].source.priceValidUntil = addDays(asOf, 5)

    const notices = quotePriceNotices(designer, designerPolicy, asOf, { credits: creditCatalogSchema.parse(expiring) })
    const budgeted = designer.creditBudgets.map(b => b.toolId)

    expect(budgeted.length).toBeGreaterThan(0)
    expect(notices.pricesUsed.some(ref => budgeted.includes(ref.split(':')[0]))).toBe(false)
    expect(notices.notInPolicy).toEqual([])
    expect(notices.dueSoon.filter(n => n.subject === 'credit_provider')).toEqual([
      expect.objectContaining({
        kind: 'hard_expiry',
        ref: expiring.providers[0].providerId,
        date: addDays(asOf, 5),
        daysLeft: 5,
        blocksWith: 'TOPUP_PRICE_EXPIRED'
      })
    ])
  })
})

describe('what ends soon is derived from the dates of the policy', () => {
  const window = (asOf: string, days: number) =>
    priced(policy)
      .filter(
        p => asOf <= p.price.price!.source.effectiveUntil && p.price.price!.source.effectiveUntil <= addDays(asOf, days)
      )
      .map(p => p.ref)
      .sort()

  it('hard validities inside the window, both ends included, each with its date and days left', () => {
    const review = reviewResourcePrices(policy, QUOTE_DATE)
    const expected = window(QUOTE_DATE, PRICE_REVIEW_WINDOW_DAYS)

    expect(PRICE_REVIEW_WINDOW_DAYS).toBe(30)
    expect(review.withinDays).toBe(PRICE_REVIEW_WINDOW_DAYS)
    expect(expected.length).toBeGreaterThan(0)
    expect(expected.length).toBeLessThan(priced(policy).length)
    expect(refs(review.dueSoon)).toEqual(expected)

    for (const notice of review.dueSoon) {
      const source = priced(policy).find(p => p.ref === notice.ref)!.price.price!.source

      expect(notice.kind).toBe('hard_expiry')
      expect(notice.blocksWith).toBe('RESOURCE_PRICE_NOT_EFFECTIVE')
      expect(notice.date).toBe(source.effectiveUntil)
      expect(addDays(QUOTE_DATE, notice.daysLeft)).toBe(source.effectiveUntil)
    }

    // Sorted by date: the first to act on comes first.
    expect(review.dueSoon.map(n => n.date)).toEqual([...review.dueSoon.map(n => n.date)].sort())
    expect(review.reviewDue).toEqual([])
  })

  it('a wider window lists more, a window of zero days only what ends today', () => {
    expect(refs(reviewResourcePrices(policy, QUOTE_DATE, { withinDays: 90 }).dueSoon)).toEqual(window(QUOTE_DATE, 90))
    expect(window(QUOTE_DATE, 90).length).toBeGreaterThan(window(QUOTE_DATE, 30).length)
    expect(reviewResourcePrices(policy, QUOTE_DATE, { withinDays: 0 }).dueSoon).toEqual([])
  })

  it('the last valid day is still valid; the day after it is expired', () => {
    const first = priced(policy)
      .map(p => p.price.price!.source.effectiveUntil)
      .sort()[0]

    const ending = priced(policy)
      .filter(p => p.price.price!.source.effectiveUntil === first)
      .map(p => p.ref)
      .sort()

    const lastDay = reviewResourcePrices(policy, first)
    const dayAfter = reviewResourcePrices(policy, addDays(first, 1))

    expect(lastDay.expired).toEqual([])
    expect(refs(lastDay.dueSoon.filter(n => n.daysLeft === 0))).toEqual(ending)
    expect(refs(dayAfter.expired)).toEqual(ending)
    expect(dayAfter.expired.every(n => n.daysLeft === -1 && n.kind === 'hard_expiry')).toBe(true)
  })

  it('refuses a reading date that is not a date instead of answering that nothing is due', () => {
    expect(() => reviewResourcePrices(policy, '2026-13-01')).toThrow()
    expect(() => reviewResourcePrices(policy, 'today')).toThrow()
    expect(() => quotePriceNotices(compose(policy), policy, '')).toThrow()
  })

  it('the window includes its last day and stops there', () => {
    const [target] = priced(policy)
    const end = target.price.price!.source.effectiveUntil
    const asOf = addDays(end, -PRICE_REVIEW_WINDOW_DAYS)
    const listed = (withinDays: number) => refs(reviewResourcePrices(policy, asOf, { withinDays }).dueSoon)

    expect(listed(PRICE_REVIEW_WINDOW_DAYS)).toContain(target.ref)
    expect(listed(PRICE_REVIEW_WINDOW_DAYS - 1)).not.toContain(target.ref)
    expect(reviewResourcePrices(policy, asOf).dueSoon.find(n => n.ref === target.ref)!.daysLeft).toBe(
      PRICE_REVIEW_WINDOW_DAYS
    )
  })

  it('a review date ahead is listed as soon, with its own kind; one behind is due', () => {
    const [target] = priced(policy)

    const dated = (reviewBy: string) =>
      reviewResourcePrices(
        edit(policy, (price, ref) => {
          if (ref === target.ref) price.reviewBy = reviewBy
        }),
        QUOTE_DATE
      )

    const soon = dated(addDays(QUOTE_DATE, 7))
    const due = dated(addDays(QUOTE_DATE, -7))
    const far = dated(addDays(QUOTE_DATE, 200))

    const reviews = (notices: { kind: string; ref: string }[]) =>
      notices.filter(n => n.kind === 'review').map(n => n.ref)

    expect(reviews(soon.dueSoon)).toEqual([target.ref])
    expect(soon.reviewDue).toEqual([])
    expect(reviews(due.reviewDue)).toEqual([target.ref])
    expect(reviews(due.dueSoon)).toEqual([])
    expect(reviews(far.dueSoon)).toEqual([])
    expect(far.reviewDue).toEqual([])
  })
})

describe('the other hard dates that can block a quote', () => {
  it('the validity of the policy itself', () => {
    const ending = clone(policy)

    ending.source.effectiveUntil = addDays(QUOTE_DATE, 3)

    expect(reviewResourcePrices(policy, QUOTE_DATE).dueSoon.some(n => n.subject === 'resource_policy')).toBe(false)
    expect(reviewResourcePrices(ending, QUOTE_DATE).dueSoon.filter(n => n.subject === 'resource_policy')).toEqual([
      expect.objectContaining({
        kind: 'hard_expiry',
        ref: policy.version,
        daysLeft: 3,
        blocksWith: 'RESOURCE_POLICY_NOT_EFFECTIVE'
      })
    ])
    expect(reviewResourcePrices(ending, addDays(QUOTE_DATE, 4)).expired.map(n => n.subject)).toContain(
      'resource_policy'
    )
  })

  it('catalog records that end with no successor; a record ended by its next revision is not an expiry', () => {
    const review = reviewResourcePrices(policy, QUOTE_DATE, { catalog })
    const records = [...review.expired, ...review.dueSoon].filter(n => n.subject === 'catalog_record')

    // Derived from the catalog: the last revision of each record, when it ends before or inside the window.
    const expected = catalog.records
      .filter(
        r =>
          !r.retiredAt &&
          r.source.effectiveUntil <= addDays(QUOTE_DATE, PRICE_REVIEW_WINDOW_DAYS) &&
          !catalog.records.some(next => next.recordId === r.recordId && next.revision > r.revision)
      )
      .map(r => r.recordId)
      .sort()

    const superseded = catalog.records.filter(r =>
      catalog.records.some(next => next.recordId === r.recordId && next.revision > r.revision)
    )

    expect(superseded.length).toBeGreaterThan(0)
    expect(refs(records)).toEqual(expected)
    expect(records.every(n => n.kind === 'hard_expiry' && n.toolId === null)).toBe(true)
    // Without the catalog none of them is read.
    expect(
      [...reviewResourcePrices(policy, QUOTE_DATE).expired, ...reviewResourcePrices(policy, QUOTE_DATE).dueSoon].some(
        n => n.subject === 'catalog_record'
      )
    ).toBe(false)
  })

  it('an FX record the quote bound is in its notices once it is about to end', () => {
    const ending = clone(rawCatalog)
    const bound = compose(policy).quote.resolution.bindings.find(b => b.purpose === 'fx')!.record.recordId

    for (const record of ending.records)
      if (record.recordId === bound && record.source.effectiveUntil === OPEN_ENDED)
        record.source.effectiveUntil = addDays(QUOTE_DATE, 2)

    const notices = quotePriceNotices(compose(policy), policy, QUOTE_DATE, { catalog: validateCatalog(ending) })

    expect(notices.dueSoon.filter(n => n.subject === 'catalog_record')).toEqual([
      expect.objectContaining({ kind: 'hard_expiry', ref: bound, date: addDays(QUOTE_DATE, 2), daysLeft: 2 })
    ])
  })
})

describe('an FX rate the composition brought for the currency of a tool', () => {
  it('is matched back to its catalog record, and that record ends the day it was read', () => {
    const designerCatalog = validateCatalog(operating('catalog.review-v2'))
    const designerPolicy = compositionPolicySchema.parse(operating('resources.review-v2'))
    const designerDemand = operating('designer.demand')
    const asOf: string = designerDemand.brief.quoteDate
    const [recordId]: string[] = designerDemand.fxRecordIds
    const record = designerCatalog.records.find(r => r.recordId === recordId)!
    const designer = composeResourceQuote(designerCatalog, designerPolicy, rawCredits, designerDemand)

    const of = (date: string) => {
      const notices = quotePriceNotices(designer, designerPolicy, date, { catalog: designerCatalog })

      return {
        soon: notices.dueSoon.filter(n => n.ref === recordId),
        expired: notices.expired.filter(n => n.ref === recordId)
      }
    }

    // Not bound by any line: the result only keeps the rate and its source.
    expect(designer.quote.resolution.bindings.some(b => b.record.recordId === recordId)).toBe(false)
    expect(record.source.effectiveUntil).toBe(asOf)
    expect(of(asOf).soon).toEqual([expect.objectContaining({ kind: 'hard_expiry', date: asOf, daysLeft: 0 })])
    expect(of(asOf).expired).toEqual([])
    // The day after, a quote that needs this currency has no rate to select.
    expect(of(addDays(asOf, 1)).expired).toEqual([expect.objectContaining({ kind: 'hard_expiry', daysLeft: -1 })])

    const nextDay = clone(designerDemand)

    nextDay.brief.quoteDate = addDays(asOf, 1)
    for (const budget of nextDay.creditBudgets) budget.purchaseDate = addDays(asOf, 1)

    expect(
      composeResourceQuote(designerCatalog, designerPolicy, rawCredits, nextDay).quote.diagnostics.map(d => d.code)
    ).toContain('RESOURCE_FX_SELECTION_REQUIRED')
  })
})

describe('resources inspect lists both, next to everything it already returned', () => {
  it('keeps its fields and adds the dates to act on, read at the date asked', () => {
    const r = inspectOperatingResources(rawCatalog, rawPolicy, QUOTE_DATE)
    const review = reviewResourcePrices(policy, QUOTE_DATE, { catalog })

    expect(Object.keys(r)).toEqual([
      'schemaVersion',
      'binding',
      'catalogVersion',
      'policyVersion',
      'asOf',
      'mode',
      'policyEffective',
      'platformFees',
      'profiles',
      'tools',
      'priceReview',
      'instructions'
    ])
    expect(r.priceReview).toEqual({
      withinDays: PRICE_REVIEW_WINDOW_DAYS,
      reviewDue: review.reviewDue,
      dueSoon: review.dueSoon,
      expired: review.expired
    })
    expect(r.priceReview.dueSoon.length).toBeGreaterThan(0)
    // A price is offered as `reference_only` on its last valid day and is in the list of what ends soon.
    expect(r.tools.flatMap(t => t.prices).some(p => p.availability === 'reference_only')).toBe(true)
  })

  it('a review date written in the policy shows up as due, and the price stays available', () => {
    const [target] = priced(policy)

    const reviewed = edit(policy, (price, ref) => {
      if (ref === target.ref) price.reviewBy = addDays(QUOTE_DATE, -1)
    })

    const r = inspectOperatingResources(rawCatalog, reviewed, QUOTE_DATE)

    const shown = r.tools
      .find(t => t.toolId === target.tool.toolId)!
      .prices.find(p => p.priceId === target.price.priceId)!

    expect(refs(r.priceReview.reviewDue)).toEqual([target.ref])
    expect(shown.availability).toBe('reference_only')
    expect(shown.reviewBy).toBe(addDays(QUOTE_DATE, -1))
  })

  it('the query narrows the lists like it narrows the rest', () => {
    const all = inspectOperatingResources(rawCatalog, rawPolicy, QUOTE_DATE)
    const [first] = all.priceReview.dueSoon
    const narrowed = inspectOperatingResources(rawCatalog, rawPolicy, QUOTE_DATE, first.toolId!)

    expect(narrowed.priceReview.dueSoon.length).toBeGreaterThan(0)
    expect(narrowed.priceReview.dueSoon.length).toBeLessThan(all.priceReview.dueSoon.length)
    expect(narrowed.priceReview.dueSoon.every(n => JSON.stringify(n).includes(first.toolId!))).toBe(true)
  })

  it('with the credit catalog it also reads the validity of the top-up prices', () => {
    const expiring = clone(rawCredits)

    expiring.providers[0].source.priceValidUntil = addDays(QUOTE_DATE, 5)

    const without = inspectOperatingResources(rawCatalog, rawPolicy, QUOTE_DATE, '', rawCredits)
    const withDate = inspectOperatingResources(rawCatalog, rawPolicy, QUOTE_DATE, '', expiring)

    // The committed credit catalog declares no end date for its prices.
    expect(without.priceReview.dueSoon.some(n => n.subject === 'credit_provider')).toBe(false)
    expect(withDate.priceReview.dueSoon.filter(n => n.subject === 'credit_provider').map(n => n.ref)).toEqual([
      expiring.providers[0].providerId
    ])
  })
})

describe('maintenance: extending a validity and adding a review date, same amount and same reference', () => {
  const used = usedBy(compose(policy))

  const successor = (version: string, change: (price: Price, ref: string) => void) => {
    const next = edit(policy, change)

    next.version = version

    return {
      schemaVersion: 'pricing-v3-resource-change/1',
      kind: 'policy',
      baseDigest: catalogDigest(policy),
      reason: 'Stable unit prices: open validity, review date in place of the old end date.',
      replacement: next
    }
  }

  const stable = () =>
    successor('operating-review-stable-prices-test', (price, ref) => {
      if (!price.price || !used.includes(ref)) return

      price.reviewBy = price.price.source.effectiveUntil
      price.price.source.effectiveUntil = OPEN_ENDED
    })

  it('previews and applies, for confirmed and for estimated prices alike', () => {
    const change = stable()
    const touched = priced(change.replacement).filter(p => p.price.reviewBy)
    const preview = previewResourceChange(rawCatalog, policy, rawCredits, change, [demand])

    // The fixture exercises both statuses, and every touched price kept its amount and its reference.
    expect([...new Set(touched.map(p => p.price.price!.source.status))].sort()).toEqual(['confirmed', 'estimated'])

    for (const { ref, price } of touched) {
      const before = priced(policy).find(p => p.ref === ref)!.price.price!

      expect(price.price!.amount).toBe(before.amount)
      expect(price.price!.source.reference).toBe(before.source.reference)
      expect(price.price!.source.effectiveUntil).toBe(OPEN_ENDED)
      expect(price.reviewBy).toBe(before.source.effectiveUntil)
    }

    expect(preview.status).toBe('review_only')
    // Impact on a quote of today: no amount moves. The new end of validity is recorded with each price the quote
    // used (the source travels into the result), and that date is the only thing that differs. The review date
    // itself is not in the result at all.
    const { before, after } = preview.impacts[0]

    const withoutValidityEnd = (value: unknown) =>
      JSON.stringify(value, (key, v) => (key === 'effectiveUntil' ? null : v))

    expect(after.quote.totals).toEqual(before.quote.totals)
    expect(after.quote.calculationStatus).toBe('calculated')
    expect(catalogDigest(after)).not.toBe(catalogDigest(before))
    expect(withoutValidityEnd(after)).toBe(withoutValidityEnd(before))
    expect(JSON.stringify(after)).not.toContain('reviewBy')

    const applied = applyResourceChange(rawCatalog, policy, rawCredits, change, preview.previewDigest, [demand])

    expect(applied.successor.version).toBe('operating-review-stable-prices-test')
    expect(JSON.stringify(applied.successor)).toContain('reviewBy')
    expect(() => applyResourceChange(rawCatalog, policy, rawCredits, change, 'not-the-preview')).toThrow(
      'RESOURCE_PREVIEW_CONFLICT'
    )
  })

  it('the rule that protects a confirmed amount is untouched: a new amount on the same reference is still refused', () => {
    const confirmed = priced(policy).find(p => used.includes(p.ref) && p.price.price!.source.status === 'confirmed')!

    const repriced = successor('operating-review-repriced-test', (price, ref) => {
      if (ref !== confirmed.ref || !price.price) return

      price.price.amount = String(Number(price.price.amount) + 1)
      price.price.source.effectiveUntil = OPEN_ENDED
      price.reviewBy = addDays(QUOTE_DATE, 90)
    })

    expect(() => previewResourceChange(rawCatalog, policy, rawCredits, repriced)).toThrow(
      'RESOURCE_SOURCE_RECONFIRMATION_REQUIRED'
    )
  })
})
