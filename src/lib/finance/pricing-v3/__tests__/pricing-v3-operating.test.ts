import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { runResourceComposition, replayResourceComposition } from '../adapters/resource-composition'
import { catalogDigest } from '../adapters/catalog-local'
import { previewResourceChange, applyResourceChange } from '../adapters/resource-maintenance'

import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema, compositionPolicySchema } from '../resources/composition-contracts'
import {
  allocateResourcePortfolio,
  inspectOperatingResources,
  prepareOperatingPlan,
  scaffoldResourceDemand
} from '../resources/operating'
import {
  assessCompositionReadiness,
  projectCompositionPreview,
  compositionPreviewMarkdown
} from '../resources/readiness'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const operating = (name: string) => read(`data/pricing/v3-operating/${name}.json`)
const catalog = operating('catalog.review-v2')
const policy = compositionPolicySchema.parse(operating('resources.review-v2'))
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
const plan = () => operating('designer.plan')
const prepared = () => prepareOperatingPlan(catalog, policy, credits, plan())
const demand = () => compositionDemandSchema.parse(prepared().demand)
const run = (d = demand(), p = policy) => composeResourceQuote(catalog, p, credits, d)
const codes = (r: ReturnType<typeof run>) => r.quote.diagnostics.map(d => d.code)
const portfolio = () => operating('portfolio.example')
const crm = () => compositionDemandSchema.parse(operating('crm-client-tools.demand'))

describe('operating discovery and planning', () => {
  it('covers all 32 original profiles and all 26 historical resource IDs without inventing current prices', () => {
    const r = inspectOperatingResources(catalog, policy, '2026-10-09')
    const historical = operating('historical-resource-index')

    expect(r.profiles).toHaveLength(32)
    expect(r.profiles.every(p => p.resourceRuleStatus === 'review_rule')).toBe(true)
    expect(historical.records).toHaveLength(26)

    const mapped = [
      ...r.tools.flatMap(t => t.prices.flatMap(p => (p.catalogResourceId ? [p.catalogResourceId] : []))),
      ...r.platformFees.flatMap(p => (p.kind === 'resource' ? [p.value.resourceId] : []))
    ]

    expect(historical.records.every((row: { resourceId: string }) => mapped.includes(row.resourceId))).toBe(true)
    expect(r.platformFees.some(p => p.kind === 'resource' && p.value.kind === 'platform_fee')).toBe(true)
    expect(
      r.tools.find(t => t.toolId === 'microsoft-365')?.prices.find(p => p.priceId === 'current')?.availability
    ).toBe('needs_input')
    expect(r.tools.find(t => t.toolId === 'adobe')?.prices.find(p => p.priceId === 'current')?.resolved?.amount).toBe(
      '180'
    )
  })
  it('matches accented profile names and marks expired public/invoiced references unavailable', () => {
    expect(inspectOperatingResources(catalog, policy, '2026-10-09', 'disenador').profiles.length).toBeGreaterThan(0)
    const r = inspectOperatingResources(catalog, policy, '2026-11-09')

    expect(r.tools.find(t => t.toolId === 'notion')?.prices.find(p => p.priceId === 'current')?.availability).toBe(
      'needs_input'
    )
    expect(
      r.tools.find(t => t.toolId === 'chatgpt')?.prices.find(p => p.priceId === 'public-business-standard-monthly')
        ?.availability
    ).toBe('needs_input')
  })
  it('scaffolds required questions and planning slots without choosing tool prices or allocation percentages', () => {
    const r = scaffoldResourceDemand(catalog, policy, operating('writer.brief'))

    expect(r.status).toBe('needs_input')
    expect(r.demand.allocations).toEqual([])
    expect(r.demand.work[0].assigneeIds[0]).toMatch(/^planned-/)
    expect(r.questions.map(q => q.path)).toContain('notion')
    expect(r.demand.work[0].aiToolIds).toEqual([])
  })
  it('does not substitute a specialist salary when SEO tasks are added to Copywriter', () => {
    const d = crm()

    delete d.clientProvidedTools
    d.brief.lines[0].profile = 'ECG-011'
    d.work[0].tasks = ['seo-writing']
    const r = run(d)

    expect(r.quote.resolution.bindings.find(b => b.purpose === 'profile')?.record.recordId).toBe('profile:ECG-011')
    expect(r.selections.find(s => s.toolId === 'semrush')?.included).toBe(true)
    expect(r.selections.find(s => s.toolId === 'adobe')?.included).toBe(false)
    expect(codes(r)).toContain('RESOURCE_ALLOCATION_REQUIRED')
  })
  it('preserves consultant variants as separate profiles', () => {
    const r = inspectOperatingResources(catalog, policy, '2026-10-09', 'consultor')

    expect(r.profiles.length).toBeGreaterThan(1)
    expect(new Set(r.profiles.map(p => p.profileId)).size).toBe(r.profiles.length)
  })
})

describe('declared capacity portfolio', () => {
  it('reconciles client, internal and unallocated costs in the original currency', () => {
    const r = allocateResourcePortfolio(portfolio(), policy, catalog, '2026-10-09')

    expect(r.status).toBe('prepared')
    expect(r.allocations[0].allocation.serviceShare).toBe('0.25')
    expect(r.reconciliation[0].monthlyCost).toEqual({
      currency: 'USD',
      full: '180',
      accounts: [{ accountId: 'design-simulation', cost: '45' }],
      internal: '90',
      unallocated: '45',
      roundingResidual: '0'
    })
  })
  it.each(['oversubscribed', 'undersubscribed'])('blocks %s units instead of assigning a default percentage', mode => {
    const p = portfolio()

    p.resources[0].accounts[0].units = mode === 'oversubscribed' ? '50' : '30'
    const r = allocateResourcePortfolio(p, policy)

    expect(r.status).toBe('needs_input')
    expect(r.allocations).toEqual([])
    expect(r.diagnostics.map(d => d.code)).toContain('PORTFOLIO_UNITS_NOT_RECONCILED')
  })
  it('blocks duplicate resource and account denominators', () => {
    const p = portfolio()

    p.resources.push(structuredClone(p.resources[0]))
    p.resources[0].accounts.push(structuredClone(p.resources[0].accounts[0]))
    const codes = allocateResourcePortfolio(p, policy).diagnostics.map(d => d.code)

    expect(codes).toContain('DUPLICATE_PORTFOLIO_RESOURCE')
    expect(codes).toContain('DUPLICATE_PORTFOLIO_ACCOUNT')
  })
  it('does not turn a named seat into an arbitrary pooled subscription', () => {
    const p = portfolio()

    p.resources[0].toolId = 'notion'
    p.resources[0].priceId = 'current'
    expect(allocateResourcePortfolio(p, policy).diagnostics.map(d => d.code)).toContain(
      'NAMED_SEAT_REQUIRES_USER_ALLOCATION'
    )
  })
  it('keeps tiny share truncation residual explicit and rejects unrepresentable shares', () => {
    const p = portfolio()

    p.resources[0].totalUnits = '3'
    p.resources[0].internalUnits = '1'
    p.resources[0].unallocatedUnits = '1'
    p.resources[0].accounts[0].units = '1'
    const r = allocateResourcePortfolio(p, policy, catalog, '2026-10-09')

    expect(new Decimal(r.reconciliation[0].roundingResidualShare).gt(0)).toBe(true)
    const m = r.reconciliation[0].monthlyCost!

    expect(
      new Decimal(m.accounts[0].cost).plus(m.internal).plus(m.unallocated).plus(m.roundingResidual).eq(m.full)
    ).toBe(true)
    p.resources[0].totalUnits = '1'
    p.resources[0].accounts[0].units = '0.000000000000000001'
    p.resources[0].internalUnits = '0'
    p.resources[0].unallocatedUnits = '0.999999999999999999'
    expect(allocateResourcePortfolio(p, policy).status).toBe('prepared')
  })
  it('refuses two competing allocation inputs for the same account/resource/month', () => {
    const p = plan()

    p.demand.allocations.push({ ...p.demand.allocations[0], toolId: 'adobe', priceId: 'current', seatCapacity: 3 })
    const r = prepareOperatingPlan(catalog, policy, credits, p)

    expect(r.demand).toBeNull()
    expect(r.questions.map(q => q.code)).toContain('ALLOCATION_INPUT_CONFLICT')
  })
})

describe('package and client coverage constraints', () => {
  it('attributes combined Adobe only once and keeps renewal conditional', () => {
    const r = run()

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.attributions.find(a => a.toolId === 'adobe')?.attributedMonthlyCost).toBe('45')
    const d = demand()

    d.allocations.find(a => a.toolId === 'adobe')!.priceId = 'renewal-scenario'
    expect(run(d).attributions.find(a => a.toolId === 'adobe')?.attributedMonthlyCost).toBe('76.5')
    expect(operating('evidence-2026-10-09').operatorConfirmations.adobe.renewalDate).toBeNull()
  })
  it('blocks separate Adobe Express when the purchased Adobe package already bundles it', () => {
    const d = demand()

    d.serviceToolIds.push('adobe-express')
    d.allocations.push({ ...d.allocations[0], toolId: 'adobe-express', priceId: 'historical' })
    expect(codes(run(d))).toContain('BUNDLED_TOOL_DOUBLE_COUNT')
  })
  it('counts a bundle twice only when the same line holds the plan and the product it includes', () => {
    // Versions the pointer names: Creative Cloud Pro (bundles Adobe Express) for designers, Adobe Express on its own
    // for content profiles. A mixed team is two people on two products, not one product charged twice.
    const current = read('data/pricing/v3-operating/current.json')
    const currentCatalog = read(current.catalog.path)
    const currentPolicy = compositionPolicySchema.parse(read(current.policy.path))
    const base = () => compositionDemandSchema.parse(operating('designer-on-demand.demand'))

    const issues = (d: ReturnType<typeof base>) =>
      composeResourceQuote(currentCatalog, currentPolicy, credits, d).quote.diagnostics.map(x => x.code)

    expect(issues(base())).not.toContain('BUNDLED_TOOL_DOUBLE_COUNT')

    const mixed = base()

    mixed.brief.lines.push({ ...mixed.brief.lines[0], lineId: 'content', profile: 'ECG-007' })
    mixed.work.push({ ...mixed.work[0], lineId: 'content', assigneeIds: ['content-slot'], aiToolIds: [], creditDemand: [] })

    // The content line still lacks its own allocations here; what matters is that its Adobe Express does not turn
    // the designer's plan into a double count.
    expect(issues(mixed)).not.toContain('BUNDLED_TOOL_DOUBLE_COUNT')

    const same = base()

    same.work[0].tasks = [...same.work[0].tasks, 'express-design']
    expect(issues(same)).toContain('BUNDLED_TOOL_DOUBLE_COUNT')
  })
  it('blocks fictional package capacity and fractional named-license quantities', () => {
    const d = demand()

    d.allocations.find(a => a.toolId === 'adobe')!.seatCapacity = 4
    expect(codes(run(d))).toContain('PACKAGE_SEAT_CAPACITY_EXCEEDED')
    const n = demand()

    n.allocations.find(a => a.toolId === 'notion')!.quantity = '0.5'
    expect(codes(run(n))).toContain('WHOLE_NAMED_LICENSE_REQUIRED')
  })
  it('covers CRM with documented client access without suppressing the Efeonce base', () => {
    const r = run(crm())

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.selections.find(s => s.toolId === 'hubspot')?.reasons.join(' ')).toContain('client-provided:')
    expect(r.attributions.map(a => a.toolId)).toEqual(['notion', 'microsoft-365'])
  })
  it('rejects expired, unconfirmed, unused or base client coverage', () => {
    const d = crm()

    d.clientProvidedTools![0].evidence.effectiveUntil = '2026-10-20'
    expect(codes(run(d))).toContain('CLIENT_ACCESS_EVIDENCE_REQUIRED')
    d.clientProvidedTools![0].evidence.status = 'estimated'
    expect(codes(run(d))).toContain('CLIENT_ACCESS_EVIDENCE_REQUIRED')
    const unused = crm()

    unused.clientProvidedTools![0].lineIds = ['unrelated']
    expect(codes(run(unused))).toContain('UNUSED_CLIENT_TOOL_COVERAGE')
    const base = crm()

    base.clientProvidedTools![0].toolId = 'notion'
    expect(codes(run(base))).toContain('CLIENT_COVERAGE_NOT_ALLOWED')
  })
})

describe('calculation, review and safe local projections', () => {
  it('integrates both credit currencies with explicit FX, without changing salary reference', () => {
    const r = run()

    expect(r.quote.calculationStatus).toBe('calculated')
    expect(r.attributions.find(a => a.toolId === 'higgsfield')?.attributedMonthlyCost).toBe('50.78')
    expect(r.attributions.find(a => a.toolId === 'magnific')?.attributedMonthlyCost).toBe('11.38')
    expect(r.quote.resolution.bindings.find(b => b.purpose === 'profile')?.record.recordId).toBe('profile:ECG-002')
    const d = demand()

    d.fxRecordIds = []
    expect(codes(run(d))).toContain('RESOURCE_FX_SELECTION_REQUIRED')
  })
  it('requires economic evidence and approval despite a mathematically calculated result', () => {
    const r = assessCompositionReadiness(run())

    expect(r.commercialStatus).toBe('requires_review')
    expect(r.binding).toBe(false)
    expect(r.margin?.approved).toBe(false)
    expect(r.gaps.map(g => g.code)).toContain('HUMAN_COST_EVIDENCE_REQUIRED')
    expect(r.gaps.map(g => g.code)).toContain('PROVISION_COST_EVIDENCE_REQUIRED')
    expect(r.gaps.map(g => g.code)).toContain('ALLOCATION_EVIDENCE_REQUIRED')
  })
  it('redacts service internals and reconciles all projected net amounts', () => {
    const d = demand()

    d.commercialUnit = 'managed_service'
    const r = run(d)
    const p = projectCompositionPreview(r)

    expect(p.periods[0].items[0].label).toContain('Servicio gestionado')
    expect(p.periods[0].items.reduce((s, i) => s.plus(i.net), new Decimal(0)).eq(p.net)).toBe(true)
    const text = JSON.stringify(p) + compositionPreviewMarkdown(r)

    for (const forbidden of [
      'adobe',
      'magnific',
      'higgsfield',
      'costBreakdown',
      'consumerIds',
      'talentCountry',
      'ECG-002',
      'marginRate',
      'salary',
      'design-slot'
    ])
      expect(text).not.toContain(forbidden)
    expect(assessCompositionReadiness(r).gaps.map(g => g.code)).toContain('SERVICE_SCOPE_AND_DELIVERY_REQUIRED')
  })
  it('refuses a preview when a missing allocation prevents a complete calculation', () => {
    const d = demand()

    d.allocations = []
    expect(() => projectCompositionPreview(run(d))).toThrow('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
  })
  it('replays new snapshots and preserves every original composition snapshot', () => {
    const a = runResourceComposition(catalog, policy, credits, demand(), '2026-10-09T00:00:00Z')

    expect(replayResourceComposition(a).replayDigest).toBe(a.replayDigest)

    for (const name of ['seo-writer', 'designer', 'seo-service']) {
      const old = read(`data/pricing/v3-composition/${name}.artifact.json`)

      expect(replayResourceComposition(old).replayDigest).toBe(old.replayDigest)
    }

    const changed = structuredClone(a)

    changed.semantic.policy.tools[0].label = 'Changed price context'
    expect(() => replayResourceComposition(changed)).toThrow('REPLAY_MISMATCH')
  })
})

describe('versioned resource maintenance', () => {
  const change = () => {
    const next = structuredClone(policy)

    next.version = 'adobe-renewal-review-example-v3'
    next.tools.find(t => t.toolId === 'adobe')!.prices.find(p => p.priceId === 'current')!.price!.amount = '306'

    return {
      schemaVersion: 'pricing-v3-resource-change/1',
      kind: 'policy',
      baseDigest: catalogDigest(policy),
      reason: 'Synthetic increase example; no activation of unknown renewal date.',
      replacement: next
    }
  }

  it('previews a package price change, shows impact and applies only the reviewed digest', () => {
    const c = change()
    const before = catalogDigest(policy)
    const p = previewResourceChange(catalog, policy, credits, c, [demand()])

    expect(p.impacts[0].before.attributions.find(a => a.toolId === 'adobe')?.attributedMonthlyCost).toBe('45')
    expect(p.impacts[0].after.attributions.find(a => a.toolId === 'adobe')?.attributedMonthlyCost).toBe('76.5')
    expect(applyResourceChange(catalog, policy, credits, c, p.previewDigest, [demand()]).successor.version).toBe(
      'adobe-renewal-review-example-v3'
    )
    expect(catalogDigest(policy)).toBe(before)
    expect(() => applyResourceChange(catalog, policy, credits, c, 'incorrect', [demand()])).toThrow(
      'RESOURCE_PREVIEW_CONFLICT'
    )
  })
  it('rejects stale bases, unchanged versions and invalid resource references', () => {
    const stale = change()

    stale.baseDigest = '0'.repeat(64)
    expect(() => previewResourceChange(catalog, policy, credits, stale)).toThrow('RESOURCE_BASE_CONFLICT')
    const same = change()

    same.replacement.version = policy.version
    expect(() => previewResourceChange(catalog, policy, credits, same)).toThrow('RESOURCE_NEW_VERSION_REQUIRED')
    const invalid = change()

    invalid.replacement.commonToolIds.push('unknown-provider')
    expect(() => previewResourceChange(catalog, policy, credits, invalid)).toThrow('INVALID_RESOURCE_POLICY_REFERENCE')
  })
  it('rejects unknown monetary references and changes to the reviewed catalog context', () => {
    const invalid = change()

    invalid.replacement.tools.find(t => t.toolId === 'adobe')!.prices[0].catalogResourceId = 'unknown-resource'
    expect(() => previewResourceChange(catalog, policy, credits, invalid)).toThrow('INVALID_RESOURCE_POLICY_REFERENCE')
    const c = change()
    const preview = previewResourceChange(catalog, policy, credits, c)
    const nextCredits = structuredClone(credits)

    nextCredits.version = 'a-different-credit-context'
    expect(() => applyResourceChange(catalog, policy, nextCredits, c, preview.previewDigest)).toThrow(
      'RESOURCE_PREVIEW_CONFLICT'
    )
  })
  it('does not inherit a confirmed invoice when its cost changes', () => {
    const c = change()

    c.replacement.tools.find(t => t.toolId === 'notion')!.prices.find(p => p.priceId === 'current')!.price!.amount =
      '25'
    expect(() => previewResourceChange(catalog, policy, credits, c)).toThrow('RESOURCE_SOURCE_RECONFIRMATION_REQUIRED')
  })
  it('versions credit pack updates independently, preserving provider provenance', () => {
    const replacement = structuredClone(credits)

    replacement.version = 'synthetic-credit-update-v2'
    replacement.providers[0].packs[0].amount = '7'
    replacement.providers[0].source.sha256 = '1'.repeat(64)
    replacement.providers[0].source.reference = 'synthetic-new-screenshot-for-test'

    const c = {
      schemaVersion: 'pricing-v3-resource-change/1',
      kind: 'credits',
      baseDigest: catalogDigest(credits),
      reason: 'Synthetic credit increase fixture',
      replacement
    }

    const p = previewResourceChange(catalog, policy, credits, c, [demand()])

    expect(p.successor.version).toBe(replacement.version)
    expect(p.impacts[0].after.quote.calculationStatus).toBe('calculated')
    expect(credits.providers[0].packs[0].amount).not.toBe('7')
  })
})
