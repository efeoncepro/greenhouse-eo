import {
  FAIRNESS_ADVERSE_IMPACT_SIGNAL,
  FAIRNESS_K_ANONYMITY,
  FAIRNESS_MIN_REPORTABLE_GROUPS,
  FOUR_FIFTHS_THRESHOLD,
  type FairnessReportableStage,
  type SelectionFairnessDimension,
  type SelectionFairnessReport,
} from './contracts'

export interface FairnessAggregate {
  dimensionKey: string
  categoryKey: string
  eligibleCount: number
  advancedCount: number
}
interface BuildSelectionFairnessReportInput {
  stage: FairnessReportableStage
  templateId: string | null
  windowMonths: number
  currentFrom: string
  currentTo: string
  previousFrom: string
  previousTo: string
  current: FairnessAggregate[]
  previous: FairnessAggregate[]
  computedAt?: string
}

const round = (value: number): number => Math.round(value * 10_000) / 10_000

const aggregateGroups = (rows: FairnessAggregate[]): Map<string, Map<string, FairnessAggregate>> => {
  const dimensions = new Map<string, Map<string, FairnessAggregate>>()

  for (const row of rows) {
    const groups = dimensions.get(row.dimensionKey) ?? new Map<string, FairnessAggregate>()
    const current = groups.get(row.categoryKey)

    groups.set(row.categoryKey, {
      dimensionKey: row.dimensionKey,
      categoryKey: row.categoryKey,
      eligibleCount: (current?.eligibleCount ?? 0) + row.eligibleCount,
      advancedCount: (current?.advancedCount ?? 0) + row.advancedCount,
    })
    dimensions.set(row.dimensionKey, groups)
  }

  return dimensions
}

const rateOf = (row: FairnessAggregate | undefined): number | null =>
  row && row.eligibleCount > 0 ? row.advancedCount / row.eligibleCount : null

export const buildSelectionFairnessReport = (
  input: BuildSelectionFairnessReportInput,
): SelectionFairnessReport => {
  const currentDimensions = aggregateGroups(input.current)
  const previousDimensions = aggregateGroups(input.previous)
  const dimensions: SelectionFairnessDimension[] = []

  for (const [dimensionKey, currentGroupsMap] of currentDimensions) {
    const currentGroups = [...currentGroupsMap.values()].filter((group) => group.eligibleCount >= FAIRNESS_K_ANONYMITY)

    if (currentGroups.length < FAIRNESS_MIN_REPORTABLE_GROUPS) continue

    const currentRates = currentGroups.map((group) => rateOf(group) ?? 0)
    const referenceRate = Math.max(...currentRates)
    const referenceIndex = currentRates.indexOf(referenceRate)
    const previousGroupsMap = previousDimensions.get(dimensionKey) ?? new Map<string, FairnessAggregate>()

    const previousRates = [...previousGroupsMap.values()]
      .filter((group) => group.eligibleCount >= FAIRNESS_K_ANONYMITY)
      .map((group) => rateOf(group) ?? 0)

    const previousReferenceRate = previousRates.length >= FAIRNESS_MIN_REPORTABLE_GROUPS ? Math.max(...previousRates) : null

    const groups = currentGroups
      .map((group) => {
        const selectionRate = rateOf(group) ?? 0
        const impactRatio = referenceRate > 0 ? selectionRate / referenceRate : null
        const previousRate = rateOf(previousGroupsMap.get(group.categoryKey))

        const previousImpactRatio =
          previousRate != null && previousReferenceRate != null && previousReferenceRate > 0
            ? previousRate / previousReferenceRate
            : null

        const adverseImpact = impactRatio != null && impactRatio < FOUR_FIFTHS_THRESHOLD

        return {
          categoryKey: group.categoryKey,
          eligibleCount: group.eligibleCount,
          advancedCount: group.advancedCount,
          selectionRate: round(selectionRate),
          impactRatio: impactRatio == null ? null : round(impactRatio),
          previousSelectionRate: previousRate == null ? null : round(previousRate),
          rateDrift: previousRate == null ? null : round(selectionRate - previousRate),
          impactRatioDrift:
            impactRatio == null || previousImpactRatio == null ? null : round(impactRatio - previousImpactRatio),
          adverseImpact,
        }
      })
      .sort((a, b) => a.categoryKey.localeCompare(b.categoryKey))

    dimensions.push({
      dimensionKey,
      referenceCategoryKey: referenceRate > 0 ? currentGroups[referenceIndex]?.categoryKey ?? null : null,
      verdict: groups.some((group) => group.adverseImpact) ? 'adverse_impact' : 'monitoring',
      groups,
    })
  }

  dimensions.sort((a, b) => a.dimensionKey.localeCompare(b.dimensionKey))

  const adverseImpact = dimensions.some((dimension) => dimension.verdict === 'adverse_impact')
  const verdict = dimensions.length === 0 ? 'insufficient_sample' : adverseImpact ? 'adverse_impact' : 'monitoring'

  const sampleSize = dimensions.reduce(
    (max, dimension) => Math.max(max, dimension.groups.reduce((sum, group) => sum + group.eligibleCount, 0)),
    0,
  )

  return {
    scope: { stage: input.stage, templateId: input.templateId },
    window: {
      months: input.windowMonths,
      currentFrom: input.currentFrom,
      currentTo: input.currentTo,
      previousFrom: input.previousFrom,
      previousTo: input.previousTo,
    },
    privacy: {
      k: FAIRNESS_K_ANONYMITY,
      minimumReportableGroups: FAIRNESS_MIN_REPORTABLE_GROUPS,
      bucket: 'cohort_month',
    },
    sampleSize,
    verdict,
    dimensions,
    signal: adverseImpact
      ? { signalId: FAIRNESS_ADVERSE_IMPACT_SIGNAL, severity: 'warning', triggered: true }
      : null,
    computedAt: input.computedAt ?? new Date().toISOString(),
  }
}
