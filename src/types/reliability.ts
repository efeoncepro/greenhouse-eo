/**
 * Reliability Control Plane — canonical types
 *
 * Foundation contract that lets Admin Center, Ops Health and Cloud & Integrations
 * reason about module health, regressions and confidence with a shared language.
 *
 * NOTE: This layer SITS ON TOP of existing observability sources (operations
 * overview, cloud health snapshot, sentry incidents, integration data quality,
 * source sync runs). It NEVER duplicates their logic — only normalizes them
 * into a module-oriented, evidence-first model.
 *
 * Spec: docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md
 */

export type ReliabilityModuleKey =
  | 'finance'
  | 'integrations.notion'
  | 'cloud'
  | 'delivery'

export type ReliabilityModuleDomain =
  | 'platform'
  | 'integrations'
  | 'finance'
  | 'delivery'

export type ReliabilitySignalKind =
  | 'runtime'
  | 'posture'
  | 'incident'
  | 'freshness'
  | 'data_quality'
  | 'cost_guard'
  | 'subsystem'
  | 'test_lane'
  | 'billing'

export type ReliabilitySeverity =
  | 'ok'
  | 'warning'
  | 'error'
  | 'unknown'
  | 'not_configured'
  | 'awaiting_data'

export type ReliabilityConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type ReliabilityEvidenceKind =
  | 'endpoint'
  | 'helper'
  | 'incident'
  | 'test'
  | 'run'
  | 'doc'
  | 'sql'
  | 'metric'

export interface ReliabilityEvidence {
  kind: ReliabilityEvidenceKind
  label: string
  value: string
}

export interface ReliabilityRouteRef {
  path: string
  label: string
}

export interface ReliabilityApiRef {
  path: string
  label: string
}

export interface ReliabilityModuleDefinition {
  moduleKey: ReliabilityModuleKey
  label: string
  description: string
  domain: ReliabilityModuleDomain
  routes: ReliabilityRouteRef[]
  apis: ReliabilityApiRef[]
  dependencies: string[]
  smokeTests: string[]
  expectedSignalKinds: ReliabilitySignalKind[]
}

export interface ReliabilitySignal {
  signalId: string
  moduleKey: ReliabilityModuleKey
  kind: ReliabilitySignalKind
  source: string
  label: string
  severity: ReliabilitySeverity
  summary: string
  evidence: ReliabilityEvidence[]
  observedAt: string | null
}

export interface ReliabilityModuleSnapshot {
  moduleKey: ReliabilityModuleKey
  label: string
  description: string
  domain: ReliabilityModuleDomain
  status: ReliabilitySeverity
  confidence: ReliabilityConfidence
  summary: string
  routes: ReliabilityRouteRef[]
  apis: ReliabilityApiRef[]
  dependencies: string[]
  smokeTests: string[]
  signals: ReliabilitySignal[]
  signalCounts: Record<ReliabilitySeverity, number>
  expectedSignalKinds: ReliabilitySignalKind[]
  missingSignalKinds: ReliabilitySignalKind[]
}

export interface ReliabilityIntegrationBoundary {
  taskId: string
  moduleKey: ReliabilityModuleKey
  expectedSignalKind: ReliabilitySignalKind
  expectedSource: string
  status: 'pending' | 'partial' | 'ready'
  note: string
}

export interface ReliabilityOverview {
  generatedAt: string
  modules: ReliabilityModuleSnapshot[]
  totals: {
    totalModules: number
    healthy: number
    warning: number
    error: number
    unknownOrPending: number
  }
  integrationBoundaries: ReliabilityIntegrationBoundary[]
  notes: string[]
}
