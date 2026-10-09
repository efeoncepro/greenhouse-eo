import Decimal from 'decimal.js'

import { ENGINE_VERSION, pricingV3InputSchema } from './schemas'
import type { PricingV3Input, PricingV3Source } from './schemas'

const D = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP })

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

export type PricingV3Result = {
  engineVersion: string
  binding: false
  calculationStatus: 'calculated' | 'needs_input' | 'invalid'
  reviewStatus: 'within_policy' | 'requires_review' | 'not_evaluated'
  dataMode: PricingV3Input['snapshot']['mode'] | null
  calculationCurrency: string | null
  outputCurrency: string | null
  diagnostics: Diagnostic[]
  lines: Billable[]
  totals: null | {
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
  precisionPolicy: 'decimal-80-half-up-final-line-largest-remainder-v1'
}

/** Pure calculation: all costs, country policies and FX are supplied, never fetched. */
export function calculatePricingV3(raw: unknown): PricingV3Result {
  const parsed = pricingV3InputSchema.safeParse(raw)
  const diagnostics: Diagnostic[] = []
  const lines: Billable[] = []

  const base = (status: PricingV3Result['calculationStatus']): PricingV3Result => ({
    engineVersion: ENGINE_VERSION,
    binding: false,
    calculationStatus: status,
    reviewStatus: 'not_evaluated',
    dataMode: parsed.success ? parsed.data.snapshot.mode : null,
    calculationCurrency: parsed.success ? parsed.data.snapshot.calculationCurrency : null,
    outputCurrency: parsed.success ? parsed.data.request.outputCurrency : null,
    diagnostics,
    lines: status === 'calculated' ? lines : [],
    totals: null,
    precisionPolicy: 'decimal-80-half-up-final-line-largest-remainder-v1'
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
  const pendingRows: { line: Billable; rawCost: Decimal; rawPrice: Decimal; rawCash: Decimal }[] = []

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
            discount: '',
            net: '',
            marginAmount: '',
            components: group,
            minimumMargin: policy.minimumMargin
          }
        })
      }
    }
  }

  for (const adjustment of req.adjustments) {
    duplicate(adjustment.lineIds, 'request.adjustments.lineIds')
    if (adjustment.lineIds.some(id => !req.lines.some(line => line.lineId === id)))
      report('UNKNOWN_ADJUSTMENT_LINE', 'request.adjustments', 'error')
  }

  if (req.taxTreatment.kind === 'exclusive') sourceOk(req.taxTreatment.source, 'request.taxTreatment.source')
  if (diagnostics.some(item => item.severity === 'error')) return base('invalid')
  if (diagnostics.some(item => item.severity === 'missing')) return base('needs_input')
  if (!currency) return base('needs_input')

  const precision = currency.precision
  const unit = new D(10).pow(-precision)
  const money = (value: Decimal) => value.toFixed(precision, D.ROUND_HALF_UP)

  for (const { line, rawCost, rawPrice } of pendingRows) {
    line.cost = money(rawCost.mul(outputFx))
    line.undiscountedPrice = money(rawPrice.mul(outputFx))
    line.net = line.undiscountedPrice
    line.discount = money(new D(0))
    line.components = line.components.map(component => ({
      ...component,
      trace: { ...component.trace, calculationCurrency: config.calculationCurrency, outputFx: outputFx.toString() }
    }))
    lines.push(line)
  }

  const adjustment = req.adjustments[0]

  if (adjustment) {
    const eligible = lines.filter(line => adjustment.lineIds.includes(line.parentLineId))
    const gross = eligible.reduce((sum, line) => sum.plus(line.net), new D(0))
    const total = new D(money(gross.mul(adjustment.rate)))

    const parts = eligible
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

    for (const part of parts) {
      const allocated = part.floor.plus(residue.gt(0) ? unit : 0)

      if (residue.gt(0)) residue = residue.minus(unit)
      part.line.discount = money(allocated)
      part.line.net = money(new D(part.line.net).minus(allocated))
    }
  }

  for (const line of lines) {
    line.marginAmount = money(new D(line.net).minus(line.cost))
    if (new D(line.net).isZero() || new D(line.marginAmount).div(line.net).lt(line.minimumMargin))
      report('MARGIN_BELOW_FLOOR', `result.lines.${line.lineId}`, 'review', line.parentLineId)
  }

  const sumLines = (key: 'cost' | 'undiscountedPrice' | 'discount' | 'net' | 'marginAmount') =>
    lines.reduce((sum, line) => sum.plus(line[key]), new D(0))

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
    discount: money(sumLines('discount')),
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
