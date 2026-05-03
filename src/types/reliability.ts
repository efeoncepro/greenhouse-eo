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
  | 'integrations.teams'
  | 'cloud'
  | 'delivery'
  | 'home'
  | 'payroll'
  | 'sync' // TASK-773 — outbox publisher + reactive consumer + projection refreshes

export type ReliabilityModuleDomain =
  | 'platform'
  | 'integrations'
  | 'finance'
  | 'delivery'
  | 'home'
  | 'hr'
  | 'sync' // TASK-773

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

  /**
   * TASK-638 — AI Observer enriquece el Reliability Control Plane con
   * resumen ejecutivo + observaciones por módulo. La IA NO reemplaza reglas
   * determinísticas; solo agrega contexto narrativo basado en el snapshot
   * normalizado.
   */
  | 'ai_summary'

  /**
   * TASK-765 — Payment Order ↔ Bank Settlement Resilience.
   *
   * Tres categorías nuevas que cubren modos de falla distintos del path
   * `payment_order.paid → expense_payment → settlement_leg → account_balance`
   * y son reusables por cualquier futuro module que necesite el mismo
   * vocabulario:
   *
   * - `drift`: divergencia detectable entre dos sources of truth que deberían
   *   coincidir (e.g. orders en `state='paid'` sin `expense_payment` asociado
   *   tras 15min, ledger entries que no cuadran con bank statements).
   *
   * - `dead_letter`: handlers reactivos que llegaron al límite de retries y
   *   están en `outbox_reactive_log.result='dead-letter'` sin acknowledge ni
   *   recovery — requiere intervención humana antes de poder progresar.
   *
   * - `lag`: latencia anormal en pipelines async donde el upstream completó
   *   pero el downstream aún no materializa (e.g. payroll period exportado
   *   hace > 1h sin filas en `expenses`).
   */
  | 'drift'
  | 'dead_letter'
  | 'lag'

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

  /**
   * Glob patterns (minimatch syntax) que declaran qué archivos del repo
   * pertenecen a este módulo. Consumido por TASK-633 (change-based
   * verification matrix) para derivar módulos afectados desde el diff
   * de un PR y disparar solo los smoke specs relevantes.
   */
  filesOwned: string[]
  expectedSignalKinds: ReliabilitySignalKind[]

  /**
   * SLO thresholds opcionales por módulo. Forward-compat para TASK-635 V1.1
   * "SLO breach detector". Hoy no se evalúan en runtime — solo se persisten
   * para que el detector futuro los lea sin migración nueva.
   *
   * Ejemplos: `{ freshness_max_lag_hours: 6, error_rate_max_percent: 1.5 }`.
   */
  sloThresholds?: Record<string, unknown>

  /**
   * Sentry custom tag value used by `getCloudSentryIncidents({ domain })` to
   * filter open issues for this module's `incident` signal. Set per module so
   * the reliability reader can iterate the registry and produce one incident
   * signal per module without per-domain Sentry projects.
   *
   * Convention: lowercase, dot-separated, matches the values in
   * `CaptureDomain` from `src/lib/observability/capture.ts`. Example:
   * `'finance'`, `'integrations.notion'`, `'cloud'`. When omitted, the module
   * does not produce a per-domain incident signal (the reader falls back to
   * the global Sentry feed for `cloud` only).
   */
  incidentDomainTag?: string
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
