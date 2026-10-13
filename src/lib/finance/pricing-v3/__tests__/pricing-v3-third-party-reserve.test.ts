// Contract 1.4.0 in the kernel: third-party costs of an engagement and the contingency reserve.
//
// Every input is built here, so each amount of a case is known. Expected amounts come from one of three places,
// never from a previous run of the code under test:
//   - exact integer arithmetic (BigInt minor units) over the inputs of the case;
//   - the same economic input priced WITHOUT the capability (no third-party cost, no reserve) by the same kernel,
//     whose earlier contracts are frozen and guarded by the artifact corpus (`pricing-v3-frozen-artifacts.test.ts`);
//   - an identity the contract states (the walk of a row, each total as the sum of its rows, own work as the rest).
//
// The rates used here are not the ones the catalog issues: nothing may depend on a particular category or percentage.
import DecimalJs from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { comparePricingV3, replayPricingV3, runPricingV3 } from '../adapters/local-snapshot'
import { calculatePricingV3, PRICING_V3_PRECISION_POLICIES } from '../calculate'
import { projectPricingV3ForClient } from '../projection'
import { PRICING_V3_ENGINES } from '../schemas'

// Wide enough to read a stored ratio (80 significant digits) and to divide two integers without losing a digit of it.
const Decimal = DecimalJs.clone({ precision: 200, rounding: DecimalJs.ROUND_HALF_UP })
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

type Contract = keyof typeof PRICING_V3_ENGINES
type Currency = 'CLP' | 'USD' | 'EUR'
type Result = ReturnType<typeof calculatePricingV3>
type Component = {
  componentId: string
  kind: string
  cost: string
  price: string
  cashCommitment: string
  trace: Record<string, string>
}

type AnyRow = Record<string, string> & {
  lineId: string
  parentLineId: string
  kind: string
  periodId: number
  components: Component[]
}

const PRECISION: Record<Currency, number> = { CLP: 0, USD: 2, EUR: 2 }
const ROW_KEYS_14 = ['contingencyReserve'] as const

const TOTAL_KEYS_14 = [
  'contingencyReserve',
  'contingencyBase',
  'contingencyReserveWaived',
  'thirdPartyCost',
  'thirdPartyNet',
  'ownWorkMarginRate'
] as const

const amounts = (totals: unknown) => totals as Record<string, string>
const rowsOf = (result: Result) => result.lines as unknown as AnyRow[]
const codes = (result: Result) => result.diagnostics.map(item => item.code)
const teamRows = (result: Result) => rowsOf(result).filter(row => row.kind !== 'third_party')
const thirdPartyRows = (result: Result) => rowsOf(result).filter(row => row.kind === 'third_party')
const row = (result: Result, lineId: string) => rowsOf(result).find(item => item.lineId === lineId)!

const flagged = (result: Result) =>
  result.diagnostics
    .filter(item => item.code === 'MARGIN_BELOW_FLOOR')
    .map(item => item.fieldPath.replace('result.lines.', ''))
    .sort()

// ---- exact integer arithmetic ----

const scaleOf = (value: string) => (value.split('.')[1] ?? '').length

/** Decimal string -> integer count of 10^-scale. */
const scaled = (value: string, scale: number) => {
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')

  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) throw new RangeError(`${value} @ ${scale}`)

  const magnitude = BigInt(whole + fraction.slice(0, scale).padEnd(scale, '0'))

  return negative ? -magnitude : magnitude
}

/** Minor units of an amount as the kernel formatted it. */
const minor = (value: string) => scaled(value, scaleOf(value))
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, 0n)
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b
const UNIT = 10n ** 18n
const fraction = (value: string) => scaled(value, 18)

/** A finite decimal as an exact integer over a power of ten; products stay exact. */
type Exact = { n: bigint; scale: number }

const exact = (value: string): Exact => ({ n: scaled(value, scaleOf(value)), scale: scaleOf(value) })
const times = (...values: Exact[]) => values.reduce((a, b) => ({ n: a.n * b.n, scale: a.scale + b.scale }))

/** Minor units of the exact rational n / d (both over 10^-scale units), half up at `precision` decimals. */
const ratioHalfUp = (numerator: Exact, denominator: Exact, precision: number) => {
  // numerator / denominator x 10^precision, as one integer quotient rounded half up.
  const n = numerator.n * 10n ** BigInt(denominator.scale + precision)
  const d = denominator.n * 10n ** BigInt(numerator.scale)

  return (2n * n + d) / (2n * d)
}

const halfUp = (value: Exact, precision: number) => ratioHalfUp(value, { n: 1n, scale: 0 }, precision)

/** The floor every contract states with rho = 1: cost / (1 - minimumMargin), raised to the currency unit. */
const floorNetOf = (cost: bigint, minimumMargin: string) => ceilDiv(cost * UNIT, UNIT - fraction(minimumMargin))

/** Exact verdict of the control: no net, or (net - cost) / net under the minimum. */
const underFloor = (net: bigint, cost: bigint, minimumMargin: string) =>
  net === 0n || (net - cost) * UNIT < fraction(minimumMargin) * net

/**
 * The walk of a 1.4.0 row and of 1.4.0 totals, exact at every step. `base` is the price of the base market at
 * engagement ratio 1, given by the caller. A third-party row walks the same identity with both adjustments at zero.
 */
const expectWalk = (amount: Record<string, string>, base: bigint) => {
  expect(minor(amount.undiscountedPrice)).toBe(
    base + minor(amount.marketAdjustment) + minor(amount.engagementAdjustment) + minor(amount.roundingAdjustment)
  )
  expect(minor(amount.net)).toBe(minor(amount.undiscountedPrice) + minor(amount.uplift) - minor(amount.discount))
  expect(minor(amount.marginAmount)).toBe(minor(amount.net) - minor(amount.cost))
}

/** Base-market price at ratio 1 of a row, by the identity the contract states for its stored amounts. */
const basePriceOf = (item: Record<string, string>) =>
  minor(item.undiscountedPrice) -
  minor(item.roundingAdjustment) -
  minor(item.engagementAdjustment) -
  minor(item.marketAdjustment)

/** Every total of a 1.4.0 result is the sum of its rows, and own work is the rest of the quote. */
const expectTotals = (result: Result) => {
  const all = rowsOf(result)
  const totals = amounts(result.totals)
  const third = thirdPartyRows(result)

  for (const key of [
    'cost',
    'contingencyReserve',
    'marketAdjustment',
    'engagementAdjustment',
    'undiscountedPrice',
    'roundingAdjustment',
    'discount',
    'uplift',
    'net',
    'marginAmount'
  ])
    expect(minor(totals[key]), key).toBe(sum(all.map(item => minor(item[key]))))

  expect(minor(totals.thirdPartyCost)).toBe(sum(third.map(item => minor(item.cost))))
  expect(minor(totals.thirdPartyNet)).toBe(sum(third.map(item => minor(item.net))))
  expectWalk(totals, sum(all.map(basePriceOf)))

  const ownNet = minor(totals.net) - minor(totals.thirdPartyNet)
  const ownCost = minor(totals.cost) - minor(totals.thirdPartyCost)

  // ownWorkMarginRate = ((net - thirdPartyNet) - (cost - thirdPartyCost)) / (net - thirdPartyNet), as stored.
  if (ownNet === 0n) expect(totals.ownWorkMarginRate).toBeNull()
  else
    expect(new Decimal(totals.ownWorkMarginRate).toFixed(30)).toBe(
      new Decimal((ownNet - ownCost).toString()).div(ownNet.toString()).toFixed(30)
    )

  expect(sum(third.map(item => minor(item.contingencyReserve)))).toBe(0n)
}

// ---- kernel inputs ----

const source = {
  reference: 'third-party-reserve-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '2026-12-31',
  status: 'confirmed'
}

type LineSpec = {
  lineId: string
  /** Monthly human cost. */
  cost: string
  /** Monthly resources of the row; neither takes a market factor. */
  tool?: string
  fee?: string
  /** One-time resource: its own row, with no human component. */
  setup?: string
  method?: 'markup' | 'target_margin'
  rate?: string
  basis?: 'all_costs' | 'human'
  minimumMargin?: string
}

type CostSpec = {
  costId: string
  category: string
  amount: string
  currency?: Currency
  quantity?: string
  periodIds?: number[]
  label?: string
  source?: unknown
}

type PolicySpec = {
  category: string
  method?: 'markup' | 'target_margin'
  rate: string
  minimumMargin?: string
  rounding?: 'commercial' | 'none'
  source?: unknown
}

type Spec = {
  contract: Contract
  currency: Currency
  lines: LineSpec[]
  periods?: number
  /** Team costs are denominated here; defaults to the output currency (no conversion). */
  calculationCurrency?: Currency
  fxRate?: string
  extraFx?: { from: string; to: string; rate: string }[]
  factor?: string
  floorBasis?: boolean
  multiple?: string
  adjustments?: unknown[]
  form?: string
  forms?: { form: string; priceRatio: string }[]
  costs?: CostSpec[]
  policies?: PolicySpec[]
  reserve?: { rate: string; base: 'human' | 'own_costs'; source?: unknown }
  waiver?: string
}

const MONTHLY = [
  ['tool', 'tool'],
  ['fee', 'platform_fee']
] as const

// Rules of the test, by category. None is a rate the catalog issues.
const POLICIES: PolicySpec[] = [
  { category: 'production', method: 'markup', rate: '0.20', minimumMargin: '0.10', rounding: 'commercial' },
  { category: 'printing', method: 'target_margin', rate: '0.25', minimumMargin: '0.20', rounding: 'commercial' },
  { category: 'media', method: 'markup', rate: '0', minimumMargin: '0', rounding: 'none' },
  { category: 'talent', method: 'markup', rate: '0.07', minimumMargin: '0.03', rounding: 'none' }
]

// The offer is sold in CO and talent sits in CL, so the market factor and the other effects are told apart.
const build = (spec: Spec) => {
  const calculation = spec.calculationCurrency ?? spec.currency

  return {
    request: {
      schemaVersion: spec.contract,
      quoteDate: '2026-06-15',
      offerId: 'offer',
      deliveryModel: 'staffing',
      engagementCode: 'monthly',
      ...(spec.form ? { engagementForm: spec.form } : {}),
      offerMarketCountry: 'CO',
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
        assignments: [
          ...MONTHLY.flatMap(([key]) =>
            line[key]
              ? [
                  {
                    resourceId: `${key}-${line.lineId}`,
                    allocationId: `${key}-allocation-${line.lineId}`,
                    scope: 'person',
                    scopeRef: line.lineId,
                    quantity: '1',
                    share: '1',
                    cashTiming: 'monthly'
                  }
                ]
              : []
          ),
          ...(line.setup
            ? [
                {
                  resourceId: `setup-${line.lineId}`,
                  allocationId: `setup-allocation-${line.lineId}`,
                  scope: 'account',
                  scopeRef: `account-${line.lineId}`,
                  quantity: '1',
                  share: '1',
                  cashTiming: 'start'
                }
              ]
            : [])
        ],
        notApplicable: []
      })),
      adjustments: spec.adjustments ?? [],
      taxTreatment: { kind: 'not_resolved' },
      ...(spec.costs
        ? {
            thirdPartyCosts: spec.costs.map(cost => ({
              costId: cost.costId,
              label: cost.label ?? `Costo ${cost.costId}`,
              category: cost.category,
              amount: cost.amount,
              currency: cost.currency ?? spec.currency,
              quantity: cost.quantity ?? '1',
              periodIds: cost.periodIds ?? [1],
              source: cost.source ?? source
            }))
          }
        : {}),
      ...(spec.waiver ? { contingencyWaiver: { reason: spec.waiver } } : {})
    },
    snapshot: {
      schemaVersion: spec.contract,
      snapshotId: 'third-party-reserve',
      version: 'test',
      mode: 'synthetic',
      calculationCurrency: calculation,
      countries: ['CL', 'CO'],
      currencies: (Object.keys(PRECISION) as Currency[]).map(code => ({ code, precision: PRECISION[code] })),
      profiles: spec.lines.map(line => ({
        profileId: `profile-${line.lineId}`,
        label: `Perfil ${line.lineId}`,
        seniorityCode: 'senior',
        tierCode: 'tier',
        cost: {
          amount: line.cost,
          currency: calculation,
          source,
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
        method: line.method ?? 'target_margin',
        rate: line.rate ?? '0.5',
        basis: line.basis ?? 'all_costs',
        minimumMargin: line.minimumMargin ?? '0.45',
        source
      })),
      talentFactors: [],
      marketFactors: [
        { country: 'CO', factor: spec.factor ?? '1', ...(spec.floorBasis ? { floorBasis: 'base_market' } : {}), source }
      ],
      ...(spec.forms ? { engagementFactors: spec.forms.map(item => ({ source, ...item })) } : {}),
      resources: spec.lines.flatMap(line => [
        ...MONTHLY.flatMap(([key, kind]) =>
          line[key]
            ? [
                {
                  amount: line[key],
                  currency: calculation,
                  source,
                  resourceId: `${key}-${line.lineId}`,
                  label: `${key} ${line.lineId}`,
                  kind,
                  unit: 'month',
                  scope: 'person',
                  covers: [`${key}-${line.lineId}`]
                }
              ]
            : []
        ),
        ...(line.setup
          ? [
              {
                amount: line.setup,
                currency: calculation,
                source,
                resourceId: `setup-${line.lineId}`,
                label: `Implementación ${line.lineId}`,
                kind: 'setup',
                unit: 'once',
                scope: 'account',
                covers: [`setup-${line.lineId}`]
              }
            ]
          : [])
      ]),
      fx: [
        ...(spec.fxRate ? [{ from: calculation, to: spec.currency, rate: spec.fxRate, source }] : []),
        ...(spec.extraFx ?? []).map(item => ({ ...item, source }))
      ],
      ...(spec.multiple ? { priceRounding: { multiple: spec.multiple, source } } : {}),
      ...(spec.policies
        ? {
            thirdPartyPolicies: spec.policies.map(item => ({
              category: item.category,
              method: item.method ?? 'markup',
              rate: item.rate,
              minimumMargin: item.minimumMargin ?? '0',
              rounding: item.rounding ?? 'none',
              source: item.source ?? source
            }))
          }
        : {}),
      ...(spec.reserve ? { contingencyReserve: { source, ...spec.reserve } } : {})
    }
  }
}

const STANDARD_FORMS = [
  { form: 'on_going', priceRatio: '1' },
  { form: 'on_demand', priceRatio: '1.10' }
]

/** A case that must calculate: no blocker, whatever it has under review. */
const calc = (spec: Spec) => {
  const result = calculatePricingV3(build(spec))

  expect(result.diagnostics.filter(item => item.severity !== 'review')).toEqual([])
  expect(result.calculationStatus).toBe('calculated')

  return result
}

const person = (lineId = 'a', extra: Partial<LineSpec> = {}): LineSpec => ({ lineId, cost: '1000000', ...extra })

// ---------------------------------------------------------------------------------------------------------------

describe('the kernel contract: the keys of 1.4.0 exist only in 1.4.0', () => {
  const lines = [person()]
  const cost: CostSpec = { costId: 'media', category: 'media', amount: '500000' }

  const newInputs: [string, Partial<Spec>][] = [
    ['a third-party cost', { costs: [cost], policies: POLICIES }],
    ['an empty list of third-party costs', { costs: [] }],
    ['third-party policies', { policies: POLICIES }],
    ['a contingency reserve', { reserve: { rate: '0.15', base: 'human' } }],
    ['a contingency waiver', { waiver: 'agreed' }],
    [
      'an agreed net of third-party costs',
      {
        adjustments: [
          { adjustmentId: 'x', kind: 'agreed_net', amount: '1', billing: 'third_party', lineIds: ['a'], reason: 'r' }
        ]
      }
    ]
  ]

  it.each(['1.0.0', '1.1.0', '1.2.0', '1.3.0'] as const)(
    'contract %s rejects every 1.4.0 key instead of reinterpreting it',
    contract => {
      for (const [name, extra] of newInputs) {
        // 1.0.0 has no agreed net at all; the case is the same rejection.
        const result = calculatePricingV3(build({ contract, currency: 'CLP', lines, ...extra }))

        expect(result.calculationStatus, name).toBe('invalid')
        expect([...new Set(codes(result))], name).toEqual(['INVALID_INPUT'])
        expect(result.engineVersion).toBe(PRICING_V3_ENGINES[contract])
        expect(result.lines).toEqual([])
        expect(result.totals).toBeNull()
      }
    }
  )

  it.each(['1.0.0', '1.1.0', '1.2.0', '1.3.0'] as const)(
    'a %s result carries none of the 1.4.0 keys, in rows or totals (absent, not zero)',
    contract => {
      const result = calc({ contract, currency: 'CLP', lines: [person('a', { setup: '50000' })] })

      expect(rowsOf(result).length).toBe(2)
      for (const item of rowsOf(result)) for (const key of ROW_KEYS_14) expect(item).not.toHaveProperty(key)
      for (const key of TOTAL_KEYS_14) expect(result.totals).not.toHaveProperty(key)
      expect(JSON.stringify(result)).not.toMatch(/third_party|thirdParty|contingency/i)
    }
  )

  it('1.4.0 takes each of them and is signed by its own engine, with its own precision policy', () => {
    const result = calc({
      contract: '1.4.0',
      currency: 'CLP',
      lines,
      costs: [cost],
      policies: POLICIES,
      reserve: { rate: '0.15', base: 'human' }
    })

    expect(result.engineVersion).toBe('pricing-v3-local/1.4.0')
    expect(result.precisionPolicy).toBe(PRICING_V3_PRECISION_POLICIES['1.4.0'])
    expect(new Set(Object.values(PRICING_V3_PRECISION_POLICIES)).size).toBe(Object.keys(PRICING_V3_ENGINES).length)
    for (const item of rowsOf(result)) for (const key of ROW_KEYS_14) expect(item).toHaveProperty(key)
    for (const key of TOTAL_KEYS_14) expect(result.totals).toHaveProperty(key)
  })

  it('a 1.3.0 input relabelled 1.4.0 is valid and prices the same: nothing third-party, nothing reserved', () => {
    const spec: Spec = {
      contract: '1.3.0',
      currency: 'USD',
      calculationCurrency: 'CLP',
      fxRate: '0.00105',
      lines: [person('a', { tool: '250000', setup: '50000' }), person('b', { cost: '777777', fee: '33333' })],
      factor: '0.9',
      floorBasis: true,
      multiple: '10',
      form: 'on_demand',
      forms: STANDARD_FORMS,
      adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.07', lineIds: ['b'], reason: 'r' }]
    }

    const before = calc(spec)
    const after = calc({ ...spec, contract: '1.4.0' })

    expect(after.engineVersion).toBe(PRICING_V3_ENGINES['1.4.0'])
    expect(after.diagnostics).toEqual(before.diagnostics)

    for (const item of rowsOf(after)) {
      const { contingencyReserve, ...rest } = item

      expect(contingencyReserve).toBe('0.00')
      expect(rest).toEqual(row(before, item.lineId))
    }

    const { contingencyReserve, contingencyBase, contingencyReserveWaived, thirdPartyCost, thirdPartyNet, ...rest } =
      amounts(after.totals)

    expect([contingencyReserve, contingencyBase, contingencyReserveWaived, thirdPartyCost, thirdPartyNet]).toEqual(
      Array(5).fill('0.00')
    )
    // With no third-party row, own work is the whole quote.
    expect(rest.ownWorkMarginRate).toBe(before.totals!.marginRate)
    expect({ ...rest, ownWorkMarginRate: undefined }).toEqual({ ...before.totals, ownWorkMarginRate: undefined })
  })

  it('the schema bounds what a request and a snapshot may state', () => {
    const invalid = (extra: Partial<Spec>, edit?: (input: ReturnType<typeof build>) => void) => {
      const input = build({ contract: '1.4.0', currency: 'CLP', lines, policies: POLICIES, ...extra })

      edit?.(input)

      const result = calculatePricingV3(input)

      expect(result.calculationStatus).toBe('invalid')
      expect([...new Set(codes(result))]).toEqual(['INVALID_INPUT'])
    }

    for (const amount of ['0', '-1', '1,5', 'abc', '']) invalid({ costs: [{ ...cost, amount }] })
    for (const quantity of ['0', '-1', '1.5', '10000', '']) invalid({ costs: [{ ...cost, quantity }] })
    invalid({ costs: [{ ...cost, periodIds: [] }] })
    invalid({ costs: [{ ...cost, periodIds: [0] }] })
    invalid({ costs: [{ ...cost, label: '' }] })
    invalid({ costs: [cost] }, input => Object.assign(input.request.thirdPartyCosts![0], { supplier: 'Proveedor' }))
    invalid({ costs: Array.from({ length: 51 }, (_, i) => ({ ...cost, costId: `c${i}` })) })
    invalid({ policies: [{ category: 'media', rate: '0', rounding: 'nearest' as never }] })
    invalid({ policies: [{ category: 'media', rate: '0', minimumMargin: '1' }] })
    invalid({ policies: [{ category: 'media', rate: '0', method: 'pass_through' as never }] })
    for (const rate of ['0', '1', '1.5', '-0.1', '']) invalid({ reserve: { rate, base: 'human' } })
    invalid({ reserve: { rate: '0.1', base: 'third_party' as never } })
    invalid({ reserve: { rate: '0.1', base: 'human' } }, input =>
      Object.assign(input.request, { contingencyWaiver: { reason: '' } })
    )
    invalid({ reserve: { rate: '0.1', base: 'human' } }, input =>
      Object.assign(input.snapshot.contingencyReserve!, { label: 'Reserva' })
    )
  })
})

describe('third-party rows, from inputs small enough to derive by hand', () => {
  // Line a: 1.000.000 at target margin 0,5 -> 2.000.000. Three costs, one per kind of rule:
  //   prod   800.000 x 1, markup 0,20         -> 960.000   floor 10 %: 800.000 / 0,9  = 888.888,9 -> 888.889
  //   print  150.000 x 3, target margin 0,25  -> 600.000   floor 20 %: 450.000 / 0,8  = 562.500
  //   media  333.333 x 3, at cost             -> 999.999   floor  0 %: 999.999
  const spec = (extra: Partial<Spec> = {}): Spec => ({
    contract: '1.4.0',
    currency: 'CLP',
    lines: [person()],
    costs: [
      { costId: 'prod', category: 'production', amount: '800000', label: 'Producción audiovisual' },
      { costId: 'print', category: 'printing', amount: '150000', quantity: '3' },
      { costId: 'media', category: 'media', amount: '333333', quantity: '3' }
    ],
    policies: POLICIES,
    ...extra
  })

  const expected = {
    'prod:1:third_party': { cost: 800_000n, price: 960_000n, minimum: '0.10', floor: 888_889n },
    'print:1:third_party': { cost: 450_000n, price: 600_000n, minimum: '0.20', floor: 562_500n },
    'media:1:third_party': { cost: 999_999n, price: 999_999n, minimum: '0', floor: 999_999n }
  } as const

  const result = calc(spec())

  it('each cost is a row of its own: cost, price under the rule of its category, margin and floor', () => {
    expect(
      rowsOf(result)
        .map(item => item.lineId)
        .sort()
    ).toEqual(['a:1:monthly', ...Object.keys(expected)].sort())

    for (const [lineId, want] of Object.entries(expected)) {
      const got = row(result, lineId)

      expect(got.kind).toBe('third_party')
      expect(got.parentLineId).toBe(lineId.split(':')[0])
      expect(got.periodId).toBe(1)
      expect(minor(got.cost)).toBe(want.cost)
      expect(minor(got.undiscountedPrice)).toBe(want.price)
      expect(minor(got.net)).toBe(want.price)
      expect(minor(got.marginAmount)).toBe(want.price - want.cost)
      expect(got.minimumMargin).toBe(want.minimum)
      expect(minor(got.floorNet)).toBe(want.floor)
      expect(minor(got.floorNet)).toBe(floorNetOf(want.cost, want.minimum))
      // Nothing of the team reaches it.
      expect(got.marketAdjustment).toBe('0')
      expect(got.engagementAdjustment).toBe('0')
      expect(got.roundingAdjustment).toBe('0')
      expect(got.contingencyReserve).toBe('0')
      expect(got.marketPriceRatio).toBe('1')
      expect(got.engagementPriceRatio).toBe('1')
      expectWalk(got, want.price)
    }

    expect(row(result, 'prod:1:third_party').label).toBe('Producción audiovisual')
    expect(flagged(result)).toEqual([])
  })

  it('the row holds one component, denominated in the output currency, and its trace says so', () => {
    for (const item of thirdPartyRows(result)) {
      expect(item.components).toHaveLength(1)

      const [component] = item.components

      expect(component.kind).toBe('third_party')
      // Unlike every other component, cost and price are already in the output currency.
      expect(minor(component.cost)).toBe(minor(item.cost))
      expect(minor(component.price)).toBe(minor(item.undiscountedPrice))
      expect(component.trace.outputFx).toBe('1')
      expect(component.trace.denominatedIn).toBe('CLP')
      expect(component.trace.supplierCurrency).toBe('CLP')
      expect(component.trace.fxPath).toBe('CLP')
      expect(component.trace).not.toHaveProperty('calculationCurrency')
      // A reader that never heard of contract 1.4.0 converts a component with its `outputFx`: it must reach the row.
      expect(new Decimal(component.cost).mul(component.trace.outputFx).toFixed(0)).toBe(item.cost)
    }

    expect(row(result, 'print:1:third_party').components[0].trace).toMatchObject({
      category: 'printing',
      quantity: '3',
      supplierAmount: '150000'
    })
    // Team components keep the denomination every earlier contract gave them.
    expect(row(result, 'a:1:monthly').components[0].trace).toMatchObject({ calculationCurrency: 'CLP', outputFx: '1' })
  })

  it('totals: each one is the sum of its rows, own work is the rest, and the blended margin stays the real one', () => {
    const totals = amounts(result.totals)

    expect(minor(totals.cost)).toBe(3_249_999n)
    expect(minor(totals.net)).toBe(4_559_999n)
    expect(minor(totals.thirdPartyCost)).toBe(2_249_999n)
    expect(minor(totals.thirdPartyNet)).toBe(2_559_999n)
    // Own work is line a alone: 2.000.000 for 1.000.000.
    expect(totals.ownWorkMarginRate).toBe('0.5')
    // 1.310.000 / 4.559.999: the supplier costs dilute the margin of the quote, and the quote says it.
    expect(new Decimal(totals.marginRate).toFixed(12)).toBe(new Decimal(1_310_000).div(4_559_999).toFixed(12))
    expect(new Decimal(totals.marginRate).lt('0.45')).toBe(true)
    // What the costs commit is paid to their suppliers: it is cash of the period like the person is.
    expect(minor(totals.cashCommitment)).toBe(1_000_000n + 2_249_999n)
    expectTotals(result)
  })

  it('a cost is charged in full in each period it lists, and only there', () => {
    const term = calc(
      spec({
        periods: 3,
        costs: [
          { costId: 'prod', category: 'production', amount: '800000', periodIds: [1, 3] },
          { costId: 'media', category: 'media', amount: '333333', quantity: '3', periodIds: [2] }
        ]
      })
    )

    expect(
      thirdPartyRows(term)
        .map(item => item.lineId)
        .sort()
    ).toEqual(['media:2:third_party', 'prod:1:third_party', 'prod:3:third_party'])
    for (const item of thirdPartyRows(term)) expect(item.net).toBe(row(result, item.lineId.replace(/:\d:/, ':1:')).net)
    expect(minor(amounts(term.totals).thirdPartyNet)).toBe(2n * 960_000n + 999_999n)
    expectTotals(term)
  })

  it('reordering the costs changes no amount', () => {
    const reordered = calc(spec({ costs: [...spec().costs!].reverse() }))
    const byId = (r: Result) => [...rowsOf(r)].sort((a, b) => (a.lineId < b.lineId ? -1 : 1))

    expect(byId(reordered)).toEqual(byId(result))
    expect(reordered.totals).toEqual(result.totals)
  })
})

describe('isolation: a third-party row and a team row never move each other', () => {
  const lines = [person('a', { tool: '250000', setup: '50000' }), person('b', { cost: '777777', minimumMargin: '0.5' })]

  const costs: CostSpec[] = [
    { costId: 'prod', category: 'production', amount: '812345' },
    { costId: 'print', category: 'printing', amount: '150001', quantity: '3' },
    { costId: 'media', category: 'media', amount: '333333', quantity: '3' }
  ]

  const base: Spec = { contract: '1.4.0', currency: 'CLP', lines, multiple: '10000', policies: POLICIES }

  it('adding or removing a third-party cost changes no amount, floor or diagnostic of any team row', () => {
    for (const extra of [
      {},
      { factor: '0.9', floorBasis: true },
      { form: 'on_demand', forms: STANDARD_FORMS },
      { reserve: { rate: '0.15', base: 'own_costs' as const } },
      { adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.2', lineIds: ['a', 'b'], reason: 'r' }] }
    ]) {
      const without = calc({ ...base, ...extra })
      const withCosts = calc({ ...base, ...extra, costs })

      expect(thirdPartyRows(withCosts)).toHaveLength(3)
      expect(teamRows(withCosts)).toEqual(rowsOf(without))
      expect(withCosts.diagnostics.filter(d => !d.lineId || !['prod', 'print', 'media'].includes(d.lineId))).toEqual(
        without.diagnostics
      )

      // Own work reads the same with or without the suppliers: that is what the key is for.
      expect(amounts(withCosts.totals).ownWorkMarginRate).toBe(amounts(without.totals).ownWorkMarginRate)
      expect(amounts(withCosts.totals).ownWorkMarginRate).toBe(without.totals!.marginRate)
      expect(amounts(withCosts.totals).contingencyReserve).toBe(amounts(without.totals).contingencyReserve)
      expect(amounts(withCosts.totals).contingencyBase).toBe(amounts(without.totals).contingencyBase)
      expectTotals(withCosts)
    }
  })

  it('a team row that is 60 % pass-through away from the floor of the offer is not flagged, and nothing else is', () => {
    // Line priced exactly at its floor (target = minimum = 0,45) next to media that is more than half of the quote.
    const heavy = calc({
      contract: '1.4.0',
      currency: 'CLP',
      lines: [person('a', { rate: '0.45', minimumMargin: '0.45' })],
      costs: [{ costId: 'media', category: 'media', amount: '3000000' }],
      policies: POLICIES
    })

    const totals = amounts(heavy.totals)

    expect(minor(totals.thirdPartyNet) * 100n).toBeGreaterThan(minor(totals.net) * 60n)
    expect(new Decimal(totals.marginRate).lt('0.45')).toBe(true)
    expect(flagged(heavy)).toEqual([])
    // Own work is at the policy of the offer: exactly the margin of the team row, at or above its 45 %.
    expect(underFloor(minor(totals.net) - minor(totals.thirdPartyNet), 1_000_000n, '0.45')).toBe(false)
    expect(new Decimal(totals.ownWorkMarginRate).toFixed(60)).toBe(
      new Decimal(row(heavy, 'a:1:monthly').marginAmount).div(row(heavy, 'a:1:monthly').net).toFixed(60)
    )
  })

  it('the market factor changes no third-party row', () => {
    const plain = calc({ ...base, costs })

    for (const extra of [{ factor: '0.9' }, { factor: '0.9', floorBasis: true }, { factor: '1.25' }]) {
      const moved = calc({ ...base, costs, ...extra })

      expect(row(moved, 'a:1:monthly').net).not.toBe(row(plain, 'a:1:monthly').net)
      expect(thirdPartyRows(moved)).toEqual(thirdPartyRows(plain))
      expect(amounts(moved.totals).thirdPartyNet).toBe(amounts(plain.totals).thirdPartyNet)
    }
  })

  it('the engagement ratio changes no third-party row: its own ratio is 1 whatever the quote declares', () => {
    const plain = calc({ ...base, costs })

    for (const ratio of ['1.10', '0.90', '2']) {
      const moved = calc({ ...base, costs, form: 'x', forms: [{ form: 'x', priceRatio: ratio }] })

      expect(row(moved, 'a:1:monthly').engagementPriceRatio).toBe(ratio)
      expect(row(moved, 'a:1:monthly').net).not.toBe(row(plain, 'a:1:monthly').net)
      expect(thirdPartyRows(moved)).toEqual(thirdPartyRows(plain))
      for (const item of thirdPartyRows(moved)) expect(item.components[0].trace.engagementPriceRatio).toBe('1')
    }
  })

  it('the pricing policy of a line changes no third-party row', () => {
    const plain = calc({ ...base, costs })

    const repriced = calc({
      ...base,
      costs,
      lines: lines.map(line => ({ ...line, method: 'markup' as const, rate: '3', basis: 'human' as const }))
    })

    expect(row(repriced, 'a:1:monthly').net).not.toBe(row(plain, 'a:1:monthly').net)
    expect(thirdPartyRows(repriced)).toEqual(thirdPartyRows(plain))
  })

  it('a rate discount on every line leaves every third-party row as it was', () => {
    const plain = calc({ ...base, costs })

    const discounted = calc({
      ...base,
      costs,
      adjustments: [{ adjustmentId: 'd', kind: 'discount', rate: '0.25', lineIds: ['a', 'b'], reason: 'r' }]
    })

    for (const item of teamRows(discounted)) expect(minor(item.discount)).toBeGreaterThan(0n)
    expect(thirdPartyRows(discounted)).toEqual(thirdPartyRows(plain))
    expect(minor(amounts(discounted.totals).discount)).toBe(sum(teamRows(discounted).map(item => minor(item.discount))))
  })

  it('an adjustment reaches a third-party cost only as an agreed net of third-party billing', () => {
    const rejected = (adjustment: Record<string, unknown>) => {
      const result = calculatePricingV3(build({ ...base, costs, adjustments: [{ reason: 'r', ...adjustment }] }))

      expect(result.calculationStatus).toBe('invalid')
      expect(codes(result)).toContain('UNKNOWN_ADJUSTMENT_LINE')
      expect(result.totals).toBeNull()
    }

    // A rate discount cannot name a cost, alone or next to a line.
    rejected({ adjustmentId: 'd', kind: 'discount', rate: '0.1', lineIds: ['prod'] })
    rejected({ adjustmentId: 'd', kind: 'discount', rate: '0.1', lineIds: ['a', 'media'] })
    // An agreed net of a team billing class cannot name a cost, and one of third-party billing cannot name a line.
    rejected({ adjustmentId: 'n', kind: 'agreed_net', amount: '900000', billing: 'monthly', lineIds: ['prod'] })
    rejected({ adjustmentId: 'n', kind: 'agreed_net', amount: '900000', billing: 'setup', lineIds: ['prod'] })
    rejected({ adjustmentId: 'n', kind: 'agreed_net', amount: '900000', billing: 'third_party', lineIds: ['a'] })
    rejected({
      adjustmentId: 'n',
      kind: 'agreed_net',
      amount: '900000',
      billing: 'third_party',
      lineIds: ['prod', 'b']
    })
    rejected({ adjustmentId: 'n', kind: 'agreed_net', amount: '900000', billing: 'third_party', lineIds: ['nobody'] })
  })
})

describe('a cost re-invoiced at cost nets exactly what the supplier charges', () => {
  const cases: { currency: Currency; multiple: string; amount: string; quantity: string }[] = [
    { currency: 'CLP', multiple: '10000', amount: '1', quantity: '1' },
    { currency: 'CLP', multiple: '10000', amount: '333333', quantity: '3' },
    { currency: 'CLP', multiple: '50000', amount: '999999999', quantity: '7' },
    { currency: 'CLP', multiple: '10000', amount: '1234567', quantity: '9999' },
    { currency: 'USD', multiple: '10', amount: '0.01', quantity: '1' },
    { currency: 'USD', multiple: '10', amount: '12345.67', quantity: '3' },
    { currency: 'USD', multiple: '100', amount: '999.99', quantity: '11' }
  ]

  it.each(cases)(
    '$amount x $quantity $currency, rounding none, with a rounding rule of $multiple in force',
    ({ currency, multiple, amount, quantity }) => {
      // Team costs are calculated in the other currency, with rates that do not return an amount on a round trip.
      const result = calc({
        contract: '1.4.0',
        currency,
        calculationCurrency: currency === 'CLP' ? 'USD' : 'CLP',
        fxRate: currency === 'CLP' ? '951.37' : '0.00105',
        lines: [person('a', { cost: currency === 'CLP' ? '1000' : '1000000' })],
        multiple,
        factor: '0.9',
        form: 'on_demand',
        forms: STANDARD_FORMS,
        costs: [{ costId: 'media', category: 'media', amount, quantity }],
        policies: POLICIES
      })

      const got = row(result, 'media:1:third_party')
      const want = halfUp(times(exact(amount), exact(quantity)), PRECISION[currency])

      // No product here needs rounding: the declared amount has at most the decimals of its currency.
      expect(times(exact(amount), exact(quantity)).scale).toBeLessThanOrEqual(PRECISION[currency])
      expect(minor(got.cost)).toBe(want)
      expect(minor(got.net)).toBe(want)
      expect(minor(got.undiscountedPrice)).toBe(want)
      expect(minor(got.marginAmount)).toBe(0n)
      expect(minor(got.roundingAdjustment)).toBe(0n)
      expect(minor(got.floorNet)).toBe(want)
      expect(flagged(result)).toEqual([])
      // The team row next to it was raised to the multiple: the rule is in force, the policy of the row is what spared it.
      expect(new Decimal(row(result, 'a:1:monthly').net).mod(multiple).isZero()).toBe(true)
      expect(got.components[0].trace).toMatchObject({ fxPath: currency, fxRate: '1', rounding: 'none' })
    }
  )

  it('the same supplier currency and output currency is never converted, whatever records the snapshot holds', () => {
    const spec = (extraFx?: Spec['extraFx']): Spec => ({
      contract: '1.4.0',
      currency: 'CLP',
      calculationCurrency: 'USD',
      fxRate: '951.37',
      lines: [person('a', { cost: '1000' })],
      costs: [{ costId: 'media', category: 'media', amount: '333333', quantity: '3' }],
      policies: POLICIES,
      ...(extraFx ? { extraFx } : {})
    })

    // No CLP -> USD record at all: nothing is missing, because nothing is converted.
    const none = calc(spec())
    // A CLP -> USD record that would not return the amount through USD -> CLP: it is not used either.
    const lossy = calc(spec([{ from: 'CLP', to: 'USD', rate: '0.00105' }]))

    for (const result of [none, lossy]) {
      expect(row(result, 'media:1:third_party').cost).toBe('999999')
      expect(row(result, 'media:1:third_party').net).toBe('999999')
    }

    expect(codes(none)).toEqual([])
  })

  it('a rule that says commercial rounding is raised to the multiple, with its floor conserved', () => {
    const result = calc({
      contract: '1.4.0',
      currency: 'CLP',
      lines: [person()],
      multiple: '10000',
      costs: [
        { costId: 'prod', category: 'production', amount: '812345' },
        { costId: 'tight', category: 'tight', amount: '1000000' }
      ],
      // `tight`: the markup gives exactly its floor (0,25 / 1,25 = 0,20), so rounding has a floor to conserve.
      policies: [...POLICIES, { category: 'tight', rate: '0.25', minimumMargin: '0.20', rounding: 'commercial' }]
    })

    const prod = row(result, 'prod:1:third_party')
    const tight = row(result, 'tight:1:third_party')

    // 812.345 x 1,20 = 974.814 -> 980.000.
    expect(minor(prod.undiscountedPrice) - minor(prod.roundingAdjustment)).toBe(974_814n)
    expect(minor(prod.net)).toBe(980_000n)
    expect(minor(prod.roundingAdjustment)).toBe(5_186n)
    // 1.000.000 x 1,25 = 1.250.000 is already a multiple and meets its floor exactly.
    expect(minor(tight.net)).toBe(1_250_000n)
    expect(minor(tight.floorNet)).toBe(1_250_000n)
    expect(flagged(result)).toEqual([])
    for (const item of [prod, tight]) expect(minor(item.net)).toBeGreaterThanOrEqual(minor(item.floorNet))
    expectTotals(result)
  })
})

describe('a supplier in another currency goes through the calculation currency, with the frozen records', () => {
  const spec = (extra: Partial<Spec> = {}): Spec => ({
    contract: '1.4.0',
    currency: 'CLP',
    calculationCurrency: 'USD',
    fxRate: '951.37',
    lines: [person('a', { cost: '1000' })],
    policies: POLICIES,
    ...extra
  })

  it('calculation currency supplier: amount x quantity x output FX, presented half up', () => {
    const result = calc(
      spec({ costs: [{ costId: 'talent', category: 'talent', amount: '1250.55', quantity: '2', currency: 'USD' }] })
    )

    const got = row(result, 'talent:1:third_party')
    const cost = times(exact('1250.55'), exact('2'), exact('951.37'))

    expect(minor(got.cost)).toBe(halfUp(cost, 0))
    // Markup 0,07 on the unrounded cost, then presented: never the presented cost times the rate.
    expect(minor(got.net)).toBe(halfUp(times(cost, exact('1.07')), 0))
    expect(got.components[0].trace).toMatchObject({
      supplierCurrency: 'USD',
      supplierAmount: '1250.55',
      fxPath: 'USD>CLP',
      fxRate: '951.37',
      denominatedIn: 'CLP',
      outputFx: '1'
    })
    expectTotals(result)
  })

  it('third currency supplier: its record into the calculation currency, then the output FX', () => {
    const costs: CostSpec[] = [
      { costId: 'print', category: 'printing', amount: '987.65', quantity: '3', currency: 'EUR' }
    ]

    const result = calc(spec({ costs, extraFx: [{ from: 'EUR', to: 'USD', rate: '1.1206' }] }))
    const got = row(result, 'print:1:third_party')
    const cost = times(exact('987.65'), exact('3'), exact('1.1206'), exact('951.37'))

    expect(minor(got.cost)).toBe(halfUp(cost, 0))
    // Target margin 0,25: cost / 0,75.
    expect(minor(got.undiscountedPrice)).toBe(ratioHalfUp(cost, exact('0.75'), 0))
    expect(got.components[0].trace.fxPath).toBe('EUR>USD>CLP')

    // Without the record the calculation is withheld; no rate is assumed.
    const missing = calculatePricingV3(build(spec({ costs })))

    expect(missing.calculationStatus).toBe('needs_input')
    expect(missing.diagnostics).toEqual([
      expect.objectContaining({ code: 'MISSING_FX', fieldPath: 'request.thirdPartyCosts.0.fx', severity: 'missing' })
    ])
  })

  it('the FX record of a cost is judged like every other source', () => {
    const costs: CostSpec[] = [{ costId: 'print', category: 'printing', amount: '100', currency: 'EUR' }]

    const withRecord = (recordSource: unknown) => {
      const input = build(spec({ costs, extraFx: [{ from: 'EUR', to: 'USD', rate: '1.1' }] }))

      input.snapshot.fx[1].source = recordSource as typeof source

      return calculatePricingV3(input)
    }

    expect(withRecord({ ...source, status: 'estimated' }).diagnostics).toEqual([
      expect.objectContaining({
        code: 'ESTIMATED_SOURCE',
        fieldPath: 'request.thirdPartyCosts.0.fx',
        severity: 'review'
      })
    ])
    expect(withRecord({ ...source, effectiveUntil: '2026-06-14' }).calculationStatus).toBe('needs_input')
  })

  it('a supplier currency the snapshot does not register withholds the calculation', () => {
    const input = build(spec({ costs: [{ costId: 'print', category: 'printing', amount: '100', currency: 'EUR' }] }))

    input.snapshot.currencies = input.snapshot.currencies.filter(item => item.code !== 'EUR')

    const result = calculatePricingV3(input)

    expect(result.calculationStatus).toBe('needs_input')
    expect(codes(result)).toContain('MISSING_CURRENCY')
  })
})

describe('third-party costs: what the kernel refuses or withholds', () => {
  const lines = [person()]
  const media: CostSpec = { costId: 'media', category: 'media', amount: '500000' }

  const run = (extra: Partial<Spec>) =>
    calculatePricingV3(build({ contract: '1.4.0', currency: 'CLP', lines, policies: POLICIES, ...extra }))

  it('a cost and a line share one id namespace: adjustments address both by the id of the parent', () => {
    for (const costs of [[{ ...media, costId: 'a' }], [media, { ...media, category: 'production' }]]) {
      const result = run({ costs })

      expect(result.calculationStatus).toBe('invalid')
      expect(result.diagnostics).toEqual([
        expect.objectContaining({ code: 'DUPLICATE_ID', fieldPath: 'request.thirdPartyCosts', severity: 'error' })
      ])
    }
  })

  it('a category without its rule withholds the calculation: no rate is assumed, not even "at cost"', () => {
    for (const policies of [undefined, [], POLICIES.filter(item => item.category !== 'media')]) {
      const result = run({ costs: [media], policies })

      expect(result.calculationStatus).toBe('needs_input')
      expect(result.totals).toBeNull()
      expect(result.lines).toEqual([])
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'MISSING_THIRD_PARTY_POLICY',
          fieldPath: 'request.thirdPartyCosts.0.category',
          lineId: 'media',
          severity: 'missing'
        })
      ])
    }
  })

  it('each category is stated once', () => {
    const result = run({ costs: [media], policies: [...POLICIES, { category: 'media', rate: '0.5' }] })

    expect(result.calculationStatus).toBe('invalid')
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'DUPLICATE_ID', fieldPath: 'snapshot.thirdPartyPolicies' })
    ])
  })

  it('the evidence of an amount is judged like every source: expired or pending blocks, estimated is reviewed', () => {
    const withEvidence = (edit: Record<string, string>) =>
      run({ costs: [{ ...media, source: { ...source, ...edit } }] })

    const expired = withEvidence({ effectiveUntil: '2026-06-14' })
    const notYet = withEvidence({ effectiveFrom: '2026-06-16' })
    const pending = withEvidence({ status: 'pending' })
    const estimated = withEvidence({ status: 'estimated' })

    for (const result of [expired, notYet]) {
      expect(result.calculationStatus).toBe('needs_input')
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'STALE_SOURCE',
          fieldPath: 'request.thirdPartyCosts.0.source',
          lineId: 'media',
          severity: 'missing'
        })
      ])
    }

    expect(pending.calculationStatus).toBe('needs_input')
    expect(codes(pending)).toEqual(['MISSING_SOURCE_CONFIRMATION'])
    expect(estimated.calculationStatus).toBe('calculated')
    expect(estimated.reviewStatus).toBe('requires_review')
    expect(estimated.diagnostics).toEqual([
      expect.objectContaining({
        code: 'ESTIMATED_SOURCE',
        fieldPath: 'request.thirdPartyCosts.0.source',
        severity: 'review'
      })
    ])
  })

  it('the rule of a category is judged the same way', () => {
    const withRule = (edit: Record<string, string>) =>
      run({ costs: [media], policies: [{ category: 'media', rate: '0', source: { ...source, ...edit } }] })

    expect(withRule({ effectiveUntil: '2026-06-14' }).calculationStatus).toBe('needs_input')
    expect(withRule({ status: 'pending' }).calculationStatus).toBe('needs_input')
    expect(withRule({ status: 'estimated' }).diagnostics).toEqual([
      expect.objectContaining({
        code: 'ESTIMATED_SOURCE',
        fieldPath: 'snapshot.thirdPartyPolicies.media',
        lineId: 'media',
        severity: 'review'
      })
    ])
  })

  it('a period outside the term, or listed twice, is an invalid period', () => {
    for (const periodIds of [[2], [1, 1], [1, 4]]) {
      const result = run({ periods: 3, costs: [{ ...media, periodIds }] })
      const valid = periodIds.every(period => period <= 3) && new Set(periodIds).size === periodIds.length

      expect(result.calculationStatus).toBe(valid ? 'calculated' : 'invalid')
      if (!valid)
        expect(result.diagnostics).toEqual([
          expect.objectContaining({
            code: 'INVALID_PERIOD',
            fieldPath: 'request.thirdPartyCosts.0.periodIds',
            lineId: 'media'
          })
        ])
    }

    expect(run({ costs: [{ ...media, periodIds: [2] }] }).calculationStatus).toBe('invalid')
  })

  it('an amount with more decimals than its currency has is refused', () => {
    const clp = run({ costs: [{ ...media, amount: '500000.5' }] })

    const usd = calculatePricingV3(
      build({
        contract: '1.4.0',
        currency: 'USD',
        lines: [person('a', { cost: '1000' })],
        policies: POLICIES,
        costs: [{ ...media, amount: '10.005' }]
      })
    )

    for (const result of [clp, usd]) {
      expect(result.calculationStatus).toBe('invalid')
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'INVALID_THIRD_PARTY_AMOUNT',
          fieldPath: 'request.thirdPartyCosts.0.amount',
          severity: 'error'
        })
      ])
    }

    // The precision is the one of the supplier currency, not of the quote: cents of a dollar inside a CLP quote.
    expect(
      calc({
        contract: '1.4.0',
        currency: 'CLP',
        calculationCurrency: 'USD',
        fxRate: '950',
        lines: [person('a', { cost: '1000' })],
        policies: POLICIES,
        costs: [{ ...media, amount: '10.05', currency: 'USD' }]
      }).calculationStatus
    ).toBe('calculated')
  })

  it('a target margin of 1 or more is not a price', () => {
    const result = run({ costs: [media], policies: [{ category: 'media', method: 'target_margin', rate: '1' }] })

    expect(result.calculationStatus).toBe('invalid')
    expect(codes(result)).toEqual(['INVALID_MARGIN_RATE'])
  })
})

describe('an agreed net of third-party billing', () => {
  // Two periods. prod is charged in both, print only in the first:
  //   period 1: prod 960.000 + print 600.000 = 1.560.000;  period 2: prod 960.000.
  const spec = (amount: string, lineIds = ['prod', 'print'], extra: Partial<Spec> = {}): Spec => ({
    contract: '1.4.0',
    currency: 'CLP',
    periods: 2,
    lines: [person()],
    costs: [
      { costId: 'prod', category: 'production', amount: '800000', periodIds: [1, 2] },
      { costId: 'print', category: 'printing', amount: '150000', quantity: '3', periodIds: [1] },
      { costId: 'media', category: 'media', amount: '333333', quantity: '3', periodIds: [1] }
    ],
    policies: POLICIES,
    adjustments: [{ adjustmentId: 'n', kind: 'agreed_net', amount, billing: 'third_party', lineIds, reason: 'r' }],
    ...extra
  })

  const plain = calc({ ...spec('0'), adjustments: [] })

  it('lands exactly in every period, on the named costs alone, in proportion to their price', () => {
    const result = calc(spec('1400000'))
    const net = (lineId: string) => minor(row(result, lineId).net)

    expect(net('prod:1:third_party') + net('print:1:third_party')).toBe(1_400_000n)
    expect(net('prod:2:third_party')).toBe(1_400_000n)
    // Period 1 gives up 160.000: 160.000 x 960/1560 = 98.461,54 and 160.000 x 600/1560 = 61.538,46. The peso left
    // over goes to the largest remainder: `prod` takes 98.462 and `print` 61.538.
    expect(minor(row(result, 'prod:1:third_party').discount)).toBe(98_462n)
    expect(minor(row(result, 'print:1:third_party').discount)).toBe(61_538n)
    // Period 2 has one row and an agreed net above its price: an uplift.
    expect(minor(row(result, 'prod:2:third_party').uplift)).toBe(440_000n)
    // Nothing else moved.
    expect(row(result, 'media:1:third_party')).toEqual(row(plain, 'media:1:third_party'))
    expect(teamRows(result)).toEqual(teamRows(plain))
    for (const item of rowsOf(result)) expectWalk(item, basePriceOf(item))
    expectTotals(result)
  })

  it('under cost it flags exactly those rows, and no team row', () => {
    // prod costs 800.000 a period: 700.000 is under cost, let alone under its 10 % floor.
    const result = calc(spec('700000', ['prod']))

    expect(minor(row(result, 'prod:1:third_party').net)).toBe(700_000n)
    expect(minor(row(result, 'prod:1:third_party').marginAmount)).toBe(-100_000n)
    expect(flagged(result)).toEqual(['prod:1:third_party', 'prod:2:third_party'])
    expect(result.diagnostics.filter(d => d.code === 'MARGIN_BELOW_FLOOR').map(d => d.lineId)).toEqual(['prod', 'prod'])
    expect(result.reviewStatus).toBe('requires_review')
  })

  it('the verdict is exact at the floor of the category, and a cost at cost is flagged only under cost', () => {
    // prod floor: 800.000 / 0,9 raised to the peso = 888.889.
    expect(flagged(calc(spec('888889', ['prod'])))).toEqual([])
    expect(flagged(calc(spec('888888', ['prod'])))).toEqual(['prod:1:third_party', 'prod:2:third_party'])
    // media at cost, floor 0: its own cost passes, one peso less is sold under cost.
    expect(flagged(calc(spec('999999', ['media'])))).toEqual([])
    expect(flagged(calc(spec('999998', ['media'])))).toEqual(['media:1:third_party'])
  })

  it('two adjustments cannot claim the same cost, and an amount keeps the precision of the output currency', () => {
    const overlapping = calculatePricingV3(
      build(
        spec('1', ['prod'], {
          adjustments: [
            {
              adjustmentId: 'n',
              kind: 'agreed_net',
              amount: '900000',
              billing: 'third_party',
              lineIds: ['prod'],
              reason: 'r'
            },
            {
              adjustmentId: 'm',
              kind: 'agreed_net',
              amount: '900000',
              billing: 'third_party',
              lineIds: ['prod', 'print'],
              reason: 'r'
            }
          ]
        })
      )
    )

    expect(overlapping.calculationStatus).toBe('invalid')
    expect(codes(overlapping)).toContain('OVERLAPPING_ADJUSTMENTS')

    const fractional = calculatePricingV3(build(spec('900000.5', ['prod'])))

    expect(fractional.calculationStatus).toBe('invalid')
    expect(codes(fractional)).toContain('INVALID_AGREED_AMOUNT')

    // The same cost under a discount of its line namespace and an agreed net of its own is not an overlap: they
    // are different rows. A line named `a` keeps its discount next to the agreed net of the costs.
    const both = calc(
      spec('1400000', ['prod', 'print'], {
        adjustments: [
          {
            adjustmentId: 'n',
            kind: 'agreed_net',
            amount: '1400000',
            billing: 'third_party',
            lineIds: ['prod', 'print'],
            reason: 'r'
          },
          { adjustmentId: 'd', kind: 'discount', rate: '0.05', lineIds: ['a'], reason: 'r' }
        ]
      })
    )

    expect(minor(row(both, 'a:1:monthly').discount)).toBe(100_000n)
    expect(thirdPartyRows(both)).toEqual(thirdPartyRows(calc(spec('1400000'))))
  })
})

describe('the contingency reserve, from inputs small enough to derive by hand', () => {
  // Line a: person 1.000.000 with a tool of 250.000 and a one-time setup of 50.000, target margin 0,5 on all costs.
  const lines = [person('a', { tool: '250000', setup: '50000' })]

  const spec = (extra: Partial<Spec> = {}): Spec => ({
    contract: '1.4.0',
    currency: 'CLP',
    lines,
    reserve: { rate: '0.15', base: 'human' },
    ...extra
  })

  const without = calc(spec({ reserve: undefined }))

  it('base `human`: 15 % of the person cost, as cost of the row; a setup row has no person and carries none', () => {
    const result = calc(spec())
    const monthly = row(result, 'a:1:monthly')
    const setup = row(result, 'a:1:setup')

    // 1.000.000 + 250.000 + 150.000 of reserve; sold at the multiplier of the policy like every cost of the row.
    expect(minor(monthly.cost)).toBe(1_400_000n)
    expect(minor(monthly.contingencyReserve)).toBe(150_000n)
    expect(minor(monthly.undiscountedPrice)).toBe(2_800_000n)
    expect(minor(monthly.marginAmount)).toBe(1_400_000n)
    // The floor is read on the cost with the reserve: 1.400.000 / 0,55 raised to the peso.
    expect(minor(monthly.floorNet)).toBe(2_545_455n)
    expect(minor(monthly.floorNet)).toBe(floorNetOf(1_400_000n, '0.45'))
    expect(setup).toEqual({ ...row(without, 'a:1:setup'), contingencyReserve: '0' })

    const totals = amounts(result.totals)

    expect(minor(totals.contingencyReserve)).toBe(150_000n)
    expect(minor(totals.contingencyBase)).toBe(1_000_000n)
    expect(totals.contingencyReserveWaived).toBe('0')
    expectTotals(result)
  })

  it('base `own_costs`: 15 % of every cost of each row, the setup row included', () => {
    const result = calc(spec({ reserve: { rate: '0.15', base: 'own_costs' } }))

    // (1.000.000 + 250.000) x 0,15 = 187.500;  50.000 x 0,15 = 7.500.
    expect(minor(row(result, 'a:1:monthly').contingencyReserve)).toBe(187_500n)
    expect(minor(row(result, 'a:1:monthly').cost)).toBe(1_437_500n)
    expect(minor(row(result, 'a:1:setup').contingencyReserve)).toBe(7_500n)
    expect(minor(row(result, 'a:1:setup').cost)).toBe(57_500n)
    expect(minor(row(result, 'a:1:setup').net)).toBe(115_000n)
    expect(minor(amounts(result.totals).contingencyReserve)).toBe(195_000n)
    expect(minor(amounts(result.totals).contingencyBase)).toBe(1_300_000n)
    expectTotals(result)
  })

  it('the reserve is one component of the row: a cost that commits no cash, with the rate and base it came from', () => {
    const result = calc(spec())
    const component = row(result, 'a:1:monthly').components.find(item => item.kind === 'contingency_reserve')!

    expect(row(result, 'a:1:monthly').components.map(item => item.kind)).toEqual([
      'human',
      'tool',
      'contingency_reserve'
    ])
    expect(minor(component.cost)).toBe(150_000n)
    expect(minor(component.price)).toBe(300_000n)
    expect(component.cashCommitment).toBe('0')
    expect(component.trace).toMatchObject({ rate: '0.15', base: 'human', baseAmount: '1000000', marketFactor: '1' })
    // It is not a resource assignment and nothing reads it as one.
    expect(component.trace).not.toHaveProperty('unit')
    expect(row(result, 'a:1:setup').components.map(item => item.kind)).toEqual(['setup'])
    // Cash of the quote is what it was: the reserve is a provision, not a purchase.
    expect(result.totals!.cashCommitment).toBe(without.totals!.cashCommitment)
    // The components of a row still add up to its policy price.
    for (const item of rowsOf(result))
      expect(sum(item.components.map(c => minor(c.price)))).toBe(minor(item.undiscountedPrice))
  })

  it('it is a cost, not a price: taking it out of the cost gives the row of the same input without a reserve', () => {
    for (const extra of [
      {},
      { reserve: { rate: '0.15', base: 'own_costs' as const } },
      { factor: '0.9', floorBasis: true, form: 'on_demand', forms: STANDARD_FORMS },
      // Through a conversion to cents, with a rate that makes every product irregular.
      {
        currency: 'USD' as const,
        calculationCurrency: 'CLP' as const,
        fxRate: '0.00105137',
        reserve: { rate: '0.137', base: 'own_costs' as const }
      },
      {
        currency: 'CLP' as const,
        calculationCurrency: 'USD' as const,
        fxRate: '951.37',
        lines: [person('a', { cost: '1234.56', tool: '77.77', setup: '49.99' })]
      }
    ]) {
      const reserved = calc(spec(extra))
      const bare = calc(spec({ ...extra, reserve: undefined }))

      expect(minor(amounts(reserved.totals).contingencyReserve)).toBeGreaterThan(0n)

      for (const item of rowsOf(reserved)) {
        const prior = row(bare, item.lineId)

        expect(minor(item.cost) - minor(item.contingencyReserve)).toBe(minor(prior.cost))
        // It moved the price up with the cost, and the floor with it.
        if (minor(item.contingencyReserve) > 0n) {
          expect(minor(item.undiscountedPrice)).toBeGreaterThan(minor(prior.undiscountedPrice))
          expect(minor(item.floorNet)).toBeGreaterThan(minor(prior.floorNet))
        } else expect({ ...item, contingencyReserve: undefined }).toEqual({ ...prior, contingencyReserve: undefined })
      }

      expect(minor(reserved.totals!.cost) - minor(amounts(reserved.totals).contingencyReserve)).toBe(
        minor(bare.totals!.cost)
      )
      expectTotals(reserved)
    }
  })

  it('under a policy that prices people only, the reserve is sold at cost like every other non-human cost', () => {
    const humanBasis = [person('a', { tool: '250000', basis: 'human' })]
    const result = calc(spec({ lines: humanBasis }))
    const component = row(result, 'a:1:monthly').components.find(item => item.kind === 'contingency_reserve')!

    // Person 2.000.000, tool at cost 250.000, reserve at cost 150.000.
    expect(minor(component.price)).toBe(150_000n)
    expect(component.trace.pricingMultiplier).toBe('1')
    expect(minor(row(result, 'a:1:monthly').undiscountedPrice)).toBe(2_400_000n)
  })

  it('it takes the engagement ratio with the rest of the row and never the market factor', () => {
    const result = calc(spec({ lines: [person()], factor: '0.9', form: 'on_demand', forms: STANDARD_FORMS }))
    const item = row(result, 'a:1:monthly')
    const component = item.components.find(c => c.kind === 'contingency_reserve')!

    // Person 1.000.000 x 2 x 0,9 = 1.800.000; reserve 150.000 x 2 = 300.000 in both markets; x 1,10 on the row.
    expect(minor(component.price)).toBe(330_000n)
    expect(minor(item.undiscountedPrice)).toBe(2_310_000n)
    // Market price 2.100.000 against base 2.300.000; the form adds 210.000 on the market price.
    expect(minor(item.marketAdjustment)).toBe(-200_000n)
    expect(minor(item.engagementAdjustment)).toBe(210_000n)
    expect(component.trace).toMatchObject({ marketFactor: '1', engagementPriceRatio: '1.10' })
    expectWalk(item, 2_300_000n)
  })

  it('it never rests on a third-party cost, under either base', () => {
    const costs: CostSpec[] = [
      { costId: 'prod', category: 'production', amount: '5000000' },
      { costId: 'media', category: 'media', amount: '9000000' }
    ]

    for (const base of ['human', 'own_costs'] as const) {
      const alone = calc(spec({ reserve: { rate: '0.15', base } }))
      const withCosts = calc(spec({ reserve: { rate: '0.15', base }, costs, policies: POLICIES }))

      expect(amounts(withCosts.totals).contingencyReserve).toBe(amounts(alone.totals).contingencyReserve)
      expect(amounts(withCosts.totals).contingencyBase).toBe(amounts(alone.totals).contingencyBase)
      expect(teamRows(withCosts)).toEqual(rowsOf(alone))

      for (const item of thirdPartyRows(withCosts)) {
        expect(item.contingencyReserve).toBe('0')
        expect(item.components.map(c => c.kind)).toEqual(['third_party'])
      }

      // Supplier cost exactly as declared: nothing was added on top of it.
      expect(minor(row(withCosts, 'prod:1:third_party').cost)).toBe(5_000_000n)
      expect(minor(row(withCosts, 'media:1:third_party').net)).toBe(9_000_000n)
    }
  })

  it('a price that does not charge it is under the floor: the same agreed net without a reserve is not', () => {
    // Person alone. Without a reserve: cost 1.000.000, floor 1.818.182. With 15 %: cost 1.150.000, floor 2.090.910.
    const agreed = (amount: string, reserve?: Spec['reserve']) =>
      calc({
        contract: '1.4.0',
        currency: 'CLP',
        lines: [person()],
        reserve,
        adjustments: [
          { adjustmentId: 'n', kind: 'agreed_net', amount, billing: 'monthly', lineIds: ['a'], reason: 'r' }
        ]
      })

    const reserve = { rate: '0.15', base: 'human' as const }

    // 1.900.000 is the price of the work without the reserve, less a little: the discount ate the reserve.
    expect(flagged(agreed('1900000'))).toEqual([])
    expect(flagged(agreed('1900000', reserve))).toEqual(['a:1:monthly'])
    expect(minor(row(agreed('1900000', reserve), 'a:1:monthly').marginAmount)).toBe(750_000n)
    // Exact at the new floor.
    expect(minor(row(agreed('2090910', reserve), 'a:1:monthly').floorNet)).toBe(2_090_910n)
    expect(flagged(agreed('2090910', reserve))).toEqual([])
    expect(flagged(agreed('2090909', reserve))).toEqual(['a:1:monthly'])
  })

  it('commercial rounding conserves the floor read on the cost with the reserve', () => {
    // Target equal to the floor: the row sits exactly at its floor before rounding.
    const result = calc(
      spec({ lines: [person('a', { cost: '1003333', rate: '0.45', minimumMargin: '0.45' })], multiple: '10000' })
    )

    const item = row(result, 'a:1:monthly')

    expect(new Decimal(item.net).mod('10000').isZero()).toBe(true)
    expect(minor(item.net)).toBeGreaterThanOrEqual(minor(item.floorNet))
    expect(minor(item.floorNet)).toBe(floorNetOf(minor(item.cost), '0.45'))
    expect(flagged(result)).toEqual([])
  })

  it('the source of the reserve is judged like every other source', () => {
    const withSource = (edit: Record<string, string>) =>
      calculatePricingV3(build(spec({ reserve: { rate: '0.15', base: 'human', source: { ...source, ...edit } } })))

    expect(withSource({ status: 'estimated' }).diagnostics).toEqual([
      expect.objectContaining({
        code: 'ESTIMATED_SOURCE',
        fieldPath: 'snapshot.contingencyReserve',
        severity: 'review'
      })
    ])
    expect(withSource({ status: 'pending' }).calculationStatus).toBe('needs_input')
    expect(withSource({ effectiveUntil: '2026-06-14' }).diagnostics).toEqual([
      expect.objectContaining({ code: 'STALE_SOURCE', fieldPath: 'snapshot.contingencyReserve', severity: 'missing' })
    ])
  })
})

describe('the reserve leaves a quote only through a declared waiver', () => {
  const lines = [person('a', { tool: '250000', setup: '50000' }), person('b', { cost: '777777' })]

  const cases: Partial<Spec>[] = [
    { reserve: { rate: '0.15', base: 'human' } },
    { reserve: { rate: '0.15', base: 'own_costs' } },
    {
      reserve: { rate: '0.137', base: 'own_costs' },
      currency: 'USD',
      calculationCurrency: 'CLP',
      fxRate: '0.00105137',
      multiple: '10',
      factor: '0.9',
      floorBasis: true,
      form: 'on_demand',
      forms: STANDARD_FORMS,
      costs: [{ costId: 'media', category: 'media', amount: '1234.56' }],
      policies: POLICIES
    }
  ]

  it.each(cases)('waived, the quote is the one without a reserve, with the waiver on record ($reserve.base)', extra => {
    const spec: Spec = { contract: '1.4.0', currency: 'CLP', lines, ...extra }
    const reserved = calc(spec)
    const waived = calc({ ...spec, waiver: 'The scope was closed line by line.' })
    const bare = calc({ ...spec, reserve: undefined })

    // Rows: digit for digit those of the quote that never had a reserve.
    expect(rowsOf(waived)).toEqual(rowsOf(bare))
    // Totals: the same, plus the amount forgone, which is what the reserve of this quote would have been.
    expect({ ...waived.totals, contingencyReserveWaived: undefined }).toEqual({
      ...bare.totals,
      contingencyReserveWaived: undefined
    })
    expect(amounts(bare.totals).contingencyReserveWaived).toMatch(/^0(\.00)?$/)
    expect(minor(amounts(waived.totals).contingencyReserveWaived)).toBeGreaterThan(0n)
    expect(amounts(waived.totals).contingencyReserveWaived).toBe(amounts(reserved.totals).contingencyReserve)
    expect(amounts(waived.totals).contingencyReserve).toMatch(/^0(\.00)?$/)
    // Diagnostics: one more, and it puts the quote under review.
    expect(waived.diagnostics).toEqual([
      ...bare.diagnostics.slice(0, 0),
      expect.objectContaining({
        code: 'CONTINGENCY_RESERVE_WAIVED',
        fieldPath: 'request.contingencyWaiver',
        severity: 'review'
      }),
      ...bare.diagnostics
    ])
    expect(waived.reviewStatus).toBe('requires_review')
    expect(JSON.stringify(waived.lines)).not.toContain('contingency_reserve')
    expectTotals(waived)
  })

  it('a waiver with no reserve to waive is an error, never silently accepted', () => {
    const result = calculatePricingV3(build({ contract: '1.4.0', currency: 'CLP', lines, waiver: 'No reserve here.' }))

    expect(result.calculationStatus).toBe('invalid')
    expect(result.totals).toBeNull()
    expect(result.lines).toEqual([])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'CONTINGENCY_WAIVER_WITHOUT_RESERVE',
        fieldPath: 'request.contingencyWaiver',
        severity: 'error'
      })
    ])
  })
})

describe('both capabilities with market factor, form, rounding and adjustments together, over generated cases', () => {
  // Deterministic generator: every case is reproducible from its index.
  const pick = <T>(items: readonly T[], seed: number) => items[seed % items.length]

  const generated = Array.from({ length: 48 }, (_, index) => {
    const currency = pick(['CLP', 'USD'] as const, index)
    const converted = index % 3 === 0
    const calculationCurrency = converted ? (currency === 'CLP' ? 'USD' : 'CLP') : currency
    const inCalc = (clp: string, usd: string) => (calculationCurrency === 'CLP' ? clp : usd)
    const supplier = (clp: string, usd: string) => (currency === 'CLP' ? clp : usd)

    const spec: Spec = {
      contract: '1.4.0',
      currency,
      calculationCurrency,
      ...(converted ? { fxRate: currency === 'CLP' ? '951.37' : '0.00105137' } : {}),
      lines: [
        person('a', {
          cost: inCalc(String(900_001 + index * 7_919), `${1_000 + index * 13}.${String(10 + index).slice(-2)}`),
          tool: inCalc('123457', '131.13'),
          setup: index % 4 === 0 ? inCalc('50001', '49.99') : undefined,
          rate: pick(['0.5', '0.45', '0.6'], index),
          basis: pick(['all_costs', 'human'] as const, index >> 2)
        }),
        person('b', { cost: inCalc('777777', '801.07'), method: 'markup', rate: '1', minimumMargin: '0.4' })
      ],
      factor: pick(['1', '0.9', '1.15'], index >> 1),
      floorBasis: index % 5 === 0,
      multiple: pick([undefined, currency === 'CLP' ? '10000' : '10'], index >> 3),
      ...(index % 2
        ? { form: 'on_demand', forms: [{ form: 'on_demand', priceRatio: pick(['1.10', '0.95', '1'], index) }] }
        : {}),
      reserve: pick(
        [undefined, { rate: '0.15', base: 'human' }, { rate: '0.083', base: 'own_costs' }] as const,
        index >> 1
      ),
      costs: [
        {
          costId: 'prod',
          category: 'production',
          amount: supplier(String(800_000 + index * 1_001), `${900 + index}.37`)
        },
        {
          costId: 'print',
          category: 'printing',
          amount: supplier('150001', '160.01'),
          quantity: String(1 + (index % 4))
        },
        { costId: 'media', category: 'media', amount: supplier('333333', '3333.33'), quantity: '3' },
        // A supplier in the other currency of the quote, when a record leads to the calculation currency.
        ...(converted && calculationCurrency !== currency
          ? [
              {
                costId: 'talent',
                category: 'talent',
                amount: inCalc('1250000', '1250.55'),
                currency: calculationCurrency
              }
            ]
          : [])
      ],
      policies: POLICIES,
      adjustments: pick(
        [
          [],
          [{ adjustmentId: 'd', kind: 'discount', rate: '0.12', lineIds: ['a', 'b'], reason: 'r' }],
          [
            {
              adjustmentId: 'n',
              kind: 'agreed_net',
              amount: supplier('900000', '1000.00'),
              billing: 'third_party',
              lineIds: ['prod'],
              reason: 'r'
            },
            { adjustmentId: 'd', kind: 'discount', rate: '0.3', lineIds: ['b'], reason: 'r' }
          ]
        ],
        index >> 2
      )
    }

    return { index, spec }
  })

  it('the generator covers both currencies, conversions, forms, floors, rounding, both bases and every adjustment', () => {
    const specs = generated.map(item => item.spec)

    expect(new Set(specs.map(s => s.currency)).size).toBe(2)
    expect(specs.some(s => s.fxRate) && specs.some(s => !s.fxRate)).toBe(true)
    expect(specs.some(s => s.form) && specs.some(s => !s.form)).toBe(true)
    expect(specs.some(s => s.floorBasis && s.factor === '0.9')).toBe(true)
    expect(specs.some(s => s.multiple) && specs.some(s => !s.multiple)).toBe(true)
    expect(new Set(specs.map(s => s.reserve?.base ?? 'none')).size).toBe(3)
    expect(new Set(specs.map(s => JSON.stringify((s.adjustments as { kind: string }[]).map(a => a.kind)))).size).toBe(3)
    expect(specs.some(s => s.costs!.some(c => c.costId === 'talent'))).toBe(true)
  })

  it.each(generated)('case $index: walk, totals, isolation and verdicts', ({ spec }) => {
    const result = calc(spec)

    // The walk of every row, and every total as the sum of its rows.
    for (const item of rowsOf(result)) expectWalk(item, basePriceOf(item))
    expectTotals(result)

    // Third-party rows: cost is the declared amount converted, exactly; no adjustment of the team; own ratio 1.
    const fxOf = (cost: CostSpec) =>
      (cost.currency ?? spec.currency) === spec.currency ? exact('1') : exact(spec.fxRate ?? '1')

    for (const cost of spec.costs!) {
      const item = row(result, `${cost.costId}:1:third_party`)
      const policy = POLICIES.find(p => p.category === cost.category)!
      const raw = times(exact(cost.amount), exact(cost.quantity ?? '1'), fxOf(cost))
      const precision = PRECISION[spec.currency]

      expect(minor(item.cost)).toBe(halfUp(raw, precision))
      expect(minor(item.undiscountedPrice) - minor(item.roundingAdjustment)).toBe(
        policy.method === 'target_margin'
          ? ratioHalfUp(raw, exact(new Decimal(1).minus(policy.rate).toString()), precision)
          : halfUp(times(raw, exact(new Decimal(1).plus(policy.rate).toString())), precision)
      )
      expect(minor(item.marketAdjustment)).toBe(0n)
      expect(minor(item.engagementAdjustment)).toBe(0n)
      expect(minor(item.contingencyReserve)).toBe(0n)
      expect(item.engagementPriceRatio).toBe('1')
      expect(item.marketPriceRatio).toBe('1')
      if (policy.rounding === 'none' || !spec.multiple) expect(minor(item.roundingAdjustment)).toBe(0n)
      else expect(new Decimal(item.undiscountedPrice).mod(spec.multiple).isZero()).toBe(true)
      expect(minor(item.floorNet)).toBe(floorNetOf(minor(item.cost), policy.minimumMargin!))
      // The verdict of a third-party row is its own net against its own floor, and nothing else.
      expect(flagged(result).includes(item.lineId)).toBe(
        underFloor(minor(item.net), minor(item.cost), policy.minimumMargin!)
      )
      expect(minor(item.net) < minor(item.floorNet)).toBe(flagged(result).includes(item.lineId))
    }

    // Team rows: those of the same input without any third-party cost (and without the agreed net that names one).
    const teamOnly = calc({
      ...spec,
      costs: undefined,
      adjustments: (spec.adjustments as { billing?: string }[]).filter(a => a.billing !== 'third_party')
    })

    expect(teamRows(result)).toEqual(rowsOf(teamOnly))

    // The reserve: taking it out of the cost gives the cost of the same input without a reserve.
    const bare = calc({ ...spec, reserve: undefined })

    for (const item of rowsOf(result))
      expect(minor(item.cost) - minor(item.contingencyReserve)).toBe(minor(row(bare, item.lineId).cost))
    expect(thirdPartyRows(result)).toEqual(thirdPartyRows(bare))
    expect(minor(amounts(result.totals).contingencyReserve) > 0n).toBe(Boolean(spec.reserve))
  })
})

describe('replay and comparison of a 1.4.0 artifact in the kernel lane', () => {
  const spec: Spec = {
    contract: '1.4.0',
    currency: 'CLP',
    calculationCurrency: 'USD',
    fxRate: '951.37',
    lines: [person('a', { cost: '1234.56', tool: '77.77', setup: '49.99' })],
    multiple: '10000',
    form: 'on_demand',
    forms: STANDARD_FORMS,
    reserve: { rate: '0.15', base: 'human' },
    costs: [
      { costId: 'prod', category: 'production', amount: '812345' },
      { costId: 'talent', category: 'talent', amount: '1250.55', currency: 'USD' },
      { costId: 'media', category: 'media', amount: '333333', quantity: '3' }
    ],
    policies: POLICIES
  }

  const frozen = runPricingV3(build(spec), '2026-06-15T00:00:00.000Z').artifact!

  it('verifies with the engine of its contract, and any touched value is REPLAY_MISMATCH', () => {
    expect(frozen.semantic.engineVersion).toBe('pricing-v3-local/1.4.0')
    expect(replayPricingV3(clone(frozen)).replayDigest).toBe(frozen.replayDigest)

    const tamper = (edit: (artifact: typeof frozen) => void) => {
      const copy = clone(frozen)

      edit(copy)

      return () => replayPricingV3(copy)
    }

    type Loose = { request: Record<string, never>; snapshot: Record<string, never> }

    const input = (artifact: typeof frozen) =>
      artifact.semantic.input as unknown as Loose & {
        request: { thirdPartyCosts: Record<string, unknown>[]; contingencyWaiver?: unknown }
        snapshot: { thirdPartyPolicies: Record<string, unknown>[]; contingencyReserve: Record<string, unknown> }
      }

    // The evidence of a supplier amount, the amount, the rule of a category, the reserve, a waiver slipped in.
    expect(
      tamper(a => Object.assign(input(a).request.thirdPartyCosts[0].source as object, { reference: 'other-quote' }))
    ).toThrow('REPLAY_MISMATCH')
    expect(
      tamper(a => Object.assign(input(a).request.thirdPartyCosts[0].source as object, { effectiveUntil: '2027-12-31' }))
    ).toThrow('REPLAY_MISMATCH')
    expect(tamper(a => (input(a).request.thirdPartyCosts[0].amount = '812344'))).toThrow('REPLAY_MISMATCH')
    expect(tamper(a => (input(a).snapshot.thirdPartyPolicies[0].rate = '0.19'))).toThrow('REPLAY_MISMATCH')
    expect(tamper(a => (input(a).snapshot.contingencyReserve.rate = '0.14'))).toThrow('REPLAY_MISMATCH')
    expect(tamper(a => (input(a).request.contingencyWaiver = { reason: 'later' }))).toThrow('REPLAY_MISMATCH')
    expect(tamper(a => ((a.semantic.result.totals as unknown as Record<string, string>).thirdPartyNet = '1'))).toThrow(
      'REPLAY_MISMATCH'
    )
    expect(tamper(a => ((a.semantic as { engineVersion: string }).engineVersion = 'pricing-v3-local/1.3.0'))).toThrow(
      'REPLAY_MISMATCH'
    )
  })

  it('comparison reports the 1.4.0 amounts only when both sides carry them', () => {
    const waived = runPricingV3(build({ ...spec, waiver: 'agreed' }), '2026-06-15T00:00:00.000Z').artifact!

    const earlier = runPricingV3(
      build({ ...spec, contract: '1.3.0', costs: undefined, policies: undefined, reserve: undefined })
    ).artifact!

    const both = comparePricingV3(frozen, waived)

    expect(both.differences).toMatchObject({
      contingencyReserve: `-${amounts(frozen.semantic.result.totals).contingencyReserve}`,
      contingencyReserveWaived: amounts(frozen.semantic.result.totals).contingencyReserve,
      thirdPartyCost: '0',
      thirdPartyNet: '0'
    })

    const mixed = comparePricingV3(earlier, frozen).differences!

    for (const key of [
      'contingencyReserve',
      'contingencyBase',
      'contingencyReserveWaived',
      'thirdPartyCost',
      'thirdPartyNet'
    ])
      expect(mixed).not.toHaveProperty(key)
    expect(mixed).toHaveProperty('engagementAdjustment')
  })

  it('the client view of the kernel lane lists every row by its label and final net, the third-party ones too', () => {
    // Within policy: confirmed sources and no row under its floor.
    const artifact = runPricingV3(build({ ...spec, multiple: undefined })).artifact!

    expect(artifact.semantic.result.reviewStatus).toBe('within_policy')

    const view = projectPricingV3ForClient(artifact)
    const schedule = view.schedule.filter(item => item.kind === 'third_party')

    expect(schedule.map(item => item.lineId).sort()).toEqual([
      'media:1:third_party',
      'prod:1:third_party',
      'talent:1:third_party'
    ])
    for (const item of schedule) expect(item.net).toBe(row(artifact.semantic.result, item.lineId).net)
    expect(view.net).toBe(artifact.semantic.result.totals!.net)
    // Nothing internal: no supplier amount, rate, cost or reserve.
    expect(JSON.stringify(view)).not.toMatch(/supplier|contingency|"cost"|"rate"|margin/i)
  })
})
