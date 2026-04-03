import 'server-only'

import { getDb } from '@/lib/db'
import type { IntegrationRegistryEntry } from '@/types/integrations'

const mapRow = (row: Record<string, unknown>): IntegrationRegistryEntry => ({
  integrationKey: row.integration_key as string,
  displayName: row.display_name as string,
  integrationType: row.integration_type as IntegrationRegistryEntry['integrationType'],
  sourceSystem: row.source_system as string,
  description: row.description as string | null,
  owner: row.owner as string | null,
  consumerDomains: (row.consumer_domains ?? []) as string[],
  authMode: row.auth_mode as string | null,
  syncCadence: row.sync_cadence as string | null,
  syncEndpoint: row.sync_endpoint as string | null,
  environment: row.environment as string,
  contractVersion: row.contract_version as string | null,
  readinessStatus: row.readiness_status as IntegrationRegistryEntry['readinessStatus'],
  active: row.active as boolean,
  pausedAt: row.paused_at ? String(row.paused_at) : null,
  pausedReason: row.paused_reason as string | null,
  lastHealthCheckAt: row.last_health_check_at ? String(row.last_health_check_at) : null,
  metadata: (row.metadata ?? {}) as Record<string, unknown>,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at)
})

/** Read all active integrations from the registry */
export const getIntegrationRegistry = async (): Promise<IntegrationRegistryEntry[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.integration_registry')
    .selectAll()
    .where('active', '=', true)
    .orderBy('display_name', 'asc')
    .execute()

  return rows.map(mapRow)
}

/** Read a single integration by key */
export const getIntegrationByKey = async (
  integrationKey: string
): Promise<IntegrationRegistryEntry | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_sync.integration_registry')
    .selectAll()
    .where('integration_key', '=', integrationKey)
    .executeTakeFirst()

  if (!row) return null

  return mapRow(row)
}

/** Pause an integration */
export const pauseIntegration = async (integrationKey: string, reason: string): Promise<boolean> => {
  const db = await getDb()

  const result = await db
    .updateTable('greenhouse_sync.integration_registry')
    .set({
      paused_at: new Date().toISOString(),
      paused_reason: reason,
      readiness_status: 'blocked',
      updated_at: new Date().toISOString()
    })
    .where('integration_key', '=', integrationKey)
    .where('active', '=', true)
    .executeTakeFirst()

  return (result.numUpdatedRows ?? 0n) > 0n
}

/** Resume a paused integration */
export const resumeIntegration = async (integrationKey: string): Promise<boolean> => {
  const db = await getDb()

  const result = await db
    .updateTable('greenhouse_sync.integration_registry')
    .set({
      paused_at: null,
      paused_reason: null,
      readiness_status: 'ready',
      updated_at: new Date().toISOString()
    })
    .where('integration_key', '=', integrationKey)
    .where('active', '=', true)
    .executeTakeFirst()

  return (result.numUpdatedRows ?? 0n) > 0n
}

/** Register a new integration (self-service) */
export const registerIntegration = async (
  entry: Pick<IntegrationRegistryEntry, 'integrationKey' | 'displayName' | 'integrationType' | 'sourceSystem' | 'consumerDomains'> &
  Partial<Pick<IntegrationRegistryEntry, 'description' | 'owner' | 'authMode' | 'syncCadence' | 'syncEndpoint'>>
): Promise<IntegrationRegistryEntry> => {
  const db = await getDb()

  const [row] = await db
    .insertInto('greenhouse_sync.integration_registry')
    .values({
      integration_key: entry.integrationKey,
      display_name: entry.displayName,
      integration_type: entry.integrationType,
      source_system: entry.sourceSystem,
      description: entry.description ?? null,
      owner: entry.owner ?? null,
      consumer_domains: entry.consumerDomains,
      auth_mode: entry.authMode ?? null,
      sync_cadence: entry.syncCadence ?? null,
      sync_endpoint: entry.syncEndpoint ?? null,
      readiness_status: 'unknown',
      active: true
    })
    .returningAll()
    .execute()

  return mapRow(row)
}
