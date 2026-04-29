/**
 * TASK-729 — Payroll Data Quality detectors barrel export.
 *
 * Cada detector es read-only, idempotente, fail-soft. Si la query falla
 * (schema legacy, connection issue, timeout), reporta `info` con valor
 * neutro — NUNCA throw.
 */

export { detectStuckDraftPeriods } from './stuck-draft-periods'
export { detectCompensationVersionOverlaps } from './compensation-version-overlaps'
export { detectPreviredSyncFreshness } from './previred-sync-freshness'
export { detectProjectionQueueFailures } from './projection-queue-failures'

export {
  PAYROLL_PLATFORM_METRIC_KEYS,
  PAYROLL_OPERATIONAL_METRIC_KEYS,
  isPayrollPlatformMetric,
  type PayrollDataQualityMetric
} from './types'
