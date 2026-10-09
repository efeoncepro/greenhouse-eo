import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { validateCatalog } from '../catalog/catalog'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema, compositionPolicySchema } from '../resources/composition-contracts'
import {
  runResourceComposition,
  replayResourceComposition,
  explainResourceComposition
} from '../adapters/resource-composition'

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const catalog = validateCatalog(read('data/pricing/v3-catalog/catalog.review-v1.json'))
const policy = compositionPolicySchema.parse(read('data/pricing/v3-composition/resources.review-v1.json'))
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')

const demand = (name = 'seo-writer') =>
  compositionDemandSchema.parse(read(`data/pricing/v3-composition/${name}.demand.json`))

const run = (d = demand(), p = policy, c = catalog) => composeResourceQuote(c, p, credits, d)
const codes = (r: ReturnType<typeof run>) => r.quote.diagnostics.map(d => d.code)
const attribution = (r: ReturnType<typeof run>, tool: string) => r.attributions.find(a => a.toolId === tool)!

describe('demand-based resource composition', () => {
  it('selects common base, SEMrush and requested Claude for writing, preserving Copywriter salary', () => {
    const r = run()

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.selections.filter(s => s.included).map(s => s.toolId)).toEqual([
      'notion',
      'microsoft-365',
      'semrush',
      'claude-team'
    ])
    expect(r.selections.find(s => s.toolId === 'adobe')?.included).toBe(false)
    expect(r.quote.resolution.bindings.find(b => b.purpose === 'profile')?.record.recordId).toBe('profile:ECG-011')
    expect(attribution(r, 'notion').attributedMonthlyCost).toBe('36')
    expect(attribution(r, 'notion').unallocatedMonthlyCost).toBe('108')
  })

  it('integrates base allocation plus complete discrete top-ups into the same kernel quote', () => {
    const r = run(demand('designer'))

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(attribution(r, 'higgsfield').attributedMonthlyCost).toBe('50.78')
    expect(r.creditBudgets[0].result.breakdown?.subscription.attributedCost).toBe('18.53')
    expect(r.creditBudgets[0].result.breakdown?.extra.purchaseCost).toBe('32.25')
    expect(r.resourceIncrementalCash[0].amount).toBe('32.25')
    expect(r.quote.totals?.cost).toBe('996.78')
    expect(r.quote.totals?.net).toBe('1295.81')
  })

  it('keeps managed-service commercial unit and shares a single pool across multiple roles', () => {
    const r = run(demand('seo-service'))

    expect(r.commercialUnit).toBe('managed_service')
    expect(r.quote.calculationStatus).toBe('calculated')
    expect(attribution(r, 'semrush').assignments.map(a => a.attributedCost)).toEqual(['6', '6'])
    expect(attribution(r, 'claude-team').attributedMonthlyCost).toBe('50')
    expect(attribution(r, 'vercel').attributedMonthlyCost).toBe('10')
    expect(attribution(r, 'gcp').attributedMonthlyCost).toBe('26.4')
  })

  it('counts one named user once when assigned to multiple functions', () => {
    const d = demand('seo-service')

    d.work[1].assigneeIds = d.work[0].assigneeIds
    d.allocations.find(a => a.toolId === 'claude-team')!.quantity = '1'
    const r = run(d)

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(attribution(r, 'claude-team').consumerIds).toHaveLength(1)
    expect(attribution(r, 'claude-team').assignments.map(a => a.attributedCost)).toEqual(['12.5', '12.5'])
  })

  it('does not halve software seats when dedication falls to 25%', () => {
    const d = demand()

    d.brief.lines[0].dedication = { unit: 'fte', value: '0.25' }
    expect(attribution(run(d), 'claude-team').attributedMonthlyCost).toBe('25')
  })

  it('blocks absent common-tool attribution and leaves the full quote total unknown', () => {
    const d = demand()

    d.allocations = d.allocations.filter(a => a.toolId !== 'notion')
    const r = run(d)

    expect(codes(r)).toContain('RESOURCE_ALLOCATION_REQUIRED')
    expect(r.quote.totals).toBeNull()
  })

  it('blocks unresolved current Adobe instead of substituting the cheaper historical price', () => {
    const d = demand('designer')

    d.allocations.find(a => a.toolId === 'adobe')!.priceId = 'current'
    expect(codes(run(d))).toContain('RESOURCE_PRICE_PENDING')
  })

  it('requires sufficient seat capacity and actual contracted team minimum', () => {
    const d = demand('seo-service')

    d.allocations.find(a => a.toolId === 'notion')!.seatCapacity = 1
    delete d.allocations.find(a => a.toolId === 'claude-team')!.contractSeatCount
    const r = run(d)

    expect(codes(r)).toContain('INSUFFICIENT_NAMED_SEAT_CAPACITY')
    expect(codes(r)).toContain('TEAM_CONTRACT_CAPACITY_REQUIRED')
  })

  it('rejects invented shares that do not reconcile with the declared driver', () => {
    const d = demand()

    d.allocations[0].serviceShare = '0.5'
    expect(codes(run(d))).toContain('ALLOCATION_DRIVER_MISMATCH')
  })

  it('rejects unused allocations, duplicate provider budgets and unknown tasks', () => {
    const d = demand('designer')

    d.creditBudgets.push(d.creditBudgets[0])
    d.allocations.push({ ...d.allocations[0], toolId: 'semrush' })
    d.work[0].tasks.push('invented-task')
    const r = run(d)

    expect(codes(r)).toContain('UNUSED_RESOURCE_ALLOCATION')
    expect(codes(r)).toContain('DUPLICATE_RESOURCE_ALLOCATION')
    expect(codes(r)).toContain('UNKNOWN_OR_DUPLICATE_TASK')
  })

  it('pools credit demand across roles before purchasing packs once', () => {
    const d = demand('seo-service')
    const designer = demand('designer')

    d.creditBudgets = designer.creditBudgets

    for (const w of d.work) {
      w.aiToolIds.push('higgsfield')
      w.creditDemand = [{ periodId: 1, toolId: 'higgsfield', credits: 500 }]
    }

    const r = run(d)

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.creditBudgets).toHaveLength(1)
    expect(attribution(r, 'higgsfield').assignments.map(a => a.attributedCost)).toEqual(['25.39', '25.39'])
  })

  it('requires a configured currency and explicit sourced FX for Magnific', () => {
    const d = demand('designer')

    d.work[0].aiToolIds = ['magnific', 'chatgpt']
    d.work[0].creditDemand = [{ periodId: 1, toolId: 'magnific', credits: 25000 }]
    d.creditBudgets[0] = {
      ...d.creditBudgets[0],
      toolId: 'magnific',
      subscriptionCreditsAllocated: 15000,
      subscriptionCreditsAvailable: 15000
    }
    expect(codes(run(d))).toContain('RESOURCE_FX_SELECTION_REQUIRED')
    const c = structuredClone(catalog)

    c.currencies.push({ code: 'EUR', precision: 2 })
    c.records.push({
      recordId: 'fixture-eur-usd',
      revision: 1,
      kind: 'fx',
      note: 'Synthetic test fixture only, not an exchange-rate quote.',
      source: {
        reference: 'synthetic-test-fx',
        effectiveFrom: '2026-10-09',
        effectiveUntil: '2026-10-09',
        status: 'estimated'
      },
      value: { from: 'EUR', to: 'USD', rate: '1.1' }
    })
    d.fxRecordIds = ['fixture-eur-usd']
    const r = run(d, policy, c)

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(attribution(r, 'magnific').attributedMonthlyCost).toBe('22.93')
  })

  it('keeps annual seat cost monthly while committing attributed annual cash only once', () => {
    const d = demand()

    d.brief.periods = 2
    d.allocations.find(a => a.toolId === 'claude-team')!.priceId = 'standard-annual'
    d.allocations.push(...d.allocations.map(a => ({ ...a, periodId: 2 })))
    const r = run(d)

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(attribution(r, 'claude-team').attributedMonthlyCost).toBe('20')
    expect(r.quote.cashLedger.filter(x => x.key.startsWith('composed:claude-team'))).toEqual([
      expect.objectContaining({ periodId: 1, amount: '240.00' })
    ])
  })

  it('requires each active month to declare its own credit budget and use window', () => {
    const d = demand('designer')

    d.brief.periods = 2
    d.allocations.push(...d.allocations.map(a => ({ ...a, periodId: 2 })))
    expect(codes(run(d))).toContain('CREDIT_BUDGET_REQUIRED')
    d.work[0].creditDemand.push({ ...d.work[0].creditDemand[0], periodId: 2 })
    d.creditBudgets.push({ ...d.creditBudgets[0], periodId: 2 })
    expect(codes(run(d))).toContain('CREDIT_PERIOD_WINDOW_MISMATCH')
    d.creditBudgets[1].purchaseDate = '2026-11-01'
    d.creditBudgets[1].useBy = '2026-11-30'
    expect(run(d).quote.calculationStatus).toBe('calculated')
  })

  it('keeps roundoff inside a single declared resource share across three consumers', () => {
    const d = demand('seo-service')
    const third = structuredClone(d.brief.lines[0])

    third.lineId = 'third'
    d.brief.lines.push(third)
    d.work.push({ ...structuredClone(d.work[0]), lineId: 'third', assigneeIds: ['third-slot'] })

    for (const a of d.allocations) {
      if (a.toolId === 'claude-team') a.quantity = '3'
      if (a.seatCapacity) a.seatCapacity = 3
      if (a.contractSeatCount) a.contractSeatCount = 3
    }

    const r = run(d)

    expect(r.quote.calculationStatus).toBe('calculated')
    for (const a of r.attributions)
      expect(a.assignments.reduce((s, x) => s.plus(x.share), new Decimal(0)).eq(a.serviceShare)).toBe(true)
  })

  it('freezes all inputs, explains sources and rejects tampering', () => {
    const artifact = runResourceComposition(catalog, policy, credits, demand())

    expect(replayResourceComposition(artifact).replayDigest).toBe(artifact.replayDigest)
    expect(explainResourceComposition(artifact).costBreakdown[0].resources).not.toHaveLength(0)
    const changed = structuredClone(artifact)

    changed.semantic.policy.version = 'tampered'
    expect(() => replayResourceComposition(changed)).toThrow('REPLAY_MISMATCH')
  })

  it('does not promote simulation to commercially approved pricing', () => {
    const d = demand()

    d.brief.mode = 'commercial_draft'
    expect(codes(run(d))).toContain('COMPOSITION_REVIEW_ONLY')
    expect(run().reviewStatus).toBe('requires_review')
  })

  it('requires profile rules instead of silently stripping unsupported kit requirements', () => {
    const p = structuredClone(policy)

    p.profileTasks = p.profileTasks.filter(x => x.profileId !== 'ECG-011')
    expect(codes(run(demand(), p))).toContain('PROFILE_RESOURCE_RULES_REQUIRED')
  })

  it('requires a reason for explicit AI selection', () => {
    const d = demand()

    delete d.work[0].aiSelectionReason
    expect(codes(run(d))).toContain('AI_SELECTION_REASON_REQUIRED')
  })
})
