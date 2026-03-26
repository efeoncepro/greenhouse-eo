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
  const lacksCostCoverage = snapshot.totalRevenueClp > 0 && totalCosts <= 0
  const suspiciousPlaceholderCosts = snapshot.totalRevenueClp > 0 && totalCosts > 0 && totalCosts < 5000
  const hasCompleteCostCoverage = !(lacksCostCoverage || (isBackfill && suspiciousPlaceholderCosts))

  return {
    ...snapshot,
    hasCompleteCostCoverage,
    grossMarginPercent: hasCompleteCostCoverage ? snapshot.grossMarginPercent : null,
    netMarginPercent: hasCompleteCostCoverage ? snapshot.netMarginPercent : null
  }
}
