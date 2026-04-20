import 'server-only'

export type ConstraintIssue = {
  field: string
  rule: string
  message: string
  severity: 'error' | 'warning'
}

const issue = (
  field: string,
  rule: string,
  message: string,
  severity: ConstraintIssue['severity'] = 'error'
): ConstraintIssue => ({
  field,
  rule,
  message,
  severity
})

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const monotonicTriple = (
  minField: string,
  optField: string,
  maxField: string,
  input: Record<string, unknown>
) => {
  const min = toNumber(input[minField])
  const opt = toNumber(input[optField])
  const max = toNumber(input[maxField])

  if (min === null || opt === null || max === null) return [] as ConstraintIssue[]
  if (min <= opt && opt <= max) return [] as ConstraintIssue[]

  return [
    issue(
      optField,
      'monotonic_triple',
      `${minField} <= ${optField} <= ${maxField} must hold for pricing governance rows.`
    )
  ]
}

const nonNegativeFields = (fields: string[], input: Record<string, unknown>) =>
  fields.flatMap(field => {
    const value = toNumber(input[field])

    if (value === null) return []
    if (value >= 0) return []

    return [issue(field, 'non_negative', `${field} must be greater than or equal to 0.`)]
  })

export const validateSellableRole = (input: Record<string, unknown>): ConstraintIssue[] => {
  const issues: ConstraintIssue[] = []
  const roleLabelEs = typeof input.roleLabelEs === 'string' ? input.roleLabelEs.trim() : ''

  if (!roleLabelEs) {
    issues.push(issue('roleLabelEs', 'required', 'roleLabelEs is required.'))
  }

  const tier = typeof input.tier === 'string' ? input.tier.trim() : ''

  if (tier && !['1', '2', '3', '4'].includes(tier)) {
    issues.push(issue('tier', 'enum', 'tier must be one of 1, 2, 3, 4.'))
  }

  return issues
}

export const validateToolCatalog = (input: Record<string, unknown>): ConstraintIssue[] => {
  const issues = nonNegativeFields(
    ['subscriptionAmount', 'subscriptionSeats', 'proratingQty', 'proratedCostUsd', 'proratedPriceUsd'],
    input
  )

  const costModel = typeof input.costModel === 'string' ? input.costModel.trim() : ''
  const subscriptionAmount = toNumber(input.subscriptionAmount)

  if (costModel === 'subscription' && subscriptionAmount !== null && subscriptionAmount < 0) {
    issues.push(issue('subscriptionAmount', 'subscription_non_negative', 'subscriptionAmount must be non-negative for subscription costModel.'))
  }

  return issues
}

export const validateOverheadAddon = (input: Record<string, unknown>): ConstraintIssue[] => [
  ...nonNegativeFields(
    ['costInternalUsd', 'marginPct', 'finalPriceUsd', 'finalPricePct', 'pctMin', 'pctMax', 'minimumAmountUsd'],
    input
  ),
  ...monotonicTriple('pctMin', 'finalPricePct', 'pctMax', input)
]

export const validateRoleTierMargin = (input: Record<string, unknown>): ConstraintIssue[] =>
  monotonicTriple('marginMin', 'marginOpt', 'marginMax', input)

export const validateCommercialModelMultiplier = (input: Record<string, unknown>): ConstraintIssue[] => {
  const multiplierPct = toNumber(input.multiplierPct)

  if (multiplierPct === null) return []
  if (multiplierPct >= -50 && multiplierPct <= 100) return []

  return [
    issue(
      'multiplierPct',
      'commercial_model_multiplier_range',
      'multiplierPct must stay between -50 and 100.'
    )
  ]
}

export const validateCountryPricingFactor = (input: Record<string, unknown>): ConstraintIssue[] =>
  monotonicTriple('factorMin', 'factorOpt', 'factorMax', input)

export const validateEmploymentType = (input: Record<string, unknown>): ConstraintIssue[] => {
  const previsional = toNumber(input.previsionalPctDefault)

  if (previsional === null) return []
  if (previsional >= 0 && previsional <= 50) return []

  return [
    issue(
      'previsionalPctDefault',
      'previsional_pct_default_range',
      'previsionalPctDefault must stay between 0 and 50.'
    )
  ]
}

export const validateCostComponents = (input: Record<string, unknown>): ConstraintIssue[] => {
  const issues = nonNegativeFields(
    [
      'baseSalaryUsd',
      'bonusJitUsd',
      'bonusRpaUsd',
      'bonusArUsd',
      'bonusSobrecumplimientoUsd',
      'gastosPrevisionalesUsd',
      'feeDeelUsd',
      'feeEorUsd'
    ],
    input
  )

  const hoursPerFteMonth = toNumber(input.hoursPerFteMonth)

  if (hoursPerFteMonth !== null && (hoursPerFteMonth < 80 || hoursPerFteMonth > 220)) {
    issues.push(
      issue(
        'hoursPerFteMonth',
        'hours_per_fte_month_range',
        'hoursPerFteMonth must stay between 80 and 220.'
      )
    )
  }

  return issues
}

export const validatePricingRow = (input: Record<string, unknown>): ConstraintIssue[] =>
  nonNegativeFields(['hourlySellUsd', 'monthlySellUsd', 'minimumAmountUsd'], input)

export const validateFteHoursGuide = (input: Record<string, unknown>): ConstraintIssue[] => {
  const issues: ConstraintIssue[] = []
  const fteFraction = toNumber(input.fteFraction)
  const hoursPerMonth = toNumber(input.hoursPerMonth)

  if (fteFraction !== null && (fteFraction < 0.05 || fteFraction > 1.5)) {
    issues.push(
      issue(
        'fteFraction',
        'fte_fraction_range',
        'fteFraction must stay between 0.05 and 1.5.'
      )
    )
  }

  if (hoursPerMonth !== null && (hoursPerMonth < 80 || hoursPerMonth > 220)) {
    issues.push(
      issue(
        'hoursPerMonth',
        'hours_per_month_range',
        'hoursPerMonth must stay between 80 and 220.'
      )
    )
  }

  return issues
}

export const getBlockingConstraintIssues = (issues: ConstraintIssue[]) =>
  issues.filter(issueEntry => issueEntry.severity === 'error')
