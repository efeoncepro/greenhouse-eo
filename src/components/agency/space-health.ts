import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'

export type SpaceHealthZone = 'optimal' | 'attention' | 'critical'

export const getSpaceHealth = (space: AgencySpaceHealth): SpaceHealthZone => {
  const rpaCritical = space.rpaAvg !== null && space.rpaAvg > 2.5
  const otdCritical = space.otdPct !== null && space.otdPct < 70

  if (rpaCritical || otdCritical) return 'critical'

  const rpaWarning = space.rpaAvg !== null && space.rpaAvg > 1.5
  const otdWarning = space.otdPct !== null && space.otdPct < 90

  if (rpaWarning || otdWarning) return 'attention'

  return 'optimal'
}

export const HEALTH_ZONE_LABEL: Record<SpaceHealthZone, string> = {
  optimal: 'Óptimo',
  attention: 'Atención',
  critical: 'Crítico'
}

export const HEALTH_ZONE_COLOR: Record<SpaceHealthZone, 'success' | 'warning' | 'error'> = {
  optimal: 'success',
  attention: 'warning',
  critical: 'error'
}

export const HEALTH_ZONE_ORDER: Record<SpaceHealthZone, number> = {
  critical: 0,
  attention: 1,
  optimal: 2
}
