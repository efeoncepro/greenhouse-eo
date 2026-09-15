/**
 * TASK-1845 — clases de retención (paridad con `greenhouse_insights.insight_retention_classes`).
 * Declaradas al nacer; el cleanup verificable es operación posterior, nunca borrado ad hoc.
 */

export const INSIGHT_RETENTION_CLASSES = {
  edition_request: { retentionDays: 1095, appliesTo: 'insight_editions.request_json' },
  evidence_snapshot: { retentionDays: 1095, appliesTo: 'insight_evidence_snapshots' },
  editorial_plan: { retentionDays: 1095, appliesTo: 'insight_editorial_plans' }
} as const

export type InsightRetentionClass = keyof typeof INSIGHT_RETENTION_CLASSES
