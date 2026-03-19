import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { SpaceNotionSource, SpaceNotionSourceRow } from '@/types/space-notion'

const normalizeRow = (row: SpaceNotionSourceRow): SpaceNotionSource => ({
  sourceId: row.source_id,
  spaceId: row.space_id,
  notionDbProyectos: row.notion_db_proyectos,
  notionDbTareas: row.notion_db_tareas,
  notionDbSprints: row.notion_db_sprints,
  notionDbRevisiones: row.notion_db_revisiones,
  notionWorkspaceId: row.notion_workspace_id,
  syncEnabled: row.sync_enabled,
  syncFrequency: (row.sync_frequency || 'daily') as SpaceNotionSource['syncFrequency'],
  lastSyncedAt: row.last_synced_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by
})

/** Get the Notion source mapping for a single Space */
export const getSpaceNotionSource = async (spaceId: string): Promise<SpaceNotionSource | null> => {
  const rows = await runGreenhousePostgresQuery<SpaceNotionSourceRow>(
    `SELECT * FROM greenhouse_core.space_notion_sources WHERE space_id = $1`,
    [spaceId]
  )

  return rows.length > 0 ? normalizeRow(rows[0]) : null
}

/** Get the Notion source mapping for a client (resolves client_id → space_id → source) */
export const getSpaceNotionSourceByClientId = async (clientId: string): Promise<(SpaceNotionSource & { clientId: string }) | null> => {
  const rows = await runGreenhousePostgresQuery<SpaceNotionSourceRow & { client_id: string }>(
    `SELECT sns.*, s.client_id
     FROM greenhouse_core.space_notion_sources sns
     JOIN greenhouse_core.spaces s ON s.space_id = sns.space_id
     WHERE s.client_id = $1 AND s.active = TRUE AND sns.sync_enabled = TRUE
     LIMIT 1`,
    [clientId]
  )

  if (rows.length === 0) return null

  return { ...normalizeRow(rows[0]), clientId: rows[0].client_id }
}

/** Get all active (sync_enabled = true) Notion source mappings */
export const getActiveSpaceNotionSources = async (): Promise<SpaceNotionSource[]> => {
  const rows = await runGreenhousePostgresQuery<SpaceNotionSourceRow>(
    `SELECT * FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE ORDER BY created_at`
  )

  return rows.map(normalizeRow)
}
