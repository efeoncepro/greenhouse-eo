// What an offer is sold as is a fact of the catalog (record kind `offer`): the composition holds a demand to it and
// the scaffold of a demand reads it, so a managed service is never quoted as a team with prices by a default.
//
// The record is added in memory to the committed catalogs, the way a change-set adds it; nothing is written under
// data/. A catalog without the record must behave as it always did, which is checked against the same demand quoted
// on the untouched catalog.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { catalogDigest } from '../adapters/catalog-local'
import { changeCatalog, searchCatalog, validateCatalog } from '../catalog/catalog'
import { resolveBrief } from '../catalog/resolve'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema } from '../resources/composition-contracts'
import { scaffoldResourceDemand } from '../resources/operating'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const operating = (name: string) => `data/pricing/v3-operating/${name}.json`

const catalog = read(operating('catalog.review-v4'))
const policy = read(operating('resources.review-v5'))
const credits = read('data/pricing/v3-resources/ai-credits.review-v1.json')
// A managed service of the Creative practice, declared as such, on the date its offer has a pricing policy.
const managed = read(operating('managed-care.demand'))
const OFFER: string = managed.brief.offerId

const offerRecord = (offerId: string, commercialUnit: string, extra: Record<string, unknown> = {}) => ({
  recordId: `offer:${offerId}`,
  revision: 1,
  kind: 'offer',
  source: {
    reference: 'offer-unit-test',
    effectiveFrom: '2026-01-01',
    effectiveUntil: '9999-12-31',
    status: 'confirmed'
  },
  note: 'What the offer is sold as, declared for the test.',
  value: { offerId, label: `Offer ${offerId}`, commercialUnit },
  ...extra
})

const withRecords = (base: { records: unknown[] }, ...records: unknown[]) => ({
  ...base,
  records: [...base.records, ...records]
})

const stated = withRecords(catalog, offerRecord(OFFER, 'managed_service'))
const compose = (cat: unknown, demand: unknown) => composeResourceQuote(cat, policy, credits, demand)
const as = (commercialUnit: string) => ({ ...clone(managed), commercialUnit })

describe('the catalog states what an offer is sold as', () => {
  it('an `offer` record is a catalog record like any other: validated, searchable and bound by resolution', () => {
    expect(() => validateCatalog(stated)).not.toThrow()
    expect(searchCatalog(validateCatalog(stated), '', 'offer').map(r => r.recordId)).toEqual([`offer:${OFFER}`])

    const resolution = resolveBrief(stated, managed.brief)

    expect(resolution.status).toBe('resolved')
    expect(resolution.bindings.filter(b => b.purpose === 'offer').map(b => [b.lineId, b.record.recordId])).toEqual([
      ['*', `offer:${OFFER}`]
    ])
    // The record of another offer says nothing about this one.
    expect(
      resolveBrief(withRecords(catalog, offerRecord('another-offer', 'role_capacity')), managed.brief).bindings.some(
        b => b.purpose === 'offer'
      )
    ).toBe(false)
  })

  it('a change-set adds it, and a revision may change the unit but never the offer it speaks of', () => {
    const base = validateCatalog(catalog)

    const change = (changes: unknown[]) => ({
      schemaVersion: 'pricing-v3-catalog-change/1',
      changeId: 'offer-unit-test',
      baseDigest: catalogDigest(base),
      nextVersion: 'offer-unit-test-v2',
      actor: 'test',
      reason: 'The commercial unit of an offer becomes a fact of the catalog.',
      changes
    })

    const added = changeCatalog(
      base,
      change([
        {
          operation: 'add',
          recordId: `offer:${OFFER}`,
          effectiveFrom: '2026-01-01',
          record: offerRecord(OFFER, 'managed_service')
        }
      ])
    ).catalog

    expect(added.records.filter(r => r.kind === 'offer')).toHaveLength(1)

    const revise = (offerId: string) =>
      changeCatalog(added, {
        ...change([
          {
            operation: 'replace',
            recordId: `offer:${OFFER}`,
            effectiveFrom: '2026-06-01',
            record: offerRecord(offerId, 'role_capacity', {
              recordId: `offer:${OFFER}`,
              revision: 2,
              source: {
                reference: 'offer-unit-test-revision',
                effectiveFrom: '2026-06-01',
                effectiveUntil: '9999-12-31',
                status: 'confirmed'
              }
            })
          }
        ]),
        changeId: 'offer-unit-test-revision',
        nextVersion: 'offer-unit-test-v3'
      })

    expect(revise(OFFER).catalog.records.filter(r => r.kind === 'offer')).toHaveLength(2)
    expect(() => revise('another-offer')).toThrow('CATALOG_IDENTITY_CONFLICT')
  })

  it('two records in force for one offer cannot be ranked, so they block instead of picking one', () => {
    const twice = withRecords(stated, offerRecord(OFFER, 'role_capacity', { recordId: `offer:${OFFER}:again` }))

    expect(resolveBrief(twice, managed.brief).diagnostics).toContainEqual({
      code: 'AMBIGUOUS_SELECTION',
      path: 'offerId',
      candidates: [`offer:${OFFER}`, `offer:${OFFER}:again`]
    })
  })
})

describe('a demand is held to the unit of its offer', () => {
  it('the unit the catalog states calculates, and to the same figures as on a catalog that states nothing', () => {
    const held = compose(stated, as('managed_service'))
    const free = compose(catalog, as('managed_service'))

    expect(held.quote.calculationStatus).toBe('calculated')
    expect(held.quote.totals).toEqual(free.quote.totals)
    expect(held.quote.periods).toEqual(free.quote.periods)
  })

  it('another unit is rejected with a diagnostic that names both, and nothing is priced', () => {
    const r = compose(stated, as('role_capacity'))

    expect(r.quote.calculationStatus).toBe('needs_input')
    expect(r.quote.totals).toBeNull()
    expect(r.quote.periods).toEqual([])

    const [blocker] = r.quote.diagnostics.filter(d => d.code === 'COMMERCIAL_UNIT_CONTRADICTS_OFFER')

    expect(r.quote.diagnostics).toHaveLength(1)
    expect(blocker.path).toBe('commercialUnit')
    expect(blocker.detail).toContain('role_capacity')
    expect(blocker.detail).toContain('managed_service')
    expect(blocker.detail).toContain(`offer:${OFFER}`)
  })

  it('a catalog that does not state the unit holds the demand to nothing, as before', () => {
    for (const unit of ['managed_service', 'role_capacity']) {
      const r = compose(catalog, as(unit))

      expect(r.quote.calculationStatus).toBe('calculated')
      expect(r.commercialUnit).toBe(unit)
      expect(r.quote.resolution.bindings.some(b => b.purpose === 'offer')).toBe(false)
    }
  })

  it('a record that is not yet in force on the quote date states nothing for that quote', () => {
    const later = withRecords(
      catalog,
      offerRecord(OFFER, 'managed_service', {
        source: {
          reference: 'offer-unit-test',
          effectiveFrom: '2027-01-01',
          effectiveUntil: '9999-12-31',
          status: 'confirmed'
        }
      })
    )

    expect(compose(later, as('role_capacity')).quote.calculationStatus).toBe('calculated')
  })
})

describe('the scaffold of a demand reads the unit from the catalog and never invents one', () => {
  it('fills the unit the catalog states and asks nothing about it', () => {
    for (const unit of ['managed_service', 'role_capacity']) {
      const scaffold = scaffoldResourceDemand(withRecords(catalog, offerRecord(OFFER, unit)), policy, managed.brief)

      expect(scaffold.demand.commercialUnit).toBe(unit)
      expect(scaffold.questions.map(q => q.code)).not.toContain('COMMERCIAL_UNIT_REQUIRED')
      // With the unit in place the scaffold is a demand: only the plan of each tool is left to declare.
      expect(compositionDemandSchema.safeParse(scaffold.demand).success).toBe(true)
    }
  })

  it('leaves the unit as an explicit question when the catalog does not say, and the demand is not quotable', () => {
    const scaffold = scaffoldResourceDemand(catalog, policy, managed.brief)

    expect(scaffold.demand.commercialUnit).toBeNull()
    expect(scaffold.questions).toContainEqual(
      expect.objectContaining({
        code: 'COMMERCIAL_UNIT_REQUIRED',
        path: 'commercialUnit',
        candidates: ['role_capacity', 'managed_service']
      })
    )
    expect(compositionDemandSchema.safeParse(scaffold.demand).success).toBe(false)
    // Everything else of the scaffold is what it was.
    expect(compositionDemandSchema.safeParse({ ...scaffold.demand, commercialUnit: 'managed_service' }).success).toBe(
      true
    )
  })

  it('asks too when two records in force for the offer contradict each other', () => {
    const twice = withRecords(stated, offerRecord(OFFER, 'role_capacity', { recordId: `offer:${OFFER}:again` }))
    const scaffold = scaffoldResourceDemand(twice, policy, managed.brief)

    expect(scaffold.demand.commercialUnit).toBeNull()
    expect(scaffold.questions.map(q => q.code)).toContain('COMMERCIAL_UNIT_REQUIRED')
  })
})

describe('through the CLI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-offer-unit-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const file = (name: string, content: unknown) => {
    const path = join(dir, name)

    writeFileSync(path, JSON.stringify(content))

    return path
  }

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  const sources = [
    '--policy',
    operating('resources.review-v5'),
    '--credits',
    'data/pricing/v3-resources/ai-credits.review-v1.json'
  ]

  it('a scaffold without a unit is rejected by `compose quote` at the place to fill, with what it takes', () => {
    const scaffold = cli(
      'compose',
      'scaffold',
      '--catalog',
      operating('catalog.review-v4'),
      '--policy',
      operating('resources.review-v5'),
      '--input',
      file('brief.json', managed.brief),
      '--out',
      join(dir, 'scaffold.demand.json')
    )

    expect(scaffold.status).toBe(2)
    expect(read(join(dir, 'scaffold.demand.json')).commercialUnit).toBeNull()

    const quote = cli(
      'compose',
      'quote',
      '--catalog',
      operating('catalog.review-v4'),
      ...sources,
      '--input',
      join(dir, 'scaffold.demand.json')
    )

    expect(quote.status).toBe(1)
    expect(quote.stdout).toBe('')
    expect(JSON.parse(quote.stderr).error).toMatchObject({
      code: 'SCHEMA_INVALID',
      issues: [{ path: 'commercialUnit', rule: 'invalid_type', expected: "'role_capacity' | 'managed_service'" }]
    })
  })

  it('the contradiction blocks the quote with exit 2 and the diagnostic on stdout', () => {
    const run = cli(
      'compose',
      'quote',
      '--catalog',
      file('stated.catalog.json', stated),
      ...sources,
      '--input',
      file('as-team.demand.json', as('role_capacity'))
    )

    expect(run.status).toBe(2)
    expect(run.stderr).toBe('')
    expect(JSON.parse(run.stdout).diagnostics.map((d: { code: string }) => d.code)).toEqual([
      'COMMERCIAL_UNIT_CONTRADICTS_OFFER'
    ])
  })
})
