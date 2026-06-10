/**
 * Shared activity-presentation primitives — TASK-1027.
 *
 * Pure, framework-agnostic helpers extracted from `PersonActivityTab` so that
 * Person 360 Activity (admin) and `/my/performance` (self-service) share the
 * SAME radar scaling, zone→color mapping, pending-closures rule, trend metadata
 * and CSC phase ordering instead of duplicating them.
 *
 * Intentionally NOT included: the admin period selector, the closed-month trend
 * doctrine (operates on different snapshot shapes per surface), KPI label/icon
 * config (the self-service KPI set differs), and any navigation/admin context.
 * Keeping those per-surface avoids a monolithic admin+self component.
 */

import { THRESHOLD_ZONE_COLOR, type ThresholdZone, type CscPhase } from '@/lib/ico-engine/metric-registry'

/**
 * Normalize a raw metric value to a 0–100 radar scale where higher is always
 * "healthier" (RpA and Cycle Time are inverted: lower raw value is better).
 */
export const normalizeForRadar = (metricId: string, value: number | null): number => {
  if (value === null) return 0

  switch (metricId) {
    case 'rpa':
      return Math.max(0, Math.min(100, Math.round((1 - (value - 1) / 2) * 100)))
    case 'otd_pct':
    case 'ftr_pct':
      return Math.round(Math.min(100, value))
    case 'cycle_time':
      return Math.max(0, Math.min(100, Math.round((1 - (value - 3) / 18) * 100)))
    case 'throughput':
      return Math.min(100, Math.round((value / 50) * 100))
    case 'pipeline_velocity':
      return Math.min(100, Math.round(value * 100))
    default:
      return 0
  }
}

/** Map a threshold zone to a MUI palette color; `secondary` when no zone. */
export const getZoneColor = (zone: ThresholdZone | null) =>
  zone ? THRESHOLD_ZONE_COLOR[zone] : ('secondary' as const)

/**
 * Quality metrics that should read "Sin cierres" (not `0`) when the period has
 * committed work but no completed tasks yet.
 */
export const QUALITY_PENDING_METRIC_IDS = new Set(['rpa', 'otd_pct', 'ftr_pct', 'cycle_time'])

/** True when the period has committed work but no closures to score quality yet. */
export const isPendingClosures = (totalTasks: number, completedTasks: number): boolean =>
  totalTasks > 0 && completedTasks === 0

/**
 * OTD% + FTR% own the richer trend cards; both are "higher % is better" so the
 * green-up area reads correctly. Metric names stay English canonical
 * (On-Time Delivery, First Time Right).
 */
export const TREND_CONFIG: ReadonlyArray<{ id: string; title: string; metricName: string }> = [
  { id: 'otd_pct', title: 'OTD%', metricName: 'On-Time Delivery' },
  { id: 'ftr_pct', title: 'FTR%', metricName: 'First Time Right' }
]

/** Canonical CSC phase order for distribution charts. */
export const CSC_PHASE_ORDER: ReadonlyArray<CscPhase> = [
  'briefing',
  'produccion',
  'revision_interna',
  'cambios_cliente',
  'entrega'
]
