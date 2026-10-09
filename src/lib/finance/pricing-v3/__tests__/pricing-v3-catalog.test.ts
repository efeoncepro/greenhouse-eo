import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { validateCatalog, changeCatalog } from '../catalog/catalog'
import { briefSchema } from '../catalog/contracts'
import type { Catalog, CatalogRecord } from '../catalog/contracts'
import { resolveBrief } from '../catalog/resolve'
import { calculateCatalogQuote } from '../catalog/quote'
import { projectCatalogQuote } from '../catalog/client'
import {
  catalogDigest,
  runCatalogQuote,
  replayCatalogQuote,
  previewCatalogChange,
  applyCatalogChange,
  explainCatalogQuote
} from '../adapters/catalog-local'

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const catalog = (): Catalog => read('data/pricing/v3-catalog/catalog.review-v1.json')
const brief = () => briefSchema.parse(read('data/pricing/v3-catalog/examples/designer-co-cl.json'))

const resource = (c: Catalog, id: string) =>
  c.records.find(r => r.kind === 'resource' && r.recordId === id)! as Extract<CatalogRecord, { kind: 'resource' }>

const future = () => ({ ...brief(), quoteDate: '2026-10-10' })

const change = (c: Catalog) => {
  const tool = structuredClone(resource(c, 'ETG-001'))

  const salary = structuredClone(c.records.find(r => r.recordId === 'cost:ECG-002:unknown')!) as Extract<
    CatalogRecord,
    { kind: 'cost' }
  >

  for (const r of [tool, salary]) {
    r.revision = 2
    r.source.effectiveFrom = '2026-10-10'
    r.source.reference = 'test-only:increase'
  }

  tool.value.amount = '88'
  salary.value.components[0].amount = '1045'

  return {
    schemaVersion: 'pricing-v3-catalog-change/1',
    changeId: 'test-change',
    baseDigest: catalogDigest(c),
    nextVersion: 'test-v2',
    actor: 'test-operator',
    reason: 'Illustrative salary and license increases',
    changes: [tool, salary].map(r => ({
      operation: 'replace',
      recordId: r.recordId,
      effectiveFrom: '2026-10-10',
      record: r
    }))
  }
}

const cli = (args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

describe('Pricing V3 selection and frozen quote', () => {
  it('uses catalog salary, full provider packages, full fee and setup once; independently derived golden', () => {
    const q = calculateCatalogQuote(catalog(), brief())

    // human (950+360)*.5=655; providers 80+144+80+20=324;
    // platform49 + trial assurance25 + operations25 => recurring cost1078;
    // 3 months + setup100 =>3334; markup30% =>4334.20.
    expect(q.totals).toMatchObject({ cost: '3334.00', net: '4334.20', cashCommitment: '3334.00' })
    expect(q.reviewStatus).toBe('requires_review')
    expect(q.periods.map(p => p.result.lines.filter(l => l.kind === 'setup').length)).toEqual([1, 0, 0])
    expect(q.resolution.bindings.find(b => b.purpose === 'design')?.record.recordId).toBe('ETG-001')
  })

  it('shares account packages once across two profiles but keeps person fees for each', () => {
    const b = brief()

    b.lines.push({ ...b.lines[0], lineId: 'design-2' })
    expect(calculateCatalogQuote(catalog(), b).totals).toMatchObject({ cost: '5446.00', net: '7079.80' })
  })

  it('scales headcount salaries and full person fees, without duplicating account packages', () => {
    const b = brief()

    b.lines[0].headcount = 3
    expect(calculateCatalogQuote(catalog(), b).totals?.cost).toBe('7558.00')
  })

  it('supports different monthly dedication and active periods', () => {
    const b = brief()

    b.lines[0].dedicationByPeriod = [
      { periodId: 1, dedication: { unit: 'fte', value: '0.25' } },
      { periodId: 3, dedication: { unit: 'fte', value: '1' } }
    ]
    expect(calculateCatalogQuote(catalog(), b).totals?.net).toBe('4759.95')
    b.lines[0].activePeriods = [2]
    b.lines[0].dedicationByPeriod = []
    const q = calculateCatalogQuote(catalog(), b)

    expect(q.periods.map(p => p.periodId)).toEqual([2])
    expect(q.totals?.net).toBe('1531.40')
  })

  it('annual cost is accrued monthly and annual cash is charged once, then at renewal', () => {
    const c = catalog()
    const adobe = resource(c, 'ETG-001')

    adobe.value.unit = 'year'
    adobe.value.amount = '120'
    expect(calculateCatalogQuote(c, brief()).totals).toMatchObject({ cost: '3124.00', cashCommitment: '3214.00' })
    const b = brief()

    b.periods = 13
    expect(calculateCatalogQuote(c, b).totals).toMatchObject({ cost: '13204.00', cashCommitment: '13314.00' })
    b.lines[0].activePeriods = [1, 3]
    expect(
      calculateCatalogQuote(c, b).diagnostics.some(d => d.code === 'ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY')
    ).toBe(true)
    expect(calculateCatalogQuote(c, b).totals).toBeNull()
  })

  it('shared annual package cash is charged once across consumer lines', () => {
    const c = catalog()

    resource(c, 'ETG-001').value.unit = 'year'
    resource(c, 'ETG-001').value.amount = '120'
    const b = brief()

    b.lines.push({ ...b.lines[0], lineId: 'second' })
    expect(calculateCatalogQuote(c, b).totals).toMatchObject({ cost: '5236.00', cashCommitment: '5326.00' })
  })

  it('requires justified client coverage instead of assuming a license is free', () => {
    const b = brief()

    b.lines[0].choices.push({
      requirementId: 'design',
      providedByClientReason: 'Client grants an appropriate licensed seat; simulation assumption.'
    })
    expect(calculateCatalogQuote(catalog(), b).totals?.cost).toBe('3094.00')
    b.lines[0].choices.push({ requirementId: 'unknown', resourceId: 'ETG-001' })
    expect(resolveBrief(catalog(), b).diagnostics.some(d => d.code === 'UNKNOWN_RESOURCE_REQUIREMENT')).toBe(true)
  })

  it('unknown country never becomes localized cost without explicit simulation assumption', () => {
    const b = brief()

    b.lines[0].allowUnlocalizedCost = false
    expect(calculateCatalogQuote(catalog(), b).totals).toBeNull()
    expect(resolveBrief(catalog(), b).diagnostics[0].code).toBe('UNLOCALIZED_COST_REQUIRES_EXPLICIT_SIMULATION')
  })

  it('localized cost takes precedence and does not apply a talent factor twice', () => {
    const c = catalog()

    const r = c.records.find(r => r.kind === 'cost' && r.value.profileId === 'ECG-002')! as Extract<
      CatalogRecord,
      { kind: 'cost' }
    >

    r.value.localization = { kind: 'specific', country: 'CO' }
    c.records.push({
      recordId: 'factor-co-us',
      revision: 1,
      kind: 'talent_factor',
      source: r.source,
      note: 'test',
      value: { country: 'CO', referenceCountry: 'US', factor: '0.8' }
    })
    expect(calculateCatalogQuote(c, brief()).totals?.net).toBe('4334.20')
    r.value.localization = { kind: 'reference_adjusted', referenceCountry: 'US' }
    expect(calculateCatalogQuote(c, brief()).totals?.net).toBe('3823.30')
  })

  it('blocks ambiguous profiles and alternative tools; no cheapest fallback', () => {
    const b = brief()

    b.lines[0].profile = 'consultor HubSpot'
    expect(resolveBrief(catalog(), b).diagnostics.some(d => d.code === 'AMBIGUOUS_SELECTION')).toBe(true)
    b.lines[0].profile = 'ECG-002'
    b.lines[0].choices = []
    expect(resolveBrief(catalog(), b).diagnostics.some(d => d.code === 'RESOURCE_CHOICE_REQUIRED')).toBe(true)
  })

  it('missing fee and SEO suite remain missing; simulation cannot enable commercial mode', () => {
    const b = brief()

    b.lines[0].profile = 'ECG-032'
    expect(calculateCatalogQuote(catalog(), b).totals).toBeNull()
    const pibank = read('data/pricing/v3-catalog/examples/pibank-demand-pe-cl.json')

    pibank.lines.find((l: { lineId: string }) => l.lineId === 'seo').choices = [
      { requirementId: 'ai', resourceId: 'ETG-007' },
      { requirementId: 'seo-suite', resourceId: 'pending-seo-suite' }
    ]
    const q = calculateCatalogQuote(catalog(), pibank)

    expect(q.totals).toBeNull()
    expect(q.diagnostics.some(d => d.code === 'MISSING_RESOURCE_AMOUNT' && d.path === 'lines.seo.seo-suite')).toBe(true)
    b.mode = 'commercial_draft'
    expect(resolveBrief(catalog(), b).diagnostics.some(d => d.code === 'SIMULATION_ONLY_CATALOG')).toBe(true)
  })

  it('uses Pibank demand with catalog costs; salary increase changes a full reserved writer by 1200 annually', () => {
    const c = catalog()
    const b = read('data/pricing/v3-catalog/examples/pibank-demand-pe-cl.json')
    const before = calculateCatalogQuote(c, b)

    const writer = c.records.find(r => r.recordId === 'cost:ECG-011:unknown')! as Extract<
      CatalogRecord,
      { kind: 'cost' }
    >

    const salary = Number(writer.value.components[0].amount)

    writer.value.components[0].amount = String(salary + 100)
    const after = calculateCatalogQuote(c, b)

    expect(before.calculationStatus).toBe('calculated')
    expect(Number(after.totals!.cost) - Number(before.totals!.cost)).toBeCloseTo(1200, 8)
    expect(Number(after.totals!.net) - Number(before.totals!.net)).toBeCloseTo(1500, 8)
    expect(
      before.resolution.inputs[0].input.snapshot.resources.some(r => r.resourceId.includes('assignment-other'))
    ).toBe(false)
  })

  it('client projection redacts costs, margins, factors and sources; historical export blocked', () => {
    const c = catalog()
    const b = brief()
    const q = calculateCatalogQuote(c, b)

    expect(() => projectCatalogQuote(q, 'test')).toThrow('EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY')
    // Synthetic fully confirmed fixture: no claim of commercial approval.
    c.mode = 'synthetic'
    for (const r of c.records) if (r.source.status !== 'pending') r.source.status = 'confirmed'
    const cost = c.records.find(r => r.recordId === 'cost:ECG-002:unknown')! as Extract<CatalogRecord, { kind: 'cost' }>

    cost.value.localization = { kind: 'specific', country: 'CO' }
    const view = projectCatalogQuote(calculateCatalogQuote(c, b), 'test')
    const serialized = JSON.stringify(view)

    for (const word of ['cost', 'margin', 'factor', 'source', 'bindings', 'catalog'])
      expect(serialized).not.toContain(word)
    expect(view.totals.net).toBe('4334.20')
  })

  it('does not silently choose duplicate factors or waive operations as client-provided', () => {
    const c = catalog()
    const market = structuredClone(c.records.find(r => r.recordId === 'market:CL')!)

    market.recordId = 'another-market'
    c.records.push(market)
    expect(resolveBrief(c, brief()).diagnostics.some(d => d.code === 'AMBIGUOUS_SELECTION')).toBe(true)
    const b = brief()

    b.lines[0].choices.push({ requirementId: 'operations', providedByClientReason: 'Skip it' })
    expect(resolveBrief(catalog(), b).diagnostics.some(d => d.code === 'UNSUPPORTED_CLIENT_COVERAGE')).toBe(true)
  })

  it('rejects invalid schedules, repeated lines, and inline prices', () => {
    const b = brief()

    b.lines[0].activePeriods = [1, 1]
    expect(resolveBrief(catalog(), b).diagnostics.some(d => d.code === 'INVALID_SCHEDULE')).toBe(true)
    expect(resolveBrief(catalog(), { ...brief(), salary: '500' }).diagnostics[0].code).toBe('INVALID_BRIEF')
  })

  it('freezes detailed sources and rejects tampering', () => {
    const frozen = runCatalogQuote(catalog(), brief())

    expect(replayCatalogQuote(frozen).replayDigest).toBe(frozen.replayDigest)
    const detail = explainCatalogQuote(frozen).costBreakdown[0]

    expect(detail.human.find(c => c.coverage === 'human_salary')?.allocatedCostBeforeLineRounding).toBe('475')
    expect(detail.human.find(c => c.coverage === 'human_bonus_rpa')?.allocatedCostBeforeLineRounding).toBe('37.5')
    expect(
      explainCatalogQuote(frozen).resolution.bindings.some(b => b.record.source.reference.includes('pricing-history'))
    ).toBe(true)
    frozen.semantic.catalog.records[0].note = 'tampered'
    expect(() => replayCatalogQuote(frozen)).toThrow('REPLAY_MISMATCH')
  })
})

describe('Catalog maintenance contract', () => {
  it('future salary/license increase affects new quotes only after effective date; parent/replay intact', () => {
    const c = catalog()
    const original = catalogDigest(c)
    const frozen = runCatalogQuote(c, brief())
    const patch = change(c)
    const preview = previewCatalogChange(c, patch, [brief(), future()])

    expect(preview.impacts[0].after.totals?.net).toBe('4334.20')
    expect(preview.impacts[1].after.totals?.net).toBe('4550.65')
    const next = applyCatalogChange(c, patch, preview.previewDigest, [brief(), future()])

    expect(catalogDigest(c)).toBe(original)
    expect(next.audit[0].changes).toHaveLength(2)
    expect(replayCatalogQuote(frozen).semantic.result.totals?.net).toBe('4334.20')
  })

  it('supports a same-day correction in a new version while retaining parent and audited before-value', () => {
    const c = catalog()
    const frozen = runCatalogQuote(c, brief())
    const patch = change(c)

    for (const edit of patch.changes) {
      edit.effectiveFrom = '2026-10-09'
      edit.record.source.effectiveFrom = '2026-10-09'
    }

    const preview = previewCatalogChange(c, patch)
    const next = applyCatalogChange(c, patch, preview.previewDigest)

    expect(calculateCatalogQuote(next, brief()).totals?.net).toBe('4550.65')
    expect(next.audit[0].changes[0]).toHaveProperty('before.value.amount', '80')
    expect(replayCatalogQuote(frozen).semantic.result.totals?.net).toBe('4334.20')
  })

  it('rejects a stale base or a confirmation for different impacts', () => {
    const c = catalog()
    const patch = change(c)
    const p = previewCatalogChange(c, patch)

    expect(() => applyCatalogChange(c, patch, p.previewDigest, [brief()])).toThrow('CATALOG_PREVIEW_CONFLICT')
    c.records[0].note = 'concurrent change'
    expect(() => previewCatalogChange(c, patch)).toThrow('CATALOG_BASE_CONFLICT')
  })

  it('retire preserves old-date history and makes a missing resource actionable', () => {
    const c = catalog()
    const patch = { ...change(c), changes: [{ operation: 'retire', recordId: 'ETG-001', effectiveFrom: '2026-10-10' }] }
    const next = changeCatalog(c, patch).catalog

    expect(calculateCatalogQuote(next, brief()).totals?.net).toBe('4334.20')
    expect(calculateCatalogQuote(next, future()).totals).toBeNull()
    expect(next.records.some(r => r.recordId === 'ETG-001')).toBe(true)
  })

  it('add requires new identity; interval and duplicate errors fail closed', () => {
    const c = catalog()
    const patch = change(c)

    patch.changes[0].effectiveFrom = '2026-10-08'
    expect(() => changeCatalog(c, patch)).toThrow('EFFECTIVE_DATE_CONFLICT')
    c.records.push(structuredClone(c.records[0]))
    expect(() => validateCatalog(c)).toThrow('DUPLICATE_CATALOG_RECORD')
  })

  it('renews expired values without extending the expired gap, and cannot resurrect retired ids', () => {
    const c = catalog()

    resource(c, 'ETG-001').source.effectiveUntil = '2026-10-09'
    const patch = change(c)

    patch.changes[0].record.source.effectiveUntil = '9999-12-31'
    const next = changeCatalog(c, patch).catalog

    expect(next.records.find(r => r.recordId === 'ETG-001' && r.revision === 1)?.source.effectiveUntil).toBe(
      '2026-10-09'
    )
    expect(calculateCatalogQuote(next, future()).calculationStatus).toBe('calculated')

    const retired = changeCatalog(c, {
      ...patch,
      changes: [{ operation: 'retire', recordId: 'ETG-001', effectiveFrom: '2026-10-10' }]
    }).catalog

    expect(() => changeCatalog(retired, { ...patch, nextVersion: 'v3' })).toThrow('RETIRED_CATALOG_RECORD')
  })

  it('supports explicit new-country/currency dimensions without inferring precision or factors', () => {
    const c = catalog()
    const patch = change(c)

    const next = changeCatalog(c, {
      ...patch,
      dimensions: { countriesAdd: ['AR'], currenciesAdd: [{ code: 'ARS', precision: 2 }] }
    }).catalog

    expect(next.countries).toContain('AR')
    expect(next.currencies.find(x => x.code === 'ARS')?.precision).toBe(2)
    expect(c.countries).not.toContain('AR')
    expect(() => changeCatalog(c, { ...patch, dimensions: { countriesAdd: ['CL'], currenciesAdd: [] } })).toThrow(
      'CATALOG_DIMENSION_CONFLICT'
    )
  })

  it('adds new catalog values and rejects replacement identity drift', () => {
    const c = catalog()
    const patch = change(c)
    const newTool = structuredClone(resource(c, 'ETG-001'))

    newTool.recordId = 'new-license'
    newTool.value.resourceId = 'new-license'
    newTool.source.effectiveFrom = '2026-10-10'

    const added = changeCatalog(c, {
      ...patch,
      changes: [{ operation: 'add', recordId: newTool.recordId, effectiveFrom: '2026-10-10', record: newTool }]
    }).catalog

    expect(added.records.some(r => r.recordId === 'new-license')).toBe(true)
    const drifting = patch.changes[0].record as Extract<CatalogRecord, { kind: 'resource' }>

    drifting.value.resourceId = 'different-identity'
    expect(() => changeCatalog(c, patch)).toThrow('CATALOG_IDENTITY_CONFLICT')
  })

  it('CLI quote/replay writes exclusively and blocks historical client export', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pricing-catalog-'))

    try {
      const out = join(dir, 'quote.json')
      const q = cli(['quote', '--input', 'data/pricing/v3-catalog/examples/designer-co-cl.json', '--out', out])

      expect(q.status).toBe(3)
      expect(JSON.parse(q.stdout).totals.net).toBe('4334.20')
      expect(cli(['replay', '--input', out]).status).toBe(3)
      expect(
        cli(['quote', '--input', 'data/pricing/v3-catalog/examples/designer-co-cl.json', '--out', out]).status
      ).toBe(1)
      expect(cli(['export', '--input', out, '--out', join(dir, 'client.md')]).status).toBe(1)
      expect(cli(['catalog', 'validate', '--query', 'ignored']).status).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 30000)
})
