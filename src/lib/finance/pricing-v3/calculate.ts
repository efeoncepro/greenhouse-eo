import Decimal from 'decimal.js'

import { PRICING_V3_ENGINES, parsePricingV3Input } from './schemas'
import type {
  PricingV3AdjustmentV11,
  PricingV3ContractVersion,
  PricingV3Input,
  PricingV3PriceRounding,
  PricingV3Source
} from './schemas'

const D = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP })

/** Each contract names its own arithmetic; a result is never relabelled with the policy of another version. */
export const PRICING_V3_PRECISION_POLICIES = {
  '1.0.0': 'decimal-80-half-up-final-line-largest-remainder-v1',
  '1.1.0': 'decimal-80-half-up-final-line-ceil-multiple-largest-remainder-v2'
} as const

// "Met the floor before rounding" is read on the unrounded amounts, whose last digits are division noise: a price
// built as cost / (1 - floor) lands a hair above or below the floor by chance. Reading the rate at 60 of the 80
// working digits makes that case deterministic. MARGIN_BELOW_FLOOR itself keeps comparing without any tolerance.
const UNROUNDED_COMPLIANCE_DIGITS = 60

type Diagnostic = {
  code: string
  fieldPath: string
  lineId?: string
  severity: 'error' | 'missing' | 'review'
  message: string
  resolution: string
}

type Component = {
  componentId: string
  kind: string
  label: string
  cost: string
  price: string
  cashCommitment: string
  coverage: string[]
  trace: Record<string, string>
}

type Billable = {
  lineId: string
  parentLineId: string
  periodId: number
  kind: 'monthly' | 'setup'
  label: string
  cost: string
  undiscountedPrice: string
  discount: string
  net: string
  marginAmount: string
  components: Component[]
  minimumMargin: string
}

type Totals = {
  cost: string
  undiscountedPrice: string
  discount: string
  net: string
  marginAmount: string
  marginRate: string | null
  tax: string | null
  grandTotal: string | null
  cashCommitment: string
  uniformMonthlyNet: string | null
}

/** Contract 1.1.0 only. Identity per row and in totals: net = undiscountedPrice + uplift - discount. */
type CommercialAmounts = {
  /** Already included in `undiscountedPrice`: the policy price is `undiscountedPrice - roundingAdjustment`. */
  roundingAdjustment: string
  uplift: string
}

type Envelope<Contract extends PricingV3ContractVersion, Line, Sum> = {
  engineVersion: (typeof PRICING_V3_ENGINES)[Contract]
  binding: false
  calculationStatus: 'calculated' | 'needs_input' | 'invalid'
  reviewStatus: 'within_policy' | 'requires_review' | 'not_evaluated'
  dataMode: PricingV3Input['snapshot']['mode'] | null
  calculationCurrency: string | null
  outputCurrency: string | null
  diagnostics: Diagnostic[]
  lines: Line[]
  totals: null | Sum
  precisionPolicy: (typeof PRICING_V3_PRECISION_POLICIES)[Contract]
}

export type PricingV3ResultV10 = Envelope<'1.0.0', Billable, Totals>
export type PricingV3LineV11 = Billable & CommercialAmounts
export type PricingV3TotalsV11 = Totals & CommercialAmounts
export type PricingV3ResultV11 = Envelope<'1.1.0', PricingV3LineV11, PricingV3TotalsV11>

/** A 1.0.0 result has no 1.1.0 keys at all (absent, not zero): adding one would change its frozen digest. */
export type PricingV3Result = PricingV3ResultV10 | PricingV3ResultV11

type Row = Billable & Partial<CommercialAmounts>
type Draft = Envelope<PricingV3ContractVersion, Row, Totals & Partial<CommercialAmounts>>

/** Pure calculation: all costs, country policies and FX are supplied, never fetched. */
export function calculatePricingV3(raw: unknown): PricingV3Result {
  return calculate(raw) as PricingV3Result
}

// One code path for every contract: 1.0.0 is the case with at most one discount, no rounding and no 1.1.0 keys.
function calculate(raw: unknown): Draft {
  const { contract, parsed } = parsePricingV3Input(raw)
  const v11 = contract === '1.1.0'
  const diagnostics: Diagnostic[] = []
  const lines: Row[] = []

  const base = (status: PricingV3Result['calculationStatus']): Draft => ({
    engineVersion: PRICING_V3_ENGINES[contract],
    binding: false,
    calculationStatus: status,
    reviewStatus: 'not_evaluated',
    dataMode: parsed.success ? parsed.data.snapshot.mode : null,
    calculationCurrency: parsed.success ? parsed.data.snapshot.calculationCurrency : null,
    outputCurrency: parsed.success ? parsed.data.request.outputCurrency : null,
    diagnostics,
    lines: status === 'calculated' ? lines : [],
    totals: null,
    precisionPolicy: PRICING_V3_PRECISION_POLICIES[contract]
  })

  const report = (code: string, fieldPath: string, severity: Diagnostic['severity'], lineId?: string) => {
    diagnostics.push({
      code,
      fieldPath,
      lineId,
      severity,
      message: `Pricing input requires attention: ${code}`,
      resolution: 'Supply or correct the explicitly referenced record; no implicit fallback is applied.'
    })
  }

  if (!parsed.success) {
    parsed.error.issues.forEach(issue =>
      report(
        issue.path.includes('schemaVersion') ? 'UNSUPPORTED_SCHEMA' : 'INVALID_INPUT',
        issue.path.join('.'),
        'error'
      )
    )

    return base('invalid')
  }

  const { request: req, snapshot: config } = parsed.data
  const adjustments: PricingV3AdjustmentV11[] = req.adjustments
  const rounding: PricingV3PriceRounding | undefined = 'priceRounding' in config ? config.priceRounding : undefined
  const currency = config.currencies.find(item => item.code === req.outputCurrency)
  const baseCurrency = config.currencies.find(item => item.code === config.calculationCurrency)

  const duplicate = (values: string[], path: string) => {
    if (new Set(values).size !== values.length) report('DUPLICATE_ID', path, 'error')
  }

  duplicate(
    req.lines.map(item => item.lineId),
    'request.lines'
  )
  duplicate(
    config.profiles.map(item => item.profileId),
    'snapshot.profiles'
  )
  duplicate(
    config.resources.map(item => item.resourceId),
    'snapshot.resources'
  )
  duplicate(
    config.allocationPolicies.map(item => item.policyId),
    'snapshot.allocationPolicies'
  )
  duplicate(
    config.currencies.map(item => item.code),
    'snapshot.currencies'
  )
  duplicate(
    config.marketFactors.map(item => item.country),
    'snapshot.marketFactors'
  )
  duplicate(
    config.talentFactors.map(item => `${item.referenceCountry}:${item.country}`),
    'snapshot.talentFactors'
  )
  duplicate(
    config.pricingPolicies.map(item => `${item.profileId}:${item.offerId}:${item.engagementCode}`),
    'snapshot.pricingPolicies'
  )
  duplicate(
    config.fx.map(item => `${item.from}:${item.to}`),
    'snapshot.fx'
  )

  const sourceOk = (source: PricingV3Source, path: string, amount?: string, lineId?: string) => {
    if (source.effectiveFrom > req.quoteDate || source.effectiveUntil < req.quoteDate)
      report('STALE_SOURCE', path, 'missing', lineId)
    if (source.status === 'pending') report('MISSING_SOURCE_CONFIRMATION', path, 'missing', lineId)
    if (source.status === 'estimated') report('ESTIMATED_SOURCE', path, 'review', lineId)
    if (amount !== undefined && new D(amount).isZero() && !source.zeroReason)
      report('UNJUSTIFIED_ZERO', path, 'error', lineId)
  }

  const countryOk = (value: string | null | undefined, path: string, code: string, lineId?: string) => {
    if (!value) report(code, path, 'missing', lineId)
    else if (!config.countries.includes(value)) report('UNSUPPORTED_COUNTRY', path, 'error', lineId)
  }

  countryOk(req.offerMarketCountry, 'request.offerMarketCountry', 'MISSING_OFFER_MARKET')
  if (!currency || !baseCurrency) report('MISSING_CURRENCY', 'snapshot.currencies', 'missing')

  const fx = (from: string, to: string, path: string): Decimal => {
    if (!config.currencies.some(item => item.code === from)) report('MISSING_CURRENCY', path, 'missing')
    if (from === to) return new D(1)
    const rate = config.fx.find(item => item.from === from && item.to === to)

    if (!rate) {
      report('MISSING_FX', path, 'missing')

      return new D(1) // Calculation is withheld globally if any required conversion is missing.
    }

    sourceOk(rate.source, path)

    return new D(rate.rate)
  }

  const outputFx = fx(config.calculationCurrency, req.outputCurrency, 'snapshot.fx.output')
  const market = config.marketFactors.find(item => item.country === req.offerMarketCountry)

  if (!market) report('MISSING_MARKET_POLICY', 'snapshot.marketFactors', 'missing')
  else sourceOk(market.source, 'snapshot.marketFactors')
  if (config.mode === 'historical') report('HISTORICAL_ONLY', 'snapshot.mode', 'review')

  const allocatedCoverage = new Map<string, Decimal>()
  const allocationIds = new Set<string>()
  const pendingRows: { line: Row; rawCost: Decimal; rawPrice: Decimal; rawCash: Decimal }[] = []

  for (const [index, line] of req.lines.entries()) {
    const path = `request.lines.${index}`
    const profile = config.profiles.find(item => item.profileId === line.profileId)
    const allocation = config.allocationPolicies.find(item => item.policyId === line.allocationPolicyRef)

    const policy = config.pricingPolicies.find(
      item =>
        item.profileId === line.profileId && item.offerId === req.offerId && item.engagementCode === req.engagementCode
    )

    countryOk(line.talentCountry, `${path}.talentCountry`, 'MISSING_TALENT_COUNTRY', line.lineId)

    if (!profile) {
      report('MISSING_PROFILE', `${path}.profileId`, 'missing', line.lineId)
      continue
    }

    if (profile.seniorityCode !== line.seniorityCode)
      report('PROFILE_VARIANT_MISMATCH', `${path}.seniorityCode`, 'error', line.lineId)
    if (!profile.cost) report('MISSING_COST', `snapshot.profiles.${line.profileId}.cost`, 'missing', line.lineId)

    if (!allocation || !policy) {
      report('MISSING_POLICY', path, 'missing', line.lineId)
      continue
    }

    sourceOk(allocation.source, `${path}.allocationPolicyRef`)
    sourceOk(policy.source, `snapshot.pricingPolicies.${line.profileId}`)
    if (allocation.mode !== line.allocationMode || policy.tierCode !== profile.tierCode)
      report('POLICY_MISMATCH', path, 'error', line.lineId)
    if (policy.method === 'target_margin' && new D(policy.rate).gte(1))
      report('INVALID_MARGIN_RATE', path, 'error', line.lineId)

    const fte =
      line.dedication.unit === 'fte'
        ? new D(line.dedication.value)
        : new D(line.dedication.value).div(allocation.hoursPerFteMonth)

    if (fte.gt(1)) report('INVALID_DEDICATION', `${path}.dedication`, 'error', line.lineId)
    if (allocation.mode === 'dedicated' && new D(allocation.dedicatedBilledFte).lt(fte))
      report('INSUFFICIENT_DEDICATED_CAPACITY', path, 'error', line.lineId)

    const billedFte =
      allocation.mode === 'dedicated' ? new D(allocation.dedicatedBilledFte) : D.max(fte, allocation.minimumBilledFte)

    const localization = profile.cost?.localization

    const factor =
      localization?.kind === 'reference_adjusted'
        ? config.talentFactors.find(
            item => item.country === line.talentCountry && item.referenceCountry === localization.referenceCountry
          )
        : undefined

    if (profile.cost) {
      sourceOk(profile.cost.source, `snapshot.profiles.${line.profileId}.cost`, profile.cost.amount, line.lineId)
      if (profile.cost.covers.some(coverage => !coverage.startsWith('human_')))
        report('NON_HUMAN_LOADED_COST_REQUIRES_SPLIT', path, 'error', line.lineId)
      if (profile.cost.localization.kind === 'specific' && profile.cost.localization.country !== line.talentCountry)
        report('COST_COUNTRY_MISMATCH', path, 'error', line.lineId)
      if (profile.cost.localization.kind === 'reference_adjusted' && !factor)
        report('MISSING_TALENT_FACTOR', path, 'missing', line.lineId)
      if (factor) sourceOk(factor.source, 'snapshot.talentFactors')
    }

    const human = profile.cost
      ? new D(profile.cost.amount)
          .mul(billedFte)
          .mul(line.headcount)
          .mul(factor?.factor ?? 1)
          .mul(fx(profile.cost.currency, config.calculationCurrency, `${path}.costFx`))
      : new D(0)

    const multiplier =
      policy.method === 'markup'
        ? new D(1).plus(policy.rate)
        : new D(policy.rate).lt(1)
          ? new D(1).div(new D(1).minus(policy.rate))
          : new D(1)

    const humanPrice = human.mul(multiplier).mul(market?.factor ?? 1)
    const humanCoverage = new Set(profile.cost?.covers ?? [])
    const covered = new Set(humanCoverage)

    duplicate(profile.cost?.covers ?? [], `snapshot.profiles.${line.profileId}.cost.covers`)
    duplicate(profile.requiredCoverages, `snapshot.profiles.${line.profileId}.requiredCoverages`)

    const resources: {
      assignment: (typeof line.assignments)[number]
      resource: (typeof config.resources)[number]
      cost: Decimal
      cash: Decimal
    }[] = []

    for (const assignment of line.assignments) {
      const resource = config.resources.find(item => item.resourceId === assignment.resourceId)

      if (!resource) {
        report('MISSING_RESOURCE', `${path}.assignments`, 'missing', line.lineId)
        continue
      }

      if (allocationIds.has(assignment.allocationId)) report('DUPLICATE_ALLOCATION', path, 'error', line.lineId)
      allocationIds.add(assignment.allocationId)
      if (resource.scope !== assignment.scope) report('INVALID_RESOURCE_SCOPE', path, 'error', line.lineId)
      if (resource.unit !== 'month' && assignment.cashTiming !== 'start')
        report('INVALID_ANNUAL_CASH_TIMING', path, 'error', line.lineId)
      if (
        assignment.periodIds &&
        (new Set(assignment.periodIds).size !== assignment.periodIds.length ||
          assignment.periodIds.some(period => period > req.duration.periods))
      )
        report('INVALID_PERIOD', path, 'error', line.lineId)
      if (resource.unit === 'month' && assignment.cashTiming !== 'monthly')
        report('INVALID_MONTHLY_CASH_TIMING', path, 'error', line.lineId)
      sourceOk(resource.source, `snapshot.resources.${resource.resourceId}`, resource.amount, line.lineId)

      for (const coverage of resource.covers) {
        if (humanCoverage.has(coverage)) report('DUPLICATE_COVERAGE', path, 'error', line.lineId)
        covered.add(coverage)

        for (const period of assignment.periodIds ?? Array.from({ length: req.duration.periods }, (_, i) => i + 1)) {
          const key = `${assignment.scope}:${assignment.scopeRef}:${coverage}:${period}`
          const used = (allocatedCoverage.get(key) ?? new D(0)).plus(assignment.share)

          allocatedCoverage.set(key, used)
          if (used.gt(1)) report('DUPLICATE_COVERAGE', path, 'error', line.lineId)
        }
      }

      const cash = new D(resource.amount)
        .mul(assignment.quantity)
        .mul(assignment.share)
        .mul(fx(resource.currency, config.calculationCurrency, `${path}.resourceFx.${resource.resourceId}`))

      resources.push({ assignment, resource, cash, cost: resource.unit === 'year' ? cash.div(12) : cash })
    }

    for (const excluded of line.notApplicable) {
      if (covered.has(excluded.coverage)) report('DUPLICATE_COVERAGE', path, 'error', line.lineId)
      covered.add(excluded.coverage)
    }

    for (const coverage of profile.requiredCoverages) {
      for (let period = 1; period <= req.duration.periods; period++) {
        const active =
          humanCoverage.has(coverage) ||
          line.notApplicable.some(item => item.coverage === coverage) ||
          resources.some(
            item =>
              item.resource.covers.includes(coverage) &&
              (!item.assignment.periodIds || item.assignment.periodIds.includes(period))
          )

        if (!active) report('MISSING_COVERAGE', `${path}.coverage.${coverage}.period.${period}`, 'missing', line.lineId)
      }
    }

    for (let period = 1; period <= req.duration.periods; period++) {
      const components: Component[] = [
        {
          componentId: `${line.lineId}:human`,
          kind: 'human',
          label: profile.label,
          cost: human.toString(),
          price: humanPrice.toString(),
          cashCommitment: human.toString(),
          coverage: profile.cost?.covers ?? [],
          trace: {
            billedFte: billedFte.toString(),
            requestedFte: fte.toString(),
            headcount: String(line.headcount),
            costFactor: factor?.factor ?? '1',
            costLocalization: profile.cost?.localization.kind ?? 'missing',
            marketFactor: market?.factor ?? 'missing',
            pricingMultiplier: multiplier.toString()
          }
        }
      ]

      const setup: Component[] = []

      for (const { assignment, resource, cost, cash } of resources) {
        const periods = assignment.periodIds ?? Array.from({ length: req.duration.periods }, (_, i) => i + 1)

        if (!periods.includes(period)) continue
        const first = Math.min(...periods)

        if (resource.unit === 'once' && period !== first) continue
        const price = cost.mul(policy.basis === 'all_costs' ? multiplier : 1)
        const cashNow = resource.unit === 'year' ? (period === first ? cash : new D(0)) : cost

        const component: Component = {
          componentId: assignment.allocationId,
          kind: resource.kind,
          label: resource.label,
          cost: cost.toString(),
          price: price.toString(),
          cashCommitment: cashNow.toString(),
          coverage: resource.covers,
          trace: {
            unit: resource.unit,
            quantity: assignment.quantity,
            share: assignment.share,
            scope: assignment.scope,
            scopeRef: assignment.scopeRef,
            marketFactor: '1',
            pricingMultiplier: policy.basis === 'all_costs' ? multiplier.toString() : '1'
          }
        }

        ;(resource.unit === 'once' ? setup : components).push(component)
      }

      for (const [kind, group] of [
        ['monthly', components],
        ['setup', setup]
      ] as const) {
        if (group.length === 0) continue

        const sum = (key: 'cost' | 'price' | 'cashCommitment') =>
          group.reduce((total, component) => total.plus(component[key]), new D(0))

        pendingRows.push({
          rawCost: sum('cost'),
          rawPrice: sum('price'),
          rawCash: sum('cashCommitment'),
          line: {
            lineId: `${line.lineId}:${period}:${kind}`,
            parentLineId: line.lineId,
            periodId: period,
            kind,
            label: profile.label,
            cost: '',
            undiscountedPrice: '',
            ...(v11 ? { roundingAdjustment: '' } : {}),
            discount: '',
            ...(v11 ? { uplift: '' } : {}),
            net: '',
            marginAmount: '',
            components: group,
            minimumMargin: policy.minimumMargin
          }
        })
      }
    }
  }

  for (const adjustment of adjustments) {
    duplicate(adjustment.lineIds, 'request.adjustments.lineIds')
    if (adjustment.lineIds.some(id => !req.lines.some(line => line.lineId === id)))
      report('UNKNOWN_ADJUSTMENT_LINE', 'request.adjustments', 'error')
  }

  if (v11) {
    duplicate(
      adjustments.map(item => item.adjustmentId),
      'request.adjustments'
    )

    // A row is a (line, billing class) pair in every period; a discount claims both classes of its lines.
    const targets = adjustments.flatMap(item =>
      [...new Set(item.lineIds)].flatMap(lineId =>
        (item.kind === 'discount' ? (['monthly', 'setup'] as const) : [item.billing]).map(kind => `${kind}:${lineId}`)
      )
    )

    if (new Set(targets).size !== targets.length) report('OVERLAPPING_ADJUSTMENTS', 'request.adjustments', 'error')

    for (const [index, item] of adjustments.entries())
      if (item.kind === 'agreed_net' && currency && new D(item.amount).decimalPlaces() > currency.precision)
        report('INVALID_AGREED_AMOUNT', `request.adjustments.${index}.amount`, 'error')

    if (rounding) {
      sourceOk(rounding.source, 'snapshot.priceRounding')
      if (currency && !new D(rounding.multiple).mod(new D(10).pow(-currency.precision)).isZero())
        report('INVALID_PRICE_ROUNDING', 'snapshot.priceRounding.multiple', 'error')
    }
  }

  if (req.taxTreatment.kind === 'exclusive') sourceOk(req.taxTreatment.source, 'request.taxTreatment.source')
  if (diagnostics.some(item => item.severity === 'error')) return base('invalid')
  if (diagnostics.some(item => item.severity === 'missing')) return base('needs_input')
  if (!currency) return base('needs_input')

  const precision = currency.precision
  const unit = new D(10).pow(-precision)
  const money = (value: Decimal) => value.toFixed(precision, D.ROUND_HALF_UP)

  // Exact count of multiples covering `value`: integer division plus one correction, never ceil(a / b).
  const ceilDiv = (value: Decimal, by: Decimal) => {
    const whole = value.divToInt(by)

    return whole.mul(by).lt(value) ? whole.plus(1) : whole
  }

  for (const { line, rawCost, rawPrice } of pendingRows) {
    line.cost = money(rawCost.mul(outputFx))
    line.undiscountedPrice = money(rawPrice.mul(outputFx))

    if (v11) {
      const policyPrice = new D(line.undiscountedPrice)
      let rounded = policyPrice

      if (rounding && policyPrice.gt(0)) {
        const multiple = new D(rounding.multiple)
        const unroundedPrice = rawPrice.mul(outputFx)

        const compliant = !unroundedPrice
          .minus(rawCost.mul(outputFx))
          .div(unroundedPrice)
          .toSignificantDigits(UNROUNDED_COMPLIANCE_DIGITS)
          .lt(line.minimumMargin)

        // Floor conservation: a row that met its floor is raised to the smallest multiple that still meets it on the
        // presented cost. A row that did not is only raised to the next multiple; rounding never repairs a policy.
        rounded = (
          compliant
            ? D.max(
                ceilDiv(policyPrice, multiple),
                ceilDiv(new D(line.cost), multiple.mul(new D(1).minus(line.minimumMargin)))
              )
            : ceilDiv(policyPrice, multiple)
        ).mul(multiple)
      }

      line.roundingAdjustment = money(rounded.minus(policyPrice))
      line.undiscountedPrice = money(rounded)
      line.uplift = money(new D(0))
    }

    line.net = line.undiscountedPrice
    line.discount = money(new D(0))
    line.components = line.components.map(component => ({
      ...component,
      trace: { ...component.trace, calculationCurrency: config.calculationCurrency, outputFx: outputFx.toString() }
    }))
    lines.push(line)
  }

  // Proportional split of `total` over `rows` by largest remainder at the currency unit; ties resolve by row id, so
  // the split never depends on input order. The same routine serves discounts and uplifts.
  const allocate = (rows: Row[], gross: Decimal, total: Decimal) => {
    const parts = rows
      .map(line => {
        const raw = gross.isZero() ? new D(0) : total.mul(line.net).div(gross)
        const floor = raw.div(unit).floor().mul(unit)

        return { line, floor, remainder: raw.minus(floor) }
      })
      .sort(
        (a, b) =>
          b.remainder.cmp(a.remainder) || (a.line.lineId < b.line.lineId ? -1 : a.line.lineId > b.line.lineId ? 1 : 0)
      )

    let residue = total.minus(parts.reduce((sum, part) => sum.plus(part.floor), new D(0)))

    return parts.map(part => {
      const allocated = part.floor.plus(residue.gt(0) ? unit : 0)

      if (residue.gt(0)) residue = residue.minus(unit)

      return { line: part.line, allocated }
    })
  }

  const gross = (rows: Row[]) => rows.reduce((sum, line) => sum.plus(line.net), new D(0))

  for (const [index, adjustment] of adjustments.entries()) {
    const targeted = lines.filter(line => adjustment.lineIds.includes(line.parentLineId))

    if (adjustment.kind === 'discount') {
      const price = gross(targeted)

      for (const { line, allocated } of allocate(targeted, price, new D(money(price.mul(adjustment.rate))))) {
        line.discount = money(allocated)
        line.net = money(new D(line.net).minus(allocated))
      }

      continue
    }

    // The agreed net is per period: each period's rows of that billing class must add up to exactly `amount`.
    const groups = Array.from({ length: req.duration.periods }, (_, i) =>
      targeted.filter(line => line.kind === adjustment.billing && line.periodId === i + 1)
    ).filter(rows => rows.length > 0)

    const amount = new D(adjustment.amount)

    if (groups.length === 0 || groups.some(rows => gross(rows).isZero() && amount.gt(0))) {
      report('AGREED_NET_WITHOUT_BASE', `request.adjustments.${index}`, 'error')
      continue
    }

    for (const rows of groups) {
      const price = gross(rows)
      const gap = amount.minus(price)

      for (const { line, allocated } of allocate(rows, price, gap.abs())) {
        if (gap.lt(0)) line.discount = money(allocated)
        else line.uplift = money(allocated)
        line.net = money(new D(line.net).plus(gap.lt(0) ? allocated.neg() : allocated))
      }
    }
  }

  if (diagnostics.some(item => item.severity === 'error')) return base('invalid')

  for (const line of lines) {
    line.marginAmount = money(new D(line.net).minus(line.cost))
    if (new D(line.net).isZero() || new D(line.marginAmount).div(line.net).lt(line.minimumMargin))
      report('MARGIN_BELOW_FLOOR', `result.lines.${line.lineId}`, 'review', line.parentLineId)
  }

  const sumLines = (
    key: 'cost' | 'undiscountedPrice' | 'roundingAdjustment' | 'discount' | 'uplift' | 'net' | 'marginAmount'
  ) => lines.reduce((sum, line) => sum.plus(line[key] ?? 0), new D(0))

  const net = sumLines('net')
  const margin = sumLines('marginAmount')

  const tax =
    req.taxTreatment.kind === 'not_resolved'
      ? null
      : req.taxTreatment.kind === 'not_applicable'
        ? new D(0)
        : net.mul(req.taxTreatment.rate)

  const periodNets = Array.from({ length: req.duration.periods }, (_, i) =>
    lines
      .filter(line => line.kind === 'monthly' && line.periodId === i + 1)
      .reduce((sum, line) => sum.plus(line.net), new D(0))
  )

  const uniform = periodNets.every(value => value.eq(periodNets[0]))
  const result = base('calculated')

  result.reviewStatus = diagnostics.some(item => item.severity === 'review') ? 'requires_review' : 'within_policy'
  result.totals = {
    cost: money(sumLines('cost')),
    undiscountedPrice: money(sumLines('undiscountedPrice')),
    ...(v11 ? { roundingAdjustment: money(sumLines('roundingAdjustment')) } : {}),
    discount: money(sumLines('discount')),
    ...(v11 ? { uplift: money(sumLines('uplift')) } : {}),
    net: money(net),
    marginAmount: money(margin),
    marginRate: net.isZero() ? null : margin.div(net).toString(),
    tax: tax === null ? null : money(tax),
    grandTotal: tax === null ? null : money(net.plus(money(tax))),
    cashCommitment: money(
      pendingRows.reduce((sum, row) => sum.plus(row.rawCash.mul(outputFx).toDecimalPlaces(precision)), new D(0))
    ),
    uniformMonthlyNet: uniform ? money(periodNets[0]) : null
  }

  return result
}
