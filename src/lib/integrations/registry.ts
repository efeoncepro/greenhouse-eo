import 'server-only'

import { getDb } from '@/lib/db'
import type { IntegrationRegistryEntry } from '@/types/integrations'

/** Read all active integrations from the registry */
export const getIntegrationRegistry = async (): Promise<IntegrationRegistryEntry[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.integration_registry')
    .selectAll()
    .where('active', '=', true)
    .orderBy('display_name', 'asc')
    .execute()

  return rows.map(row => ({
    integrationKey: row.integration_key,
    displayName: row.display_name,
    integrationType: row.integration_type as IntegrationRegistryEntry['integrationType'],
    sourceSystem: row.source_system,
    description: row.description,
    owner: row.owner,
    consumerDomains: row.consumer_domains ?? [],
    authMode: row.auth_mode,
    syncCadence: row.sync_cadence,
    environment: row.environment,
    contractVersion: row.contract_version,
    readinessStatus: row.readiness_status as IntegrationRegistryEntry['readinessStatus'],
    active: row.active,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }))
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

  return {
    integrationKey: row.integration_key,
    displayName: row.display_name,
    integrationType: row.integration_type as IntegrationRegistryEntry['integrationType'],
    sourceSystem: row.source_system,
    description: row.description,
    owner: row.owner,
    consumerDomains: row.consumer_domains ?? [],
    authMode: row.auth_mode,
    syncCadence: row.sync_cadence,
    environment: row.environment,
    contractVersion: row.contract_version,
    readinessStatus: row.readiness_status as IntegrationRegistryEntry['readinessStatus'],
    active: row.active,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}
