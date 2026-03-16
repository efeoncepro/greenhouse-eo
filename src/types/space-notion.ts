/** Mapping of a Space (Account 360 tenant) to its Notion database IDs */
export interface SpaceNotionSource {
  sourceId: string
  spaceId: string

  /** Database ID of Proyectos — conceptual root of the Space in Notion */
  notionDbProyectos: string
  notionDbTareas: string
  notionDbSprints: string | null
  notionDbRevisiones: string | null

  notionWorkspaceId: string | null
  syncEnabled: boolean
  syncFrequency: 'daily' | 'hourly' | 'manual'
  lastSyncedAt: string | null

  createdAt: string
  updatedAt: string
  createdBy: string | null
}

/** Row shape returned by PostgreSQL (snake_case) */
export interface SpaceNotionSourceRow extends Record<string, unknown> {
  source_id: string
  space_id: string
  notion_db_proyectos: string
  notion_db_tareas: string
  notion_db_sprints: string | null
  notion_db_revisiones: string | null
  notion_workspace_id: string | null
  sync_enabled: boolean
  sync_frequency: string
  last_synced_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}
