export type SeoMetricTone = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'

export const resolvePositionTone = (position: number | null): SeoMetricTone => {
  if (position === null) return 'default'
  if (position <= 10) return 'success'
  if (position <= 20) return 'warning'

  return 'error'
}

export const resolveCoverageTone = (shown: number, total: number): SeoMetricTone => {
  if (total <= 0) return 'default'
  if (shown / total >= 0.6) return 'success'
  if (shown / total >= 0.3) return 'warning'

  return 'error'
}

export const resolveOpportunityTone = (count: number | null): SeoMetricTone => {
  if (count === null) return 'default'

  return count > 0 ? 'warning' : 'success'
}
