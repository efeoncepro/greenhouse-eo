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
  environment: string
  contractVersion: string | null
  readinessStatus: IntegrationReadiness
  active: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
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
