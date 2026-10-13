// Contract 1.1.0 of the Pricing V3 kernel: agreed net, disjoint adjustments and commercial rounding
// (GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1).
//
// Expectations are derived, never copied from a run. Two independent oracles are used:
//   1. the 1.0.0 engine itself, for the policy price and the presented cost of the same economic input (contract
//      1.0.0 is pinned by `pricing-v3-frozen-artifacts.test.ts`, so it is a fixed reference, not the code under test);
//   2. exact integer arithmetic in minor units (BigInt), for allocations, multiples and the margin floor. It shares no
//      code and no rounding behaviour with the kernel's Decimal arithmetic.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { calculatePricingV3, PRICING_V3_PRECISION_POLICIES } from '../calculate'
import { comparePricingV3, replayPricingV3, runPricingV3, stableJson } from '../adapters/local-snapshot'
import { projectPricingV3ForClient } from '../projection'
import { PRICING_V3_ENGINES } from '../schemas'
import type { PricingV3ResultV11 } from '../calculate'

type Contract = keyof typeof PRICING_V3_ENGINES
type Currency = 'CLP' | 'USD'

const PRECISION: Record<Currency, number> = { CLP: 0, USD: 2 }

const source = {
  reference: 'engine-1-1-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2026-12-31',
  status: 'confirmed'
}

type LineSpec = {
  lineId: string
  cost: string
  setup?: string
  method?: 'markup' | 'target_margin'
  rate?: string
  minimumMargin?: string
}

type Spec = {
  contract: Contract
  currency: Currency
  /** Costs are denominated here; defaults to the output currency (no conversion). */
  calculationCurrency?: Currency
  fxRate?: string
  periods?: number
  lines: LineSpec[]
  adjustments?: unknown[]
  multiple?: string
}

// One profile, one policy and (optionally) one setup resource per line: every row price is cost x multiplier.
const build = (spec: Spec) => {
  const calculation = spec.calculationCurrency ?? spec.currency

  return {
    request: {
      schemaVersion: spec.contract,
      quoteDate: '2026-06-15',
      offerId: 'offer',
      deliveryModel: 'staffing',
      engagementCode: 'monthly',
      offerMarketCountry: 'CL',
      outputCurrency: spec.currency,
      duration: { unit: 'month', periods: spec.periods ?? 1 },
      lines: spec.lines.map(line => ({
        lineId: line.lineId,
        profileId: `profile-${line.lineId}`,
        seniorityCode: 'senior',
        talentCountry: 'CL',
        headcount: 1,
        dedication: { unit: 'fte', value: '1' },
        allocationMode: 'shared',
        allocationPolicyRef: 'shared',
        assignments: line.setup
          ? [
              {
                resourceId: `setup-${line.lineId}`,
                allocationId: `allocation-${line.lineId}`,
                scope: 'account',
                scopeRef: `account-${line.lineId}`,
                quantity: '1',
                share: '1',
                cashTiming: 'start'
              }
            ]
          : [],
        notApplicable: []
      })),
      adjustments: spec.adjustments ?? [],
      taxTreatment: { kind: 'not_resolved' }
    },
    snapshot: {
      schemaVersion: spec.contract,
      snapshotId: 'engine-1-1',
      version: 'test',
      mode: 'synthetic',
      calculationCurrency: calculation,
      countries: ['CL'],
      currencies: [
        { code: 'CLP', precision: PRECISION.CLP },
        { code: 'USD', precision: PRECISION.USD }
      ],
      profiles: spec.lines.map(line => ({
        profileId: `profile-${line.lineId}`,
        label: `Perfil ${line.lineId}`,
        seniorityCode: 'senior',
        tierCode: 'tier',
        cost: {
          amount: line.cost,
          currency: calculation,
          source: /^0(\.0+)?$/.test(line.cost) ? { ...source, zeroReason: 'Confirmed zero for the test' } : source,
          localization: { kind: 'specific', country: 'CL' },
          unit: 'month',
          covers: ['human_salary']
        },
        requiredCoverages: ['human_salary']
      })),
      allocationPolicies: [
        {
          policyId: 'shared',
          mode: 'shared',
          hoursPerFteMonth: '160',
          minimumBilledFte: '0',
          dedicatedBilledFte: '1',
          source
        }
      ],
      pricingPolicies: spec.lines.map(line => ({
        profileId: `profile-${line.lineId}`,
        tierCode: 'tier',
        offerId: 'offer',
        engagementCode: 'monthly',
        method: line.method ?? 'markup',
        rate: line.rate ?? '1',
        basis: 'all_costs',
        minimumMargin: line.minimumMargin ?? '0',
        source
      })),
      talentFactors: [],
      marketFactors: [{ country: 'CL', factor: '1', source }],
      resources: spec.lines
        .filter(line => line.setup)
        .map(line => ({
          amount: line.setup,
          currency: calculation,
          source,
          resourceId: `setup-${line.lineId}`,
          label: `Implementación ${line.lineId}`,
          kind: 'setup',
          unit: 'once',
          scope: 'account',
          covers: [`setup-${line.lineId}`]
        })),
      fx: spec.fxRate ? [{ from: calculation, to: spec.currency, rate: spec.fxRate, source }] : [],
      ...(spec.multiple ? { priceRounding: { multiple: spec.multiple, source } } : {})
    }
  }
}

const calc = (spec: Spec) => calculatePricingV3(build(spec))

/** A 1.1.0 calculation that must have produced rows. */
const calc11 = (spec: Omit<Spec, 'contract'>) => {
  const result = calc({ ...spec, contract: '1.1.0' })

  expect(result.diagnostics.filter(item => item.severity !== 'review')).toEqual([])
  expect(result.calculationStatus).toBe('calculated')

  return result as PricingV3ResultV11
}

/** Policy price and presented cost of the same economic input, as contract 1.0.0 computes them. */
const policyRows = (spec: Omit<Spec, 'contract'>) => {
  const result = calc({ ...spec, contract: '1.0.0', multiple: undefined, adjustments: [] })

  expect(result.calculationStatus).toBe('calculated')

  return new Map(result.lines.map(line => [line.lineId, line]))
}

const codes = (result: ReturnType<typeof calculatePricingV3>) => result.diagnostics.map(item => item.code)

// ---- exact integer oracle (minor units) ----

/** Decimal string -> integer count of 10^-scale. Throws on a value that does not fit the scale exactly. */
const scaled = (value: string, scale: number) => {
  const [whole, fraction = ''] = value.split('.')

  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) throw new RangeError(`${value} @ ${scale}`)

  return BigInt(whole + fraction.slice(0, scale).padEnd(scale, '0'))
}

const minor = (value: string, currency: Currency) => scaled(value, PRECISION[currency])
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, 0n)
const ceilTo = (value: bigint, multiple: bigint) => ((value + multiple - 1n) / multiple) * multiple

/** (price - cost) / price >= floor, with the floor as an exact fraction. Mirrors the control, not its arithmetic. */
const meetsFloor = (price: bigint, cost: bigint, floor: string) => {
  const decimals = (floor.split('.')[1] ?? '').length
  const denominator = 10n ** BigInt(decimals)

  return price > 0n && (price - cost) * denominator >= scaled(floor, decimals) * price
}

/**
 * Largest remainder over exact rationals; ties by row id. `ambiguous` flags the one corner where the kernel is not
 * expected to agree: an exact tie AT the cut between rows of different price, which the kernel resolves by the last
 * digit of its division instead of by id (inherited from the 1.0.0 discount, which cannot change).
 */
const allocateExact = (rows: { id: string; weight: bigint }[], total: bigint) => {
  const gross = sum(rows.map(row => row.weight))

  const parts = rows.map(row => ({
    id: row.id,
    weight: row.weight,
    floor: gross === 0n ? 0n : (total * row.weight) / gross,
    remainder: gross === 0n ? 0n : (total * row.weight) % gross
  }))

  const ordered = [...parts].sort((a, b) =>
    a.remainder === b.remainder ? (a.id < b.id ? -1 : 1) : a.remainder > b.remainder ? -1 : 1
  )

  const extra = Number(total - sum(parts.map(part => part.floor)))
  const lastIn = ordered[extra - 1]
  const firstOut = ordered[extra]

  return {
    ambiguous: Boolean(
      lastIn && firstOut && lastIn.remainder === firstOut.remainder && lastIn.weight !== firstOut.weight
    ),
    amounts: new Map(ordered.map((part, index) => [part.id, part.floor + (index < extra ? 1n : 0n)]))
  }
}

// Seeded generator: the property tests are reproducible and need no dependency.
const seeded = (seed: number) => {
  let state = seed >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state

    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))

  return { int, pick: <T>(items: readonly T[]) => items[int(0, items.length - 1)] }
}

const money = (value: bigint, currency: Currency) => {
  const precision = PRECISION[currency]
  const digits = value.toString().padStart(precision + 1, '0')

  return precision === 0 ? digits : `${digits.slice(0, -precision)}.${digits.slice(-precision)}`
}

const randomCost = (random: ReturnType<typeof seeded>, currency: Currency) =>
  currency === 'CLP' ? String(random.int(300_000, 9_000_000)) : money(BigInt(random.int(50_000, 1_500_000)), 'USD')

const MULTIPLES: Record<Currency, readonly string[]> = {
  CLP: ['1000', '5000', '10000', '50000', '100000'],
  USD: ['0.05', '1', '5', '10', '100', '250']
}

// With the currency unit itself as the multiple every price is already "round": only floor conservation can move it.
const FLOOR_MULTIPLES: Record<Currency, readonly string[]> = {
  CLP: ['1', '5', ...MULTIPLES.CLP],
  USD: ['0.01', '0.02', ...MULTIPLES.USD]
}

const fixture = () =>
  JSON.parse(readFileSync(resolve('data/pricing/v3-pilot/scenarios/synthetic-co-cl.json'), 'utf8')) as {
    request: Record<string, unknown> & { adjustments: unknown[] }
    snapshot: Record<string, unknown> & { marketFactors: { source: unknown }[] }
  }

// ---------------------------------------------------------------------------------------------------------------

describe('Contract selection: the input declares its version', () => {
  it('signs each contract with its own engine and precision policy, both from the closed registry', () => {
    expect(Object.keys(PRICING_V3_ENGINES)).toEqual(Object.keys(PRICING_V3_PRECISION_POLICIES))
    expect(new Set(Object.values(PRICING_V3_ENGINES)).size).toBe(Object.keys(PRICING_V3_ENGINES).length)
    expect(new Set(Object.values(PRICING_V3_PRECISION_POLICIES)).size).toBe(Object.keys(PRICING_V3_ENGINES).length)

    for (const contract of Object.keys(PRICING_V3_ENGINES) as Contract[]) {
      const result = calc({ contract, currency: 'CLP', lines: [{ lineId: 'a', cost: '1000' }] })

      expect(result.calculationStatus).toBe('calculated')
      expect(result.engineVersion).toBe(PRICING_V3_ENGINES[contract])
      expect(result.precisionPolicy).toBe(PRICING_V3_PRECISION_POLICIES[contract])
    }
  })

  it('same economic input, no rounding and no new adjustment: same amounts; 1.1.0 keys are zero there and absent in 1.0.0', () => {
    const v10 = fixture()
    const v11 = fixture()

    v11.request.schemaVersion = '1.1.0'
    v11.snapshot.schemaVersion = '1.1.0'

    const before = calculatePricingV3(v10)
    const after = calculatePricingV3(v11) as PricingV3ResultV11

    expect(before.calculationStatus).toBe('calculated')
    expect(before.lines.length).toBeGreaterThan(0)

    // Everything a 1.0.0 result says is said identically by 1.1.0, except the two version labels.
    const withoutNewKeys = (value: unknown) =>
      JSON.parse(
        JSON.stringify(value, (key, item) =>
          ['roundingAdjustment', 'uplift', 'engineVersion', 'precisionPolicy'].includes(key) ? undefined : item
        )
      )

    expect(withoutNewKeys(after)).toEqual(withoutNewKeys(before))

    const zero = (0).toFixed(2) // the fixture quotes in USD

    for (const row of [...after.lines, after.totals!]) {
      expect(row.roundingAdjustment).toBe(zero)
      expect(row.uplift).toBe(zero)
    }

    for (const row of [...before.lines, before.totals!]) {
      expect(row).not.toHaveProperty('roundingAdjustment')
      expect(row).not.toHaveProperty('uplift')
    }
  })

  it.each([
    [
      'an agreed net',
      (input: ReturnType<typeof fixture>) => {
        input.request.adjustments = [
          { adjustmentId: 'x', kind: 'agreed_net', amount: '900', billing: 'monthly', lineIds: ['design'], reason: 'r' }
        ]
      },
      'request.adjustments'
    ],
    [
      'a second adjustment',
      (input: ReturnType<typeof fixture>) => {
        input.request.adjustments.push({ ...(input.request.adjustments[0] as object), adjustmentId: 'second' })
      },
      'request.adjustments'
    ],
    [
      'a rounding rule',
      (input: ReturnType<typeof fixture>) => {
        input.snapshot.priceRounding = { multiple: '10', source: input.snapshot.marketFactors[0].source }
      },
      'snapshot'
    ]
  ])('a 1.0.0 input carrying %s is rejected by the strict 1.0.0 schema, never reinterpreted', (_, edit, path) => {
    const input = fixture()

    edit(input)
    const result = calculatePricingV3(input)

    expect(result.calculationStatus).toBe('invalid')
    expect(result.engineVersion).toBe(PRICING_V3_ENGINES['1.0.0'])
    expect(result.totals).toBeNull()
    expect(result.lines).toEqual([])
    expect(result.diagnostics.length).toBeGreaterThan(0)
    expect(result.diagnostics.every(item => item.code === 'INVALID_INPUT' && item.fieldPath.startsWith(path))).toBe(
      true
    )
    expect(runPricingV3(input).artifact).toBeNull()
  })

  // Characterization of contract 1.0.0, captured from the engine BEFORE contract 1.1.0 existed (the baseline of the
  // change that introduced it). Selecting the schema by declared version must leave these exactly as they were: a
  // zod union of both contracts would have replaced them with a single `invalid_union` at the root.
  it.each([
    [
      'unknown version',
      (input: ReturnType<typeof fixture>) => {
        input.request.schemaVersion = '99'
      },
      [['UNSUPPORTED_SCHEMA', 'request.schemaVersion']]
    ],
    [
      'unknown version on both sides',
      (input: ReturnType<typeof fixture>) => {
        input.request.schemaVersion = '2.0.0'
        input.snapshot.schemaVersion = '2.0.0'
      },
      [
        ['UNSUPPORTED_SCHEMA', 'request.schemaVersion'],
        ['UNSUPPORTED_SCHEMA', 'snapshot.schemaVersion']
      ]
    ],
    [
      '1.0.0 request with a 1.1.0 snapshot',
      (input: ReturnType<typeof fixture>) => {
        input.snapshot.schemaVersion = '1.1.0'
      },
      [['UNSUPPORTED_SCHEMA', 'snapshot.schemaVersion']]
    ],
    [
      'agreed net inside a 1.0.0 request',
      (input: ReturnType<typeof fixture>) => {
        input.request.adjustments = [
          { adjustmentId: 'a', kind: 'agreed_net', amount: '100', billing: 'monthly', lineIds: ['design'], reason: 'r' }
        ]
      },
      [
        ['INVALID_INPUT', 'request.adjustments.0.kind'],
        ['INVALID_INPUT', 'request.adjustments.0.rate'],
        ['INVALID_INPUT', 'request.adjustments.0']
      ]
    ],
    [
      'unknown field at the root',
      (input: ReturnType<typeof fixture>) => {
        ;(input as Record<string, unknown>).secret = 'x'
      },
      [['INVALID_INPUT', '']]
    ]
  ])('1.0.0 diagnostics are unchanged: %s', (_, edit, expected) => {
    const input = fixture()

    edit(input)
    const result = calculatePricingV3(input)

    expect(result.engineVersion).toBe(PRICING_V3_ENGINES['1.0.0'])
    expect(result.precisionPolicy).toBe(PRICING_V3_PRECISION_POLICIES['1.0.0'])
    expect(result.diagnostics.map(item => [item.code, item.fieldPath])).toEqual(expected)
  })

  it('request and snapshot must declare the same version', () => {
    const input = build({ contract: '1.1.0', currency: 'CLP', lines: [{ lineId: 'a', cost: '1000' }] })

    input.snapshot.schemaVersion = '1.0.0'
    const result = calculatePricingV3(input)

    expect(result.calculationStatus).toBe('invalid')
    expect(result.diagnostics.map(item => [item.code, item.fieldPath])).toEqual([
      ['UNSUPPORTED_SCHEMA', 'snapshot.schemaVersion']
    ])
  })
})

describe.each(['CLP', 'USD'] as const)('Agreed net in %s', currency => {
  const lines: LineSpec[] =
    currency === 'CLP'
      ? [
          { lineId: 'social', cost: '1666666.5', setup: '350000' },
          { lineId: 'care', cost: '617283.5', setup: '125000.5' },
          { lineId: 'video', cost: '493827' },
          { lineId: 'untouched', cost: '700000', setup: '90000' }
        ]
      : [
          { lineId: 'social', cost: '1666.665', setup: '350.33' },
          { lineId: 'care', cost: '617.285', setup: '125.01' },
          { lineId: 'video', cost: '493.83' },
          { lineId: 'untouched', cost: '700', setup: '90' }
        ]

  const targeted = ['social', 'care', 'video']
  const spec = { currency, periods: 3, lines }
  const policy = policyRows(spec)

  const rowsOf = (kind: 'monthly' | 'setup', period: number) =>
    [...policy.values()].filter(
      row => row.kind === kind && row.periodId === period && targeted.includes(row.parentLineId)
    )

  const grossOf = (kind: 'monthly' | 'setup', period: number) =>
    sum(rowsOf(kind, period).map(row => minor(row.undiscountedPrice, currency)))

  const agreed = (amount: bigint, billing: 'monthly' | 'setup' = 'monthly') =>
    calc11({
      ...spec,
      adjustments: [
        {
          adjustmentId: 'agreed',
          kind: 'agreed_net',
          amount: money(amount, currency),
          billing,
          lineIds: targeted,
          reason: 'Negotiated with the client'
        }
      ]
    })

  const expectIdentity = (result: PricingV3ResultV11) => {
    const net = (row: { undiscountedPrice: string; uplift: string; discount: string }) =>
      minor(row.undiscountedPrice, currency) + minor(row.uplift, currency) - minor(row.discount, currency)

    for (const row of result.lines) expect(minor(row.net, currency)).toBe(net(row))
    expect(minor(result.totals!.net, currency)).toBe(net(result.totals!))

    for (const key of ['undiscountedPrice', 'roundingAdjustment', 'discount', 'uplift', 'net'] as const)
      expect(minor(result.totals![key], currency)).toBe(sum(result.lines.map(row => minor(row[key], currency))))
  }

  it('the fixture has monthly rows in every period and setup rows only in the first', () => {
    expect([1, 2, 3].map(period => rowsOf('monthly', period).length)).toEqual([3, 3, 3])
    expect([1, 2, 3].map(period => rowsOf('setup', period).length)).toEqual([2, 0, 0])
    expect(grossOf('monthly', 1)).toBeGreaterThan(0n)
  })

  it.each([
    ['below the price: the gap is a discount', -1],
    ['above the price: the gap is an uplift', 1],
    ['equal to the price: nothing moves', 0]
  ] as const)('%s', (_, direction) => {
    const gross = grossOf('monthly', 1)
    // A gap that does not divide evenly among three rows of unequal price.
    const gap = BigInt(direction) * (gross / 13n + 7n)
    const result = agreed(gross + gap)
    const magnitude = gap < 0n ? -gap : gap

    for (const period of [1, 2, 3]) {
      const rows = result.lines.filter(
        row => row.kind === 'monthly' && row.periodId === period && targeted.includes(row.parentLineId)
      )

      const exact = allocateExact(
        rows.map(row => ({ id: row.lineId, weight: minor(policy.get(row.lineId)!.undiscountedPrice, currency) })),
        magnitude
      )

      expect(exact.ambiguous).toBe(false)
      expect(sum(rows.map(row => minor(row.net, currency)))).toBe(gross + gap)
      expect(sum(rows.map(row => minor(row.discount, currency)))).toBe(gap < 0n ? magnitude : 0n)
      expect(sum(rows.map(row => minor(row.uplift, currency)))).toBe(gap > 0n ? magnitude : 0n)

      for (const row of rows) {
        expect(minor(row.discount, currency)).toBe(gap < 0n ? exact.amounts.get(row.lineId) : 0n)
        expect(minor(row.uplift, currency)).toBe(gap > 0n ? exact.amounts.get(row.lineId) : 0n)
        expect(row.undiscountedPrice).toBe(policy.get(row.lineId)!.undiscountedPrice)
      }
    }

    // Setup rows and the line outside `lineIds` are not part of a monthly agreement.
    const others = result.lines.filter(row => row.kind === 'setup' || row.parentLineId === 'untouched')

    expect(others.length).toBeGreaterThan(0)

    for (const row of others) {
      expect(row.net).toBe(policy.get(row.lineId)!.net)
      expect(minor(row.discount, currency)).toBe(0n)
      expect(minor(row.uplift, currency)).toBe(0n)
    }

    expectIdentity(result)
  })

  it.each([
    ['below', -1],
    ['above', 1]
  ] as const)('billing "setup" (%s) reaches the setup rows only, in the periods that have them', (_, direction) => {
    const gross = grossOf('setup', 1)
    const gap = BigInt(direction) * (gross / 7n + 3n)
    const result = agreed(gross + gap, 'setup')
    const setup = result.lines.filter(row => row.kind === 'setup' && targeted.includes(row.parentLineId))

    expect(setup.map(row => row.periodId)).toEqual([1, 1])
    expect(sum(setup.map(row => minor(row.net, currency)))).toBe(gross + gap)

    const others = result.lines.filter(row => !setup.includes(row))

    expect(others.filter(row => row.kind === 'monthly')).toHaveLength(12)

    for (const row of others) {
      expect(row.net).toBe(policy.get(row.lineId)!.net)
      expect(minor(row.discount, currency) + minor(row.uplift, currency)).toBe(0n)
    }

    expectIdentity(result)
  })

  it('a monthly and a setup agreement on the same lines do not overlap; a discount on another line coexists', () => {
    const monthly = grossOf('monthly', 1) - 12_345n
    const setup = grossOf('setup', 1) + 6_789n

    const result = calc11({
      ...spec,
      adjustments: [
        {
          adjustmentId: 'm',
          kind: 'agreed_net',
          amount: money(monthly, currency),
          billing: 'monthly',
          lineIds: targeted,
          reason: 'r'
        },
        {
          adjustmentId: 's',
          kind: 'agreed_net',
          amount: money(setup, currency),
          billing: 'setup',
          lineIds: targeted,
          reason: 'r'
        },
        { adjustmentId: 'd', kind: 'discount', rate: '0.1', lineIds: ['untouched'], reason: 'r' }
      ]
    })

    const netOf = (kind: string, period: number) =>
      sum(
        result.lines
          .filter(row => row.kind === kind && row.periodId === period && targeted.includes(row.parentLineId))
          .map(row => minor(row.net, currency))
      )

    expect([1, 2, 3].map(period => netOf('monthly', period))).toEqual([monthly, monthly, monthly])
    expect(netOf('setup', 1)).toBe(setup)

    // The rate discount keeps its 1.0.0 semantics: one total over every row of the line, in all periods.
    const untouched = result.lines.filter(row => row.parentLineId === 'untouched')
    const base = sum(untouched.map(row => minor(row.undiscountedPrice, currency)))

    expect(base % 10n).toBe(0n) // so 10% is exact and needs no rounding rule in the oracle
    expect(sum(untouched.map(row => minor(row.discount, currency)))).toBe(base / 10n)
    expectIdentity(result)
  })
})

describe('Allocation is exact and deterministic', () => {
  it('a tie among equal rows goes to the lowest row ids, whatever the order of the request', () => {
    const spec = (order: string[]) => ({
      currency: 'CLP' as const,
      lines: order.map(lineId => ({ lineId, cost: '500' })),
      adjustments: [
        { adjustmentId: 'x', kind: 'agreed_net', amount: '2998', billing: 'monthly', lineIds: order, reason: 'r' }
      ]
    })

    // Three rows of 1000 and 2 pesos to take off: 2/3 each, so two rows give 1 and one gives 0.
    for (const order of [
      ['a', 'b', 'c'],
      ['c', 'b', 'a'],
      ['b', 'c', 'a']
    ]) {
      const discounts = Object.fromEntries(calc11(spec(order)).lines.map(row => [row.parentLineId, row.discount]))

      expect(discounts).toEqual({ a: '1', b: '1', c: '0' })
    }
  })

  it('matches exact largest-remainder arithmetic over generated cases, in both directions and both currencies', () => {
    const random = seeded(20261010)
    let checked = 0
    let ambiguous = 0
    let uplifts = 0

    for (let index = 0; index < 150; index++) {
      const currency = random.pick(['CLP', 'USD'] as const)
      const ids = ['q', 'm', 'x', 'b', 'k', 'e'].slice(0, random.int(3, 6))
      const lines = ids.map(lineId => ({ lineId, cost: randomCost(random, currency), rate: '0.37' }))
      const spec = { currency, lines }
      const policy = policyRows(spec)

      const weights = [...policy.values()].map(row => ({
        id: row.lineId,
        weight: minor(row.undiscountedPrice, currency)
      }))

      const gross = sum(weights.map(row => row.weight))
      const up = random.int(0, 1) === 1
      const magnitude = BigInt(random.int(1, 999_983))
      const amount = up ? gross + magnitude : gross - (magnitude % gross)
      const exact = allocateExact(weights, up ? magnitude : magnitude % gross)

      if (exact.ambiguous) {
        ambiguous++
        continue
      }

      const result = calc11({
        ...spec,
        adjustments: [
          {
            adjustmentId: 'x',
            kind: 'agreed_net',
            amount: money(amount, currency),
            billing: 'monthly',
            lineIds: ids,
            reason: 'r'
          }
        ]
      })

      expect(sum(result.lines.map(row => minor(row.net, currency)))).toBe(amount)

      for (const row of result.lines)
        expect(minor(up ? row.uplift : row.discount, currency)).toBe(exact.amounts.get(row.lineId))

      checked++
      if (up) uplifts++
    }

    // The generator must exercise both directions and almost never fall in the skipped corner.
    expect(checked).toBeGreaterThan(140)
    expect(ambiguous).toBeLessThan(5)
    expect(uplifts).toBeGreaterThan(40)
    expect(checked - uplifts).toBeGreaterThan(40)
  })
})

describe('Adjustment errors are input errors: invalid, no rows, no totals', () => {
  const lines: LineSpec[] = [
    { lineId: 'a', cost: '1000', setup: '100' },
    { lineId: 'b', cost: '2000' },
    { lineId: 'free', cost: '0' }
  ]

  const agreedNet = (adjustmentId: string, lineIds: string[], amount = '1500', billing = 'monthly') => ({
    adjustmentId,
    kind: 'agreed_net',
    amount,
    billing,
    lineIds,
    reason: 'r'
  })

  const discount = (adjustmentId: string, lineIds: string[]) => ({
    adjustmentId,
    kind: 'discount',
    rate: '0.1',
    lineIds,
    reason: 'r'
  })

  const run = (adjustments: unknown[], currency: Currency = 'CLP') =>
    calc({ contract: '1.1.0', currency, lines, adjustments })

  const expectInvalid = (result: ReturnType<typeof run>, code: string, fieldPath: string) => {
    expect(result.diagnostics.map(item => [item.code, item.fieldPath, item.severity])).toEqual([
      [code, fieldPath, 'error']
    ])
    expect(result.calculationStatus).toBe('invalid')
    expect(result.lines).toEqual([])
    expect(result.totals).toBeNull()
  }

  it('the valid neighbours of every error below do calculate', () => {
    for (const adjustments of [
      [agreedNet('m', ['a', 'b']), agreedNet('s', ['a'], '90', 'setup')],
      [agreedNet('m', ['a']), discount('d', ['b'])],
      [agreedNet('zero', ['free'], '0')]
    ])
      expect(run(adjustments).calculationStatus).toBe('calculated')
  })

  it.each([
    ['a discount and an agreed net on the same line', [discount('d', ['a']), agreedNet('n', ['a', 'b'])]],
    ['a discount and a setup agreement on the same line', [discount('d', ['a']), agreedNet('n', ['a'], '90', 'setup')]],
    ['two monthly agreements sharing a line', [agreedNet('n1', ['a', 'b']), agreedNet('n2', ['b'])]],
    ['two discounts sharing a line', [discount('d1', ['a', 'b']), discount('d2', ['b'])]]
  ])('OVERLAPPING_ADJUSTMENTS: %s', (_, adjustments) => {
    expectInvalid(run(adjustments), 'OVERLAPPING_ADJUSTMENTS', 'request.adjustments')
  })

  it('DUPLICATE_ID: two adjustments with the same id, even on disjoint rows', () => {
    expectInvalid(run([agreedNet('same', ['a']), discount('same', ['b'])]), 'DUPLICATE_ID', 'request.adjustments')
  })

  it.each([
    ['CLP', '1500.5', false],
    ['CLP', '1500.00', true],
    ['USD', '1500.505', false],
    ['USD', '1500.5', true]
  ] as const)('INVALID_AGREED_AMOUNT in %s: %s (accepted: %s)', (currency, amount, accepted) => {
    const result = run([agreedNet('n', ['a'], amount)], currency)

    if (accepted) expect(result.calculationStatus).toBe('calculated')
    else expectInvalid(result, 'INVALID_AGREED_AMOUNT', 'request.adjustments.0.amount')
  })

  it('AGREED_NET_WITHOUT_BASE: no row of that billing class, or a positive amount over a zero price', () => {
    // Line b has no setup rows at all.
    expectInvalid(run([agreedNet('n', ['b'], '90', 'setup')]), 'AGREED_NET_WITHOUT_BASE', 'request.adjustments.0')
    // The price of `free` is zero: a proportional split of a positive amount has nothing to follow.
    expectInvalid(
      run([discount('d', ['a']), agreedNet('n', ['free'], '10')]),
      'AGREED_NET_WITHOUT_BASE',
      'request.adjustments.1'
    )
  })

  it('more than ten adjustments, or an unknown kind, never reach the calculation', () => {
    const many = Array.from({ length: 11 }, (_, index) => ({ lineId: `l${index}`, cost: '1000' }))

    const result = calc({
      contract: '1.1.0',
      currency: 'CLP',
      lines: many,
      adjustments: many.map(line => discount(`d-${line.lineId}`, [line.lineId]))
    })

    expect(result.calculationStatus).toBe('invalid')
    expect(result.diagnostics.map(item => [item.code, item.fieldPath])).toEqual([
      ['INVALID_INPUT', 'request.adjustments']
    ])
    expect(
      calc({
        contract: '1.1.0',
        currency: 'CLP',
        lines: many,
        adjustments: many.slice(0, 10).map(line => discount(`d-${line.lineId}`, [line.lineId]))
      }).calculationStatus
    ).toBe('calculated')

    const unknown = run([{ ...discount('d', ['a']), kind: 'surcharge' }])

    expect(unknown.calculationStatus).toBe('invalid')
    expect(unknown.diagnostics.map(item => [item.code, item.fieldPath])).toEqual([
      ['INVALID_INPUT', 'request.adjustments.0.kind']
    ])
  })

  it('an adjustment never approves anything: a net under the floor is still flagged for review', () => {
    const result = calc({
      contract: '1.1.0',
      currency: 'CLP',
      lines: [{ lineId: 'a', cost: '1000', minimumMargin: '0.4' }], // price 2000, margin 50%
      adjustments: [agreedNet('n', ['a'], '1600')] // margin 600 / 1600 = 37.5%
    })

    expect(result.calculationStatus).toBe('calculated')
    expect(result.reviewStatus).toBe('requires_review')
    expect(codes(result)).toEqual(['MARGIN_BELOW_FLOOR'])
    expect(result.binding).toBe(false)
  })
})

describe('Commercial rounding', () => {
  it('worked example of the decision: 5.420.145 is sold at 5.430.000 and agreed at 4.990.000 without a hand-made rate', () => {
    // cost 2.710.072,5 at markup 1 => policy price 5.420.145; presented cost rounds half-up to 2.710.073.
    const spec = { currency: 'CLP' as const, lines: [{ lineId: 'care', cost: '2710072.5', minimumMargin: '0.4' }] }
    const rounded = calc11({ ...spec, multiple: '10000' })

    expect(rounded.lines[0]).toMatchObject({
      cost: '2710073',
      undiscountedPrice: '5430000',
      roundingAdjustment: '9855',
      discount: '0',
      uplift: '0',
      net: '5430000'
    })

    const agreed = calc11({
      ...spec,
      multiple: '10000',
      adjustments: [
        { adjustmentId: 'x', kind: 'agreed_net', amount: '4990000', billing: 'monthly', lineIds: ['care'], reason: 'r' }
      ]
    })

    expect(agreed.totals).toMatchObject({
      undiscountedPrice: '5430000',
      roundingAdjustment: '9855',
      discount: '440000',
      uplift: '0',
      net: '4990000',
      marginAmount: '2279927'
    })
    expect(agreed.reviewStatus).toBe('within_policy') // 2.279.927 / 4.990.000 = 45,7 % over a 40 % floor
  })

  it.each(['CLP', 'USD'] as const)(
    '%s: every priced row is raised to a multiple, never lowered; zero prices are left alone; the identity holds',
    currency => {
      const random = seeded(currency === 'CLP' ? 11 : 12)
      let raised = 0

      for (let index = 0; index < 60; index++) {
        const multiple = random.pick(MULTIPLES[currency])

        const lines: LineSpec[] = [
          { lineId: 'a', cost: randomCost(random, currency), setup: randomCost(random, currency), rate: '0.6' },
          { lineId: 'b', cost: randomCost(random, currency), rate: '0.25' },
          { lineId: 'free', cost: '0' }
        ]

        const spec = { currency, periods: 2, lines }
        const policy = policyRows(spec)
        const result = calc11({ ...spec, multiple })
        const step = minor(multiple, currency)

        expect(result.lines).toHaveLength(policy.size)

        for (const row of result.lines) {
          const before = minor(policy.get(row.lineId)!.undiscountedPrice, currency)
          const after = minor(row.undiscountedPrice, currency)

          // Markup 0.6 and 0.25 are far above the zero floor, so the smallest compliant multiple is the next one.
          expect(after).toBe(ceilTo(before, step))
          expect(after % step).toBe(0n)
          expect(after >= before).toBe(true)
          expect(minor(row.roundingAdjustment, currency)).toBe(after - before)
          expect(row.cost).toBe(policy.get(row.lineId)!.cost)
          expect(minor(row.net, currency)).toBe(after)
          if (after > before) raised++
        }

        const free = result.lines.filter(row => row.parentLineId === 'free')

        expect(free.length).toBe(2)
        expect(free.every(row => minor(row.undiscountedPrice, currency) === 0n)).toBe(true)

        for (const key of ['undiscountedPrice', 'roundingAdjustment', 'net', 'cost'] as const)
          expect(minor(result.totals![key], currency)).toBe(sum(result.lines.map(row => minor(row[key], currency))))
      }

      expect(raised).toBeGreaterThan(100)
    }
  )

  it('rounding happens before the adjustments: a rate and an agreed net both work on the rounded price', () => {
    const spec = {
      currency: 'CLP' as const,
      multiple: '10000',
      lines: [
        { lineId: 'a', cost: '1234567' }, // 2.469.134 -> 2.470.000
        { lineId: 'b', cost: '765432.5' } // 1.530.865 -> 1.540.000
      ]
    }

    const discounted = calc11({
      ...spec,
      adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.1', lineIds: ['a', 'b'], reason: 'r' }]
    })

    expect(discounted.totals).toMatchObject({ undiscountedPrice: '4010000', discount: '401000', net: '3609000' })

    const agreed = calc11({
      ...spec,
      adjustments: [
        {
          adjustmentId: 'n',
          kind: 'agreed_net',
          amount: '4100000',
          billing: 'monthly',
          lineIds: ['a', 'b'],
          reason: 'r'
        }
      ]
    })

    expect(agreed.totals).toMatchObject({
      undiscountedPrice: '4010000',
      roundingAdjustment: '10001',
      discount: '0',
      uplift: '90000',
      net: '4100000'
    })
  })

  it.each([
    ['CLP', '0.5', false],
    ['CLP', '2500', true],
    ['USD', '0.005', false],
    ['USD', '0.125', false],
    ['USD', '0.25', true]
  ] as const)('%s: a multiple of %s is a whole number of currency units: %s', (currency, multiple, valid) => {
    const result = calc({ contract: '1.1.0', currency, multiple, lines: [{ lineId: 'a', cost: '1000' }] })

    if (valid) {
      expect(result.calculationStatus).toBe('calculated')
    } else {
      expect(result.calculationStatus).toBe('invalid')
      expect(result.diagnostics.map(item => [item.code, item.fieldPath, item.severity])).toEqual([
        ['INVALID_PRICE_ROUNDING', 'snapshot.priceRounding.multiple', 'error']
      ])
    }
  })

  it('the rule is a sourced record like any other: stale withholds the calculation, estimated asks for review', () => {
    const input = (edit: (rule: { source: Record<string, string> }) => void) => {
      const built = build({
        contract: '1.1.0',
        currency: 'CLP',
        multiple: '1000',
        lines: [{ lineId: 'a', cost: '1000' }]
      })

      edit(built.snapshot.priceRounding as { source: Record<string, string> })

      return calculatePricingV3(built)
    }

    const stale = input(rule => {
      rule.source = { ...source, effectiveUntil: '2026-03-31' }
    })

    expect(stale.calculationStatus).toBe('needs_input')
    expect(stale.diagnostics.map(item => [item.code, item.fieldPath])).toEqual([
      ['STALE_SOURCE', 'snapshot.priceRounding']
    ])

    const estimated = input(rule => {
      rule.source = { ...source, status: 'estimated' }
    })

    expect(estimated.calculationStatus).toBe('calculated')
    expect(estimated.reviewStatus).toBe('requires_review')
    expect(codes(estimated)).toEqual(['ESTIMATED_SOURCE'])
  })
})

describe('Floor conservation: rounding never turns a compliant row into a flagged one', () => {
  // Target margins equal to the floor. Several have a non-terminating 1 / (1 - rate), the case that used to flag
  // rows by a fraction of a peso because cost and price are rounded separately.
  const RATES = ['0.45', '0.3', '0.35', '0.4', '0.15', '0.55', '0.333333', '0.07', '0.62'] as const

  type Case = { spec: Omit<Spec, 'contract'>; multiple: string }

  const generate = (seed: number, count: number, rate: () => { rate: string; minimumMargin: string }): Case[] => {
    const random = seeded(seed)

    return Array.from({ length: count }, () => {
      const currency = random.pick(['CLP', 'USD'] as const)
      const converts = random.int(0, 2) === 0
      const calculationCurrency = converts ? (currency === 'CLP' ? 'USD' : 'CLP') : currency

      const fxRate = !converts
        ? undefined
        : currency === 'CLP'
          ? money(BigInt(random.int(85_000, 105_000)), 'USD') // CLP per USD, two decimals
          : `0.00${random.int(95, 118)}` // USD per CLP

      const lines = ['a', 'b', 'c', 'd'].slice(0, random.int(1, 4)).map(lineId => ({
        lineId,
        cost: randomCost(random, calculationCurrency),
        ...(random.int(0, 1) ? { setup: randomCost(random, calculationCurrency) } : {}),
        method: 'target_margin' as const,
        ...rate()
      }))

      return {
        multiple: random.pick(FLOOR_MULTIPLES[currency]),
        spec: { currency, calculationCurrency, fxRate, periods: random.int(1, 2), lines }
      }
    })
  }

  const flagged = (result: ReturnType<typeof calculatePricingV3>) =>
    result.diagnostics.filter(item => item.code === 'MARGIN_BELOW_FLOOR').map(item => item.fieldPath)

  it('target margin equal to the floor: with the rule no row is flagged; without it many are', () => {
    const cases = generate(4500, 400, () => {
      const rate = seededRate()

      return { rate, minimumMargin: rate }
    })

    let flaggedWithoutRule = 0
    let rows = 0
    let liftedBeyondNextMultiple = 0

    for (const { spec, multiple } of cases) {
      const { currency } = spec
      const plain = calc({ ...spec, contract: '1.1.0' })
      const policy = policyRows(spec)

      expect(plain.calculationStatus).toBe('calculated')
      if (flagged(plain).length > 0) flaggedWithoutRule++

      const result = calc({ ...spec, contract: '1.1.0', multiple }) as PricingV3ResultV11
      const step = minor(multiple, currency)

      expect(result.calculationStatus).toBe('calculated')
      expect(flagged(result)).toEqual([])
      expect(result.reviewStatus).toBe('within_policy')

      for (const row of result.lines) {
        const price = minor(policy.get(row.lineId)!.undiscountedPrice, currency)
        const cost = minor(row.cost, currency)
        const rounded = minor(row.undiscountedPrice, currency)

        // The smallest multiple that is not below the policy price AND keeps the floor on the presented amounts.
        expect(rounded % step).toBe(0n)
        expect(rounded >= price).toBe(true)
        expect(meetsFloor(rounded, cost, row.minimumMargin)).toBe(true)
        expect(rounded - step < price || !meetsFloor(rounded - step, cost, row.minimumMargin)).toBe(true)
        expect(minor(row.roundingAdjustment, currency)).toBe(rounded - price)
        if (rounded > ceilTo(price, step)) liftedBeyondNextMultiple++
        rows++
      }
    }

    // The defect this guards against must be visible to the test: without the rule a large share of the very same
    // inputs is flagged. And the conservation branch (one multiple further than plain rounding) must be exercised.
    expect(rows).toBeGreaterThan(1000)
    expect(flaggedWithoutRule / cases.length).toBeGreaterThan(0.4)
    expect(liftedBeyondNextMultiple).toBeGreaterThan(10)
  })

  it('a policy under its floor is not rescued: it gets the plain next multiple and stays flagged unless that clears it', () => {
    // Target 30 % against a 45 % floor, and 10 % against 12 % (close enough for a coarse multiple to clear it).
    const pairs = [
      { rate: '0.3', minimumMargin: '0.45' },
      { rate: '0.1', minimumMargin: '0.12' }
    ]

    let pairIndex = 0
    const cases = generate(3045, 300, () => pairs[pairIndex++ % pairs.length])
    let stillFlagged = 0
    let cleared = 0

    for (const { spec, multiple } of cases) {
      const { currency } = spec
      const policy = policyRows(spec)
      const result = calc({ ...spec, contract: '1.1.0', multiple }) as PricingV3ResultV11
      const step = minor(multiple, currency)
      const expected: string[] = []

      expect(result.calculationStatus).toBe('calculated')

      for (const row of result.lines) {
        const price = minor(policy.get(row.lineId)!.undiscountedPrice, currency)
        const rounded = minor(row.undiscountedPrice, currency)

        expect(rounded).toBe(ceilTo(price, step))

        if (meetsFloor(rounded, minor(row.cost, currency), row.minimumMargin)) cleared++
        else expected.push(`result.lines.${row.lineId}`)
      }

      expect(flagged(result)).toEqual(expected)
      stillFlagged += expected.length
    }

    expect(stillFlagged).toBeGreaterThan(500)
    expect(cleared).toBeGreaterThan(10)
  })

  // Deterministic rate sequence for the first property (kept apart from the case generator's own stream).
  const rateStream = seeded(77)
  const seededRate = () => rateStream.pick(RATES)
})

describe('Replay, comparison and client projection of a 1.1.0 artifact', () => {
  const input = () =>
    build({
      contract: '1.1.0',
      currency: 'CLP',
      multiple: '10000',
      lines: [
        { lineId: 'a', cost: '1234567', setup: '200000' },
        { lineId: 'b', cost: '765432.5' }
      ],
      adjustments: [
        {
          adjustmentId: 'n',
          kind: 'agreed_net',
          amount: '4100000',
          billing: 'monthly',
          lineIds: ['a', 'b'],
          reason: 'r'
        }
      ]
    })

  it('a 1.1.0 artifact verifies and carries the engine of its contract; a 1.0.0 artifact still verifies', () => {
    const artifact = runPricingV3(input(), '2026-10-10').artifact!

    expect(artifact.semantic.engineVersion).toBe(PRICING_V3_ENGINES['1.1.0'])
    expect(artifact.semantic.result.engineVersion).toBe(PRICING_V3_ENGINES['1.1.0'])
    expect(replayPricingV3(JSON.parse(JSON.stringify(artifact))).replayDigest).toBe(artifact.replayDigest)

    const legacy = runPricingV3(fixture(), '2026-10-10').artifact!

    expect(legacy.semantic.engineVersion).toBe(PRICING_V3_ENGINES['1.0.0'])
    expect(replayPricingV3(JSON.parse(JSON.stringify(legacy))).replayDigest).toBe(legacy.replayDigest)
  })

  it('an unregistered engine, another registered engine, or a touched amount is REPLAY_MISMATCH', async () => {
    const { createHash } = await import('node:crypto')
    const artifact = runPricingV3(input(), '2026-10-10').artifact!

    const resign = (item: typeof artifact) => {
      item.replayDigest = createHash('sha256').update(stableJson(item.semantic)).digest('hex')
      item.calculationId = `local-${item.replayDigest.slice(0, 24)}`
    }

    const tampered: ((item: typeof artifact) => void)[] = [
      item => {
        item.semantic.engineVersion = 'pricing-v3-local/9.9.9'
      },
      // Even with a self-consistent digest: the registry, not the digest, decides which engines exist.
      item => {
        item.semantic.engineVersion = 'pricing-v3-local/9.9.9'
        resign(item)
      },
      // A registered engine that is not the one of this input's contract.
      item => {
        item.semantic.engineVersion = PRICING_V3_ENGINES['1.0.0']
        resign(item)
      },
      item => {
        ;(item.semantic.result as PricingV3ResultV11).lines[0].uplift = '1'
        resign(item)
      },
      item => {
        ;(item.semantic.input.request.adjustments[0] as { amount: string }).amount = '4100001'
      }
    ]

    for (const mutate of tampered) {
      const changed = structuredClone(artifact)

      mutate(changed)
      expect(() => replayPricingV3(changed)).toThrow('REPLAY_MISMATCH')
    }
  })

  it('comparison reports the 1.1.0 amounts only when both sides carry them', () => {
    const a = runPricingV3(input()).artifact!

    const other = input()

    ;(other.request.adjustments[0] as { amount: string }).amount = '4000000'
    const b = runPricingV3(other).artifact!

    expect(comparePricingV3(a, b).differences).toEqual({
      cost: '0',
      undiscountedPrice: '0',
      roundingAdjustment: '0',
      discount: '10000', // 4.010.000 rounded monthly price against an agreed 4.000.000
      uplift: '-90000',
      net: '-100000',
      marginAmount: '-100000'
    })

    const legacy = runPricingV3(fixture()).artifact!

    expect(Object.keys(comparePricingV3(legacy, legacy).differences!)).toEqual([
      'cost',
      'undiscountedPrice',
      'discount',
      'net',
      'marginAmount'
    ])
  })

  it('the client view shows the final net and none of the internal breakdown', () => {
    const artifact = runPricingV3(input()).artifact!
    const result = artifact.semantic.result as PricingV3ResultV11

    expect(result.reviewStatus).toBe('within_policy')
    // The breakdown exists internally, so its absence from the view is the projection's doing.
    expect(minor(result.totals!.roundingAdjustment, 'CLP')).toBeGreaterThan(0n)
    expect(minor(result.totals!.uplift, 'CLP')).toBeGreaterThan(0n)

    const view = projectPricingV3ForClient(artifact)
    const output = JSON.stringify(view)

    for (const internal of [
      'roundingAdjustment',
      'uplift',
      'discount',
      'undiscountedPrice',
      'priceRounding',
      'multiple',
      'agreed_net',
      'cost',
      'margin'
    ])
      expect(output).not.toContain(internal)

    expect(view.net).toBe(result.totals!.net)
    expect(view.schedule.map(row => row.net)).toEqual(result.lines.map(row => row.net))
    expect(sum(view.schedule.map(row => minor(row.net, 'CLP')))).toBe(minor(view.net, 'CLP'))
  })
})
