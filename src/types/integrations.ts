// ── TASK-188: Native Integrations Layer — Shared Types ──

/** Taxonomy of native integrations per GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1 */
export type IntegrationType =
  | 'system_upstream'
  | 'event_provider'
  | 'batch_file'
  | 'api_connector'
  | 'hybrid'

/** Readiness status for downstream consumers */
export type IntegrationReadiness = 'ready' | 'warning' | 'blocked' | 'unknown'

/** Health derived from sync runs and freshness signals */
export type IntegrationHealth = 'healthy' | 'degraded' | 'down' | 'idle' | 'not_configured'

/** A registered native integration from the registry */
export interface IntegrationRegistryEntry {
  integrationKey: string
  displayName: string
  integrationType: IntegrationType
  sourceSystem: string
  description: string | null
  owner: string | null
  consumerDomains: string[]
  authMode: string | null
  syncCadence: string | null
  syncEndpoint: string | null
  environment: string
  contractVersion: string | null
  readinessStatus: IntegrationReadiness
  active: boolean
  pausedAt: string | null
  pausedReason: string | null
  lastHealthCheckAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** Result of a sync trigger operation */
export interface SyncTriggerResult {
  integrationKey: string
  triggered: boolean
  message: string
  syncEndpoint: string | null
}

/** Result of a readiness check for downstream consumers */
export interface ReadinessCheckResult {
  integrationKey: string
  ready: boolean
  reason: string
  health: IntegrationHealth
  readinessStatus: IntegrationReadiness
  paused: boolean
  details?: Record<string, unknown> | null
}

/** Health snapshot aggregated from sync runs + freshness signals */
export interface IntegrationHealthSnapshot {
  integrationKey: string
  health: IntegrationHealth
  lastSyncAt: string | null
  syncRunsLast24h: number
  syncFailuresLast24h: number
  freshnessPercent: number
  freshnessLabel: string
}

/** Full integration entry with health for API responses */
export interface IntegrationWithHealth extends IntegrationRegistryEntry {
  healthSnapshot: IntegrationHealthSnapshot
}
