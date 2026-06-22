import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'

/**
 * TASK-1171 Slice 4 — Reactive consumer: propaga el flip `sync_enabled` de un
 * `space_notion_source` (PG) a BigQuery (`greenhouse.space_notion_sources`).
 *
 * Por qué reactivo y no inline en el command:
 *   El command `enableClientIcoSync` corre en el runtime Vercel, que tiene BQ
 *   **read-only** (regla canónica: no BQ writes desde route handlers). El MERGE
 *   inline degradaba (`bigQueryReplicated=false`). El pipeline Notion→BQ (repo
 *   hermano) lee el flag desde BQ, así que un cliente NUEVO no se tomaba hasta
 *   tener el flag en BQ. Este consumer cierra el gap: corre en ops-worker (que
 *   SÍ tiene BQ write, igual que el materializer ICO), disparado por el outbox
 *   event `space_notion_source.ico_sync_enabled`.
 *
 * Canonical TASK-771: NO confía el payload del evento como source of truth —
 * re-lee PG por `source_id` y MERGEa el estado real. Idempotente (MERGE ON
 * space_id). domain `delivery` (tiene scheduler `ops-reactive-delivery`).
 */

const BQ_DATASET = 'greenhouse'
const BQ_TABLE = 'space_notion_sources'

interface SourceRowForBq extends Record<string, unknown> {
  source_id: string
  space_id: string
  client_id: string | null
  notion_db_proyectos: string
  notion_db_tareas: string
  notion_db_sprints: string | null
  notion_db_revisiones: string | null
  sync_enabled: boolean
  created_by: string | null
}

export const spaceNotionSourceIcoSyncBqProjection: ProjectionDefinition = {
  name: 'space_notion_source_ico_sync_bq',
  description:
    'TASK-1171 Slice 4 — MERGE space_notion_sources (PG) → BigQuery al activar el sync ICO de un cliente. Re-read PG por source_id (canonical), idempotente por space_id, corre en ops-worker (BQ write). Cierra el onboarding ICO escalable: un cliente nuevo queda visible para el pipeline Notion→BQ.',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.spaceNotionSourceIcoSyncEnabled],
  extractScope: (payload: Record<string, unknown>) => {
    const sourceId = typeof payload.sourceId === 'string' ? payload.sourceId.trim() : ''

    if (!sourceId) return null

    return { entityType: 'space_notion_source', entityId: sourceId }
  },
  refresh: async scope => {
    const sourceId = scope.entityId

    if (!sourceId) return null

    const rows = await runGreenhousePostgresQuery<SourceRowForBq>(
      `SELECT sns.source_id, sns.space_id, s.client_id,
              sns.notion_db_proyectos, sns.notion_db_tareas,
              sns.notion_db_sprints, sns.notion_db_revisiones,
              sns.sync_enabled, sns.created_by
       FROM greenhouse_core.space_notion_sources sns
       JOIN greenhouse_core.spaces s ON s.space_id = sns.space_id
       WHERE sns.source_id = $1`,
      [sourceId]
    )

    const source = rows[0]

    if (!source) {
      // El source desapareció (raza con un delete) → no-op seguro.
      return `space_notion_source_ico_sync_bq: no-op, source ${sourceId} no encontrado en PG`
    }

    try {
      const projectId = getBigQueryProjectId()
      const bq = getBigQueryClient()

      await bq.query({
        query: `
          MERGE \`${projectId}.${BQ_DATASET}.${BQ_TABLE}\` AS target
          USING (
            SELECT
              @sourceId AS source_id,
              @spaceId AS space_id,
              @clientId AS client_id,
              @dbProyectos AS notion_db_proyectos,
              @dbTareas AS notion_db_tareas,
              @dbSprints AS notion_db_sprints,
              @dbRevisiones AS notion_db_revisiones,
              CAST(NULL AS STRING) AS notion_workspace_id,
              @syncEnabled AS sync_enabled,
              'daily' AS sync_frequency,
              CAST(NULL AS TIMESTAMP) AS last_synced_at,
              CURRENT_TIMESTAMP() AS created_at,
              CURRENT_TIMESTAMP() AS updated_at,
              @createdBy AS created_by
          ) AS source
          ON target.space_id = source.space_id
          WHEN MATCHED THEN UPDATE SET
            sync_enabled = source.sync_enabled,
            updated_at = CURRENT_TIMESTAMP()
          WHEN NOT MATCHED THEN INSERT ROW
        `,
        params: {
          sourceId: source.source_id,
          spaceId: source.space_id,
          clientId: source.client_id ?? null,
          dbProyectos: source.notion_db_proyectos,
          dbTareas: source.notion_db_tareas,
          dbSprints: source.notion_db_sprints || null,
          dbRevisiones: source.notion_db_revisiones || null,
          syncEnabled: source.sync_enabled === true,
          createdBy: source.created_by ?? null
        },
        types: {
          sourceId: 'STRING',
          spaceId: 'STRING',
          clientId: 'STRING',
          dbProyectos: 'STRING',
          dbTareas: 'STRING',
          dbSprints: 'STRING',
          dbRevisiones: 'STRING',
          syncEnabled: 'BOOL',
          createdBy: 'STRING'
        }
      })

      return `space_notion_source_ico_sync_bq: BQ sync_enabled=${source.sync_enabled === true} para space=${source.space_id}`
    } catch (err) {
      captureWithDomain(err, 'delivery', {
        level: 'error',
        tags: { source: 'space_notion_source_ico_sync_bq', stage: 'bq_merge' },
        extra: { sourceId, spaceId: source.space_id }
      })

      throw err // retry exponencial canonical → dead-letter si persiste
    }
  },
  maxRetries: 3
}
