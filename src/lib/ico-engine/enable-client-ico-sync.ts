import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { refreshSpaceNotionGovernance } from '@/lib/space-notion/notion-governance'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-1171 Slice 3 — Command gobernado para ACTIVAR el sync Notion->ICO de un
 * cliente (Full API Parity).
 *
 * Reemplaza el path admin-coarse `/api/integrations/notion/register` (gate
 * EFEONCE_ADMIN, sin capability ni audit ni outbox) por una acción canónica:
 *   - capability `delivery.ico.sync.enable` (can(), tenant-safe)
 *   - idempotente (re-ejecutar sobre un cliente ya activo = no-op ok)
 *   - atómica (flip PG + outbox en la misma tx, FOR UPDATE)
 *   - audit/observabilidad (outbox event + captureWithDomain)
 *   - data-driven: opera sobre CUALQUIER cliente ya conectado, cero código por cliente.
 *
 * Transport-agnóstico (devuelve un outcome, no un NextResponse): lo consumen el
 * endpoint `POST /api/delivery/ico/enable-sync`, el runtime de acciones gobernadas
 * de Nexa, MCP y CLI por igual (Full API Parity).
 *
 * Opera sobre un source YA conectado (creado por el wizard de onboarding vía
 * `writeSpaceNotionSourcesFromIntent` con `sync_enabled=FALSE`). Si el cliente no
 * tiene Notion conectado → `ico_sync_source_not_connected` (conectar primero).
 *
 * El flip se replica a BigQuery (mirror del register legacy) porque el pipeline
 * Cloud Run lee el flag desde BQ. PG es la fuente de verdad; un fallo de BQ NO
 * tumba el command (se reporta `bigQueryReplicated=false` + captureWithDomain), y
 * la señal `delivery.ico.client_absent_from_org_rollup` (Slice 1) detecta si el
 * cliente no termina fluyendo.
 */

export interface EnableClientIcoSyncInput {
  tenant: TenantContext
  /** Resolver por cliente (preferido) o por space directo. Al menos uno requerido. */
  clientId?: string | null
  spaceId?: string | null
  /** Intención del operador/agente — se persiste en el outbox para audit. */
  reason?: string | null
}

export type EnableClientIcoSyncOutcome =
  | {
      ok: true
      clientId: string | null
      spaceId: string
      sourceId: string
      /** true = ya estaba activo (no-op idempotente). */
      alreadyEnabled: boolean
      /** true = el flip se replicó a BigQuery (pipeline). */
      bigQueryReplicated: boolean
    }
  | {
      ok: false
      errorCode: CanonicalErrorCode
      extra?: Record<string, unknown>
    }

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  client_id: string | null
}

interface SourceRow extends Record<string, unknown> {
  source_id: string
  sync_enabled: boolean
  notion_db_proyectos: string
  notion_db_tareas: string
  notion_db_sprints: string | null
  notion_db_revisiones: string | null
}

export const enableClientIcoSync = async (
  input: EnableClientIcoSyncInput
): Promise<EnableClientIcoSyncOutcome> => {
  const { tenant } = input
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'delivery.ico.sync.enable', 'update', 'tenant')) {
    return { ok: false, errorCode: 'forbidden' }
  }

  const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : ''
  const spaceIdInput = typeof input.spaceId === 'string' ? input.spaceId.trim() : ''
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : null

  if (!clientId && !spaceIdInput) {
    return { ok: false, errorCode: 'ico_sync_client_not_found', extra: { hint: 'clientId o spaceId requerido' } }
  }

  // 1. Resolver el space (por spaceId directo o por clientId → space activo).
  const spaces = spaceIdInput
    ? await runGreenhousePostgresQuery<SpaceRow>(
        `SELECT space_id, client_id FROM greenhouse_core.spaces WHERE space_id = $1`,
        [spaceIdInput]
      )
    : await runGreenhousePostgresQuery<SpaceRow>(
        `SELECT space_id, client_id
         FROM greenhouse_core.spaces
         WHERE client_id = $1 AND active = TRUE
         ORDER BY created_at ASC
         LIMIT 1`,
        [clientId]
      )

  if (spaces.length === 0) {
    return { ok: false, errorCode: 'ico_sync_client_not_found', extra: { clientId: clientId || null, spaceId: spaceIdInput || null } }
  }

  const spaceId = spaces[0].space_id
  const resolvedClientId = spaces[0].client_id ?? (clientId || null)

  // 2. Cargar el source (SIN filtro sync_enabled — queremos justo el apagado).
  const sources = await runGreenhousePostgresQuery<SourceRow>(
    `SELECT source_id, sync_enabled,
            notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones
     FROM greenhouse_core.space_notion_sources
     WHERE space_id = $1`,
    [spaceId]
  )

  if (sources.length === 0) {
    return { ok: false, errorCode: 'ico_sync_source_not_connected', extra: { spaceId } }
  }

  const source = sources[0]
  const sourceId = source.source_id

  // 3. Flip atómico en PG (FOR UPDATE) + outbox en la misma tx.
  const alreadyEnabled = await withGreenhousePostgresTransaction(async client => {
    const locked = await client.query<SourceRow>(
      `SELECT source_id, sync_enabled
       FROM greenhouse_core.space_notion_sources
       WHERE source_id = $1
       FOR UPDATE`,
      [sourceId]
    )

    const wasEnabled = locked.rows[0]?.sync_enabled === true

    if (!wasEnabled) {
      await client.query(
        `UPDATE greenhouse_core.space_notion_sources
         SET sync_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE source_id = $1`,
        [sourceId]
      )

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.spaceNotionSource,
          aggregateId: sourceId,
          eventType: EVENT_TYPES.spaceNotionSourceIcoSyncEnabled,
          payload: {
            sourceId,
            spaceId,
            clientId: resolvedClientId,
            enabledByUserId: tenant.userId,
            reason
          }
        },
        client
      )
    }

    return wasEnabled
  })

  // 4. Replicar el flip a BigQuery (mirror del register legacy; el pipeline lee BQ).
  //    Idempotente (MERGE). PG es autoritativo: un fallo de BQ NO tumba el command.
  let bigQueryReplicated = false

  try {
    const projectId = getBigQueryProjectId()
    const bq = getBigQueryClient()

    await bq.query({
      query: `
        MERGE \`${projectId}.greenhouse.space_notion_sources\` AS target
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
            TRUE AS sync_enabled,
            'daily' AS sync_frequency,
            CAST(NULL AS TIMESTAMP) AS last_synced_at,
            CURRENT_TIMESTAMP() AS created_at,
            CURRENT_TIMESTAMP() AS updated_at,
            @createdBy AS created_by
        ) AS source
        ON target.space_id = source.space_id
        WHEN MATCHED THEN UPDATE SET
          sync_enabled = TRUE,
          updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN INSERT ROW
      `,
      params: {
        sourceId,
        spaceId,
        clientId: resolvedClientId,
        dbProyectos: source.notion_db_proyectos,
        dbTareas: source.notion_db_tareas,
        dbSprints: source.notion_db_sprints || null,
        dbRevisiones: source.notion_db_revisiones || null,
        createdBy: tenant.userId
      }
    })

    bigQueryReplicated = true
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'ico_sync_enable_bq_replica_failed' },
      extra: { spaceId, sourceId, clientId: resolvedClientId }
    })
  }

  // 5. Refrescar gobernanza de Notion del space (best-effort, mirror register).
  try {
    await refreshSpaceNotionGovernance(spaceId, tenant.userId)
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'ico_sync_enable_governance_refresh_failed' },
      extra: { spaceId, sourceId }
    })
  }

  return {
    ok: true,
    clientId: resolvedClientId,
    spaceId,
    sourceId,
    alreadyEnabled,
    bigQueryReplicated
  }
}
