/**
 * TASK-835 — Tipos canónicos del Sample Sprints Runtime Projection.
 *
 * Vive en archivo separado (sin `import 'server-only'`) para que los tipos
 * puedan ser re-utilizados desde código cliente (UI components) sin importar
 * el módulo server-only de la projection. La implementación
 * (`runtime-projection.ts`) sí marca `server-only`.
 *
 * Pattern fuente: `src/lib/organization-workspace/projection-types.ts` (TASK-611).
 */

export const SAMPLE_SPRINT_RUNTIME_CONTRACT_VERSION = 'sample-sprint-runtime.v1' as const

export type SampleSprintRuntimeContractVersion = typeof SAMPLE_SPRINT_RUNTIME_CONTRACT_VERSION

/**
 * Enum cerrado de razones de degradación. Cada degraded entry usa uno de estos
 * codes — NUNCA string libre. Si emerge un nuevo modo de falla, agregar al enum
 * antes de mergear.
 */
export const SAMPLE_SPRINT_DEGRADED_CODES = [
  'cost_attribution_unavailable',
  'commercial_health_unavailable',
  'capacity_unresolvable',
  'progress_snapshot_missing',
  'team_enrichment_failed'
] as const

export type SampleSprintProjectionDegradedCode = (typeof SAMPLE_SPRINT_DEGRADED_CODES)[number]

export type SampleSprintProjectionDegradedSource =
  | 'cost_attribution'
  | 'commercial_health'
  | 'capacity'
  | 'progress'
  | 'team'

export interface SampleSprintProjectionDegradedReason {
  code: SampleSprintProjectionDegradedCode
  source: SampleSprintProjectionDegradedSource
  severity: 'warning' | 'error'
  message: string
}

/**
 * 6 kinds canónicos de Commercial Health. La projection mapea sus signals 1:1
 * a estos — NUNCA inventa kinds nuevos. Si emerge necesidad, primero canonizar
 * en Commercial Health (`src/lib/commercial/sample-sprints/health.ts`), después
 * consumir aquí.
 */
export const SAMPLE_SPRINT_SIGNAL_KINDS = [
  'overdue-decision',
  'budget-overrun',
  'zombie',
  'unapproved-active',
  'stale-progress',
  'conversion-rate-drop'
] as const

export type SampleSprintSignalKind = (typeof SAMPLE_SPRINT_SIGNAL_KINDS)[number]

export type SampleSprintSignalSeverity = 'info' | 'warning' | 'error' | 'success'

export interface SampleSprintRuntimeSignal {
  kind: SampleSprintSignalKind
  label: string
  severity: SampleSprintSignalSeverity
  count: number
  /** Action-oriented runbook copy. Locale es-CL. */
  runbook: string
  /** Operative description. Locale es-CL. */
  description: string
}

/**
 * Member proyectado del equipo del sprint, enriquecido con datos canónicos
 * desde `greenhouse_core.members`.
 */
export interface SampleSprintRuntimeTeamMember {
  memberId: string
  /** Display name desde `members.display_name`. Null si el member no resuelve. */
  displayName: string | null
  /** Role title desde `members.role_title`. Null si el member no resuelve. */
  roleTitle: string | null
  /** FTE proposed en el commitment_terms_json. */
  proposedFte: number
  /** Rol en el commitment (free text definido por declarante). */
  commitmentRole: string | null
  /** True cuando memberId no matchea ninguna fila activa en members. */
  unresolved: boolean
}

export type SampleSprintCapacityRiskSeverity = 'ok' | 'warning' | 'critical'

export interface SampleSprintRuntimeCapacityRisk {
  severity: SampleSprintCapacityRiskSeverity
  /** Members con allocatedFte + proposedFte > totalFte (overcommit). */
  overcommittedMemberIds: string[]
  /** Resumen humano corto, derivado en server. */
  summary: string
}

/**
 * Item resumido para el command center.
 */
export interface SampleSprintRuntimeItem {
  serviceId: string
  /** Costo real proyectado en CLP desde `commercial_cost_attribution_v2`.
   *  `null` cuando el reader falló o no hay datos para el período. NUNCA `0` placeholder. */
  actualClp: number | null
  /** % progreso real desde último snapshot o outcome terminal.
   *  `null` cuando no hay snapshot válido. NUNCA porcentaje inventado. */
  progressPct: number | null
  /** % de uso del budget vs `expectedInternalCostClp`.
   *  `null` cuando expected=0 o actualClp=null. */
  budgetUsagePct: number | null
  /** Días desde el último snapshot. `null` cuando no hay snapshot. */
  daysSinceLastSnapshot: number | null
  /** Severity derivada server-side en base a status + signals canónicos.
   *  No se computa en cliente. */
  signalSeverity: SampleSprintSignalSeverity
}

/**
 * Detalle del sprint seleccionado.
 */
export interface SampleSprintRuntimeDetail {
  serviceId: string
  /** Equipo enriquecido. Lista vacía si no hay proposedTeam declarado. */
  team: SampleSprintRuntimeTeamMember[]
  /** Capacity risk evaluado. `null` cuando no se pudo computar (sin team o sin fechas). */
  capacityRisk: SampleSprintRuntimeCapacityRisk | null
  /** True solo cuando capacityRisk?.severity === 'critical'. `null` cuando no se pudo evaluar. */
  hasCapacityRisk: boolean | null
}

/**
 * Conversion rate snapshot expuesto al UI.
 */
export interface SampleSprintRuntimeConversionRate {
  totalOutcomes: number
  convertedOutcomes: number
  /** Conversion rate ∈ [0,1]. `null` cuando no se pudo computar. */
  rate: number | null
  /** Threshold canónico desde `resolveCommercialEngagementConversionRateThreshold`. */
  threshold: number
}

export interface SampleSprintRuntimeProjection {
  /** Indexado por serviceId → datos derivados runtime. */
  items: SampleSprintRuntimeItem[]
  /** Detalle del sprint seleccionado (si aplica). */
  selected: SampleSprintRuntimeDetail | null
  /** Signals canónicos mapeados 1:1 a Commercial Health. */
  signals: SampleSprintRuntimeSignal[]
  /** Conversion rate snapshot. */
  conversionRate: SampleSprintRuntimeConversionRate | null
  /** Razones de degradación honesta. Cero cuando todo OK. */
  degraded: SampleSprintProjectionDegradedReason[]
  /** Edad del payload — útil para el cliente. */
  generatedAt: string
  /** Versión del contrato — clientes deben validar para evolución segura. */
  contractVersion: SampleSprintRuntimeContractVersion
}
