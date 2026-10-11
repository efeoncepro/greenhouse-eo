import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { PricingV3Error } from '../errors'
import { composeResourceQuote } from '../resources/composition'
import { assessCompositionReadiness, projectCompositionPreview } from '../resources/readiness'
import { linesBelowPolicyFloor, summarizeComposition } from '../resources/summary'

type Composition = ReturnType<typeof composeResourceQuote>

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value))
const identity = { calculationId: 'composition-under-test' }

// Managed service whose pricing policy carries its own floor.
const managedCatalog = () => operating('catalog.review-v3')
const managedDemand = () => operating('managed-care.demand')

const managed = (catalog = managedCatalog(), demand = managedDemand()) =>
  composeResourceQuote(catalog, operating('resources.review-v5'), credits, demand)

// Historical pricing with minimum margin 0: nothing can be under the floor.
const designer = () =>
  composeResourceQuote(
    operating('catalog.review-v2'),
    operating('resources.review-v2'),
    credits,
    operating('designer.demand')
  )

// The default baseline catalog has no managed-service offer, so the same demand cannot be resolved.
const unresolved = () =>
  composeResourceQuote(
    read('data/pricing/v3-catalog/catalog.review-v1.json'),
    operating('resources.review-v5'),
    credits,
    managedDemand()
  )

/** What the kernel itself reported, read straight from its diagnostics. */
const kernelFloor = (r: Composition) =>
  r.quote.periods.flatMap(p =>
    p.result.diagnostics.filter(d => d.code === 'MARGIN_BELOW_FLOOR').map(d => `periods.${p.periodId}.${d.fieldPath}`)
  )

const summaryFloor = (r: Composition) =>
  summarizeComposition(r, identity).marginFloor.lines.flatMap(l =>
    l.periodIds.map(periodId => `periods.${periodId}.result.lines.${l.lineId}`)
  )

const floorGaps = (r: Composition) =>
  assessCompositionReadiness(r)
    .gaps.filter(g => g.code === 'MARGIN_BELOW_POLICY_FLOOR')
    .map(g => g.path)

const offerPricing = (catalog: ReturnType<typeof managedCatalog>, offerId: string) =>
  catalog.records.filter(
    (r: { kind: string; value: { offerId?: string } }) => r.kind === 'pricing' && r.value.offerId === offerId
  ) as { value: { profileId: string; method: string; rate: string; minimumMargin: string } }[]

const horizon = (periods: number) => {
  const demand = managedDemand()

  demand.brief.periods = periods
  demand.allocations = Array.from({ length: periods }, (_, i) =>
    demand.allocations.map((a: { periodId: number }) => ({ ...a, periodId: i + 1 }))
  ).flat()

  return managed(managedCatalog(), demand)
}

describe('margin floor of the selected pricing policy', () => {
  it('reports exactly the lines the kernel flagged, with the stored amounts of those lines', () => {
    const r = managed()
    const flagged = kernelFloor(r)

    expect(flagged.length).toBeGreaterThan(0)
    expect(summaryFloor(r).sort()).toEqual([...flagged].sort())
    expect(floorGaps(r).sort()).toEqual([...flagged].sort())

    const assessed = assessCompositionReadiness(r)

    expect(
      assessed.margin?.policyFloor.linesBelowFloor.map(l => `periods.${l.periodId}.result.lines.${l.lineId}`).sort()
    ).toEqual([...flagged].sort())
    expect(summarizeComposition(r, identity).marginFloor.flaggedLinePeriods).toBe(flagged.length)

    const policies = offerPricing(managedCatalog(), managedDemand().brief.offerId)

    for (const reported of linesBelowPolicyFloor(r)) {
      const line = r.quote.periods
        .find(p => p.periodId === reported.periodId)!
        .result.lines.find(l => l.lineId === reported.lineId)!

      const profile = managedDemand().brief.lines.find(
        (l: { lineId: string }) => l.lineId === reported.parentLineId
      ).profile

      expect(reported.net).toBe(line.net)
      expect(reported.marginAmount).toBe(line.marginAmount)
      expect(reported.minimumMargin).toBe(line.minimumMargin)
      // The floor shown is the one stored in the pricing record the brief selected, not a constant of the reader.
      expect(reported.minimumMargin).toBe(policies.find(p => p.value.profileId === profile)!.value.minimumMargin)
      // Reading precision may only understate the stored ratio.
      expect(new Decimal(reported.marginRateRoundedDown!).lte(new Decimal(line.marginAmount).div(line.net))).toBe(true)
      expect(new Decimal(reported.marginRateRoundedDown!).lt(line.minimumMargin)).toBe(true)
      expect(new Decimal(reported.marginAmountShortOfFloor!).gt(0)).toBe(true)
    }
  })

  it('judges the quote against the floor of the policy its lines were priced with, and against no other', () => {
    const margin = assessCompositionReadiness(managed()).margin!

    expect(margin.approved).toBe(false)
    expect(margin.modeledRate).toBe(managed().quote.totals!.marginRate)
    // No generic target or floor stands next to the verdict: a quote answers to its own offer.
    expect(margin).not.toHaveProperty('proposedTarget')
    expect(margin).not.toHaveProperty('proposedFloor')
    expect(margin).not.toHaveProperty('belowProposedFloor')

    const offerId = managedDemand().brief.offerId
    const policies = offerPricing(managedCatalog(), offerId)

    // The rule listed is the one of the pricing records the brief selected, with every line it priced.
    expect(margin.pricingPolicies.flatMap(policy => policy.lineIds).sort()).toEqual(
      managedDemand()
        .brief.lines.map((l: { lineId: string }) => l.lineId)
        .sort()
    )

    for (const policy of margin.pricingPolicies)
      for (const lineId of policy.lineIds) {
        const profile = managedDemand().brief.lines.find((l: { lineId: string }) => l.lineId === lineId).profile
        const record = policies.find(p => p.value.profileId === profile)!.value

        expect([policy.offerId, policy.method, policy.rate, policy.minimumMargin]).toEqual([
          offerId,
          record.method,
          record.rate,
          record.minimumMargin
        ])
      }

    // The verdict is the kernel's: lines under the floor of their own policy.
    expect(margin.policyFloor.linesBelowFloor.length).toBeGreaterThan(0)
    expect(margin.belowPolicyFloor).toBe(true)
  })

  it('reports nothing when the selected policy has no floor to break', () => {
    const r = designer()

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(kernelFloor(r)).toEqual([])
    expect(summaryFloor(r)).toEqual([])
    expect(floorGaps(r)).toEqual([])
    expect(assessCompositionReadiness(r).margin?.policyFloor.linesBelowFloor).toEqual([])
  })

  it('follows the pricing record: a rate above the floor removes the signal', () => {
    const catalog = managedCatalog()
    const policies = offerPricing(catalog, managedDemand().brief.offerId)

    expect(policies.length).toBeGreaterThan(0)

    for (const policy of policies) {
      expect(policy.value.method).toBe('target_margin')
      policy.value.rate = new Decimal(policy.value.minimumMargin).plus('0.05').toString()
    }

    const r = managed(catalog)

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(new Decimal(r.quote.totals!.net).gt(managed().quote.totals!.net)).toBe(true)
    expect(kernelFloor(r)).toEqual([])
    expect(summaryFloor(r)).toEqual([])
    expect(floorGaps(r)).toEqual([])
    expect(summarizeComposition(r, identity).reviewSignals.map(s => s.code)).not.toContain('MARGIN_BELOW_FLOOR')
  })

  it('never judges the floor itself: without the kernel diagnostic the same amounts report nothing', () => {
    const r = structuredClone(managed())

    for (const period of r.quote.periods)
      period.result.diagnostics = period.result.diagnostics.filter(d => d.code !== 'MARGIN_BELOW_FLOOR')

    // The lines are numerically unchanged; only the kernel verdict was removed from the copy.
    expect(r.quote.periods.flatMap(p => p.result.lines)).toEqual(managed().quote.periods.flatMap(p => p.result.lines))
    expect(summaryFloor(r)).toEqual([])
    expect(floorGaps(r)).toEqual([])
    expect(assessCompositionReadiness(r).margin?.policyFloor.linesBelowFloor).toEqual([])
  })
})

describe('composition summary', () => {
  it('carries the totals, statuses, blockers and assumptions of the result unchanged', () => {
    for (const r of [managed(), designer(), unresolved()]) {
      const s = summarizeComposition(r, identity)

      expect(s.totals).toEqual(r.quote.totals)
      expect(s.calculationStatus).toBe(r.quote.calculationStatus)
      expect(s.reviewStatus).toBe(r.reviewStatus)
      expect(s.quoteReviewStatus).toBe(r.quote.reviewStatus)
      expect(s.diagnostics).toEqual(r.quote.diagnostics)
      expect(s.assumptions).toEqual(r.quote.resolution.assumptions)
      expect(s.periods).toEqual(
        r.quote.periods.map(p => ({
          periodId: p.periodId,
          calculationStatus: p.result.calculationStatus,
          totals: p.result.totals
        }))
      )
      expect(s.binding).toBe(false)
      expect(s.version).toBe(r.version)
      expect(s.commercialUnit).toBe(r.commercialUnit)
      expect(s.cashMeaning).toBe(r.cashMeaning)
    }
  })

  it('shows the margin rate at reading precision without replacing the stored value', () => {
    const r = managed()
    const s = summarizeComposition(r, identity)
    const stored = new Decimal(r.quote.totals!.marginRate!)

    expect(s.totals!.marginRate).toBe(r.quote.totals!.marginRate)
    expect(s.marginRateRoundedDown!.length).toBeLessThan(r.quote.totals!.marginRate!.length)
    expect(new Decimal(s.marginRateRoundedDown!).lte(stored)).toBe(true)
    expect(stored.minus(s.marginRateRoundedDown!).lt('0.000001')).toBe(true)
  })

  it('groups every period diagnostic by code and severity without losing one', () => {
    for (const r of [managed(), designer(), horizon(3)]) {
      const all = r.quote.periods.flatMap(p => p.result.diagnostics.map(d => ({ ...d, periodId: p.periodId })))
      const signals = summarizeComposition(r, identity).reviewSignals

      expect(all.length).toBeGreaterThan(0)
      expect(signals.reduce((sum, s) => sum + s.count, 0)).toBe(all.length)
      expect(new Set(signals.map(s => `${s.code}|${s.severity}`)).size).toBe(signals.length)

      for (const s of signals) {
        const rows = all.filter(d => d.code === s.code && d.severity === s.severity)

        expect(s.count).toBe(rows.length)
        expect([...s.paths].sort()).toEqual([...new Set(rows.map(d => d.fieldPath))].sort())
        expect([...s.periodIds].sort()).toEqual([...new Set(rows.map(d => d.periodId))].sort())
        expect([...s.lineIds].sort()).toEqual([...new Set(rows.flatMap(d => (d.lineId ? [d.lineId] : [])))].sort())
      }
    }
  })

  it('lists what was decided about tools and only counts what was not required', () => {
    for (const r of [managed(), designer(), operatingCrm(), horizon(3)]) {
      const { counts, included, clientProvided, explicitlyExcluded } = summarizeComposition(r, identity).toolSelections

      const expand = (groups: typeof included) =>
        groups.flatMap(g => g.periodIds.map(p => `${p}|${g.lineId}|${g.toolId}|${JSON.stringify(g.reasons)}`)).sort()

      const rows = (filter: (s: Composition['selections'][number]) => boolean) =>
        r.selections
          .filter(filter)
          .map(s => `${s.periodId}|${s.lineId}|${s.toolId}|${JSON.stringify(s.reasons)}`)
          .sort()

      const excluded = (s: Composition['selections'][number]) =>
        !s.included && s.reasons.some(x => x.startsWith('profile-task-excluded:'))

      const covered = (s: Composition['selections'][number]) =>
        s.included && s.reasons.some(x => x.startsWith('client-provided:'))

      expect(expand(included)).toEqual(rows(s => s.included))
      expect(expand(explicitlyExcluded)).toEqual(rows(excluded))
      expect(expand(clientProvided)).toEqual(rows(covered))
      expect(counts.rows).toBe(r.selections.length)
      expect(counts.included).toBe(rows(s => s.included).length)
      expect(counts.notRequiredForWork).toBe(r.selections.filter(s => !s.included && !excluded(s)).length)
      expect(counts.included + counts.explicitlyExcluded + counts.notRequiredForWork).toBe(counts.rows)
    }

    expect(summarizeComposition(managed(), identity).toolSelections.explicitlyExcluded.length).toBeGreaterThan(0)
    expect(summarizeComposition(operatingCrm(), identity).toolSelections.clientProvided.length).toBeGreaterThan(0)
  })

  it('keeps attributed cost and new cash distinguishable', () => {
    const r = designer()
    const s = summarizeComposition(r, identity)

    expect(r.resourceIncrementalCash.length).toBeGreaterThan(0)
    expect(
      s.resourceIncrementalCash.flatMap(c => c.periodIds.map(p => `${p}|${c.toolId}|${c.amount}|${c.currency}`)).sort()
    ).toEqual(r.resourceIncrementalCash.map(c => `${c.periodId}|${c.toolId}|${c.amount}|${c.currency}`).sort())
    expect(
      s.creditBudgets.flatMap(b => b.periodIds.map(p => `${p}|${b.toolId}|${b.totalBudgetCost}|${b.incrementalCash}`))
    ).toEqual(
      r.creditBudgets.map(
        b => `${b.periodId}|${b.toolId}|${b.result.breakdown?.totalBudgetCost}|${b.result.breakdown?.incrementalCash}`
      )
    )
    expect(
      s.attributions.flatMap(a => a.periodIds.map(p => `${p}|${a.toolId}|${a.attributedMonthlyCost}`)).sort()
    ).toEqual(r.attributions.map(a => `${a.periodId}|${a.toolId}|${a.attributedMonthlyCost}`).sort())
    expect(s.cashLedger.flatMap(c => c.periodIds.map(p => `${p}|${c.key}|${c.amount}`)).sort()).toEqual(
      r.quote.cashLedger.map(c => `${c.periodId}|${c.key}|${c.amount}`).sort()
    )
  })

  it('is a small fraction of the full result', () => {
    const r = managed()
    const ratio = bytes(summarizeComposition(r, identity)) / bytes(r)

    expect(ratio).toBeLessThan(0.15)
  })

  it('does not grow with the horizon the way the full result does', () => {
    const one = horizon(1)
    const twelve = horizon(12)

    expect(twelve.quote.calculationStatus).toBe('calculated')
    expect(twelve.quote.periods).toHaveLength(12)

    const fullGrowth = bytes(twelve) / bytes(one)
    const summaryGrowth = bytes(summarizeComposition(twelve, identity)) / bytes(summarizeComposition(one, identity))

    expect(fullGrowth).toBeGreaterThan(6)
    expect(summaryGrowth).toBeLessThan(fullGrowth / 3)

    // Grouping must not drop a period: every flagged line of every period is still reported.
    expect(kernelFloor(twelve)).toHaveLength(kernelFloor(one).length * 12)
    expect(summaryFloor(twelve).sort()).toEqual(kernelFloor(twelve).sort())
    expect(floorGaps(twelve).sort()).toEqual(kernelFloor(twelve).sort())
    expect(summarizeComposition(twelve, identity).marginFloor.lines).toHaveLength(kernelFloor(one).length)
  })

  it('returns every blocker and no totals when the quote needs input', () => {
    const r = unresolved()
    const s = summarizeComposition(r, identity)

    expect(r.quote.diagnostics.map(d => d.code)).toContain('MISSING_CATALOG_SELECTION')
    expect(s.calculationStatus).toBe('needs_input')
    expect(s.totals).toBeNull()
    expect(s.marginRateRoundedDown).toBeNull()
    expect(s.diagnostics).toHaveLength(r.quote.diagnostics.length)
    expect(s.diagnostics).toEqual(r.quote.diagnostics)
    expect(s.periods).toHaveLength(r.quote.periods.length)
    expect(s.marginFloor.lines).toEqual([])
    expect(assessCompositionReadiness(r).margin).toBeNull()
    expect(floorGaps(r)).toEqual([])
  })

  it('reads the frozen result without changing it or its digest', () => {
    const artifact = runResourceComposition(
      managedCatalog(),
      operating('resources.review-v5'),
      credits,
      managedDemand(),
      '2026-10-10T00:00:00Z'
    )

    const before = JSON.stringify(artifact.semantic.result)
    const s = summarizeComposition(artifact.semantic.result, artifact)

    assessCompositionReadiness(artifact.semantic.result)
    expect(JSON.stringify(artifact.semantic.result)).toBe(before)
    expect(s.calculationId).toBe(artifact.calculationId)
    expect(s.replayDigest).toBe(artifact.replayDigest)
    expect(replayResourceComposition(artifact).replayDigest).toBe(artifact.replayDigest)
    expect('replayDigest' in summarizeComposition(artifact.semantic.result, identity)).toBe(false)
  })
})

describe('readiness rejections', () => {
  it('raises the registered error when a preview is asked of an incomplete simulation', () => {
    let raised: unknown

    try {
      projectCompositionPreview(unresolved())
    } catch (error) {
      raised = error
    }

    expect(raised).toBeInstanceOf(PricingV3Error)
    expect((raised as PricingV3Error).code).toBe('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
  })
})

function operatingCrm() {
  return composeResourceQuote(
    operating('catalog.review-v2'),
    operating('resources.review-v2'),
    credits,
    operating('crm-client-tools.demand')
  )
}
