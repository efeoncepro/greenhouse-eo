export const sanitizeSnapshotForPresentation = <T extends {
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginPercent: number | null
  netMarginPercent: number | null
  notes?: string | null
}>(snapshot: T) => {
  const totalCosts = snapshot.directCostsClp + snapshot.indirectCostsClp
  const isBackfill = (snapshot.notes || '').toLowerCase().includes('backfill')
  const suspiciousPlaceholderCosts = snapshot.totalRevenueClp > 0 && totalCosts > 0 && totalCosts < 5000
  const hasCompleteCostCoverage = !(isBackfill && suspiciousPlaceholderCosts)

  // When costs are zero but revenue exists, compute margin directly (100%) instead of hiding it.
  // The previous logic nullified margins when costs were zero, but zero costs is a valid state
  // (e.g., client with revenue but no labor/expense allocations yet).
  const computedGrossMargin = snapshot.totalRevenueClp > 0 && totalCosts <= 0
    ? 1.0
    : snapshot.grossMarginPercent

  const computedNetMargin = snapshot.totalRevenueClp > 0 && totalCosts <= 0
    ? 1.0
    : snapshot.netMarginPercent

  return {
    ...snapshot,
    hasCompleteCostCoverage,
    grossMarginPercent: hasCompleteCostCoverage ? computedGrossMargin : null,
    netMarginPercent: hasCompleteCostCoverage ? computedNetMargin : null
  }
}
