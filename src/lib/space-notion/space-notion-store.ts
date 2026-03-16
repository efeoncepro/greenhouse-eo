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

/** Get all active (sync_enabled = true) Notion source mappings */
export const getActiveSpaceNotionSources = async (): Promise<SpaceNotionSource[]> => {
  const rows = await runGreenhousePostgresQuery<SpaceNotionSourceRow>(
    `SELECT * FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE ORDER BY created_at`
  )

  return rows.map(normalizeRow)
}
