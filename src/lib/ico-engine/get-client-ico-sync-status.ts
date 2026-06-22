import 'server-only'

import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-1171 Slice 5 — verify-ICO preflight: leer el estado real de sync ICO de un
 * cliente (la mitad "verify" de Slice 3). Read gobernado, Nexa-operable
 * ("¿está calculando ICO el cliente X?") y fuente de datos para la futura UI.
 *
 * Escalera "configurado ≠ fluyendo":
 *   not_connected           → no hay space_notion_source (Notion no conectado)
 *   connected_not_enabled   → source existe pero sync_enabled=FALSE
 *   enabled_not_calculating → activo pero sin métricas materializadas este período
 *                             (transitorio recién activado, o token/pipeline roto —
 *                              `lastSyncedAt` ayuda a discriminar)
 *   calculating             → métricas del cliente presentes en el período vigente
 *
 * - connected/enabled/lastSyncedAt: PG `space_notion_sources` (source of truth del flag).
 * - calculating: BQ `metric_snapshots_monthly` (per-cliente×período) — la misma tabla
 *   que alimenta el dashboard del cliente. BQ read desde Vercel es válido (read-only).
 */

export type IcoSyncStage =
  | 'not_connected'
  | 'connected_not_enabled'
  | 'enabled_not_calculating'
  | 'calculating'

export interface ClientIcoSyncStatusInput {
  tenant: TenantContext
  clientId?: string | null
  spaceId?: string | null
}

export type ClientIcoSyncStatusOutcome =
  | {
      ok: true
      clientId: string | null
      spaceId: string
      spaceName: string | null
      stage: IcoSyncStage
      connected: boolean
      enabled: boolean
      /** true = métricas del período vigente; null = BQ no se pudo consultar. */
      calculating: boolean | null
      lastSyncedAt: string | null
      currentPeriod: { year: number; month: number }
      currentTotalTasks: number | null
      currentOtdPct: number | null
      /** Último período (YYYYMM) con métricas materializadas, o null. */
      lastCalculatedPeriodKey: number | null
    }
  | {
      ok: false
      errorCode: CanonicalErrorCode
      extra?: Record<string, unknown>
    }

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  space_name: string | null
  client_id: string | null
}

interface SourceRow extends Record<string, unknown> {
  sync_enabled: boolean
  last_synced_at: Date | string | null
}

interface BqStatusRow {
  current_rows: number | null
  current_tasks: number | null
  current_otd: number | null
  last_period_key: number | null
}

export const getClientIcoSyncStatus = async (
  input: ClientIcoSyncStatusInput
): Promise<ClientIcoSyncStatusOutcome> => {
  const { tenant } = input
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'delivery.ico.sync.read', 'read', 'tenant')) {
    return { ok: false, errorCode: 'forbidden' }
  }

  const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : ''
  const spaceIdInput = typeof input.spaceId === 'string' ? input.spaceId.trim() : ''

  if (!clientId && !spaceIdInput) {
    return { ok: false, errorCode: 'ico_sync_client_not_found', extra: { hint: 'clientId o spaceId requerido' } }
  }

  const spaces = spaceIdInput
    ? await runGreenhousePostgresQuery<SpaceRow>(
        `SELECT space_id, space_name, client_id FROM greenhouse_core.spaces WHERE space_id = $1`,
        [spaceIdInput]
      )
    : await runGreenhousePostgresQuery<SpaceRow>(
        `SELECT space_id, space_name, client_id
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
  const spaceName = spaces[0].space_name ?? null
  const resolvedClientId = spaces[0].client_id ?? (clientId || null)

  // ── PG: connected / enabled / lastSyncedAt ──
  const sources = await runGreenhousePostgresQuery<SourceRow>(
    `SELECT sync_enabled, last_synced_at
     FROM greenhouse_core.space_notion_sources
     WHERE space_id = $1`,
    [spaceId]
  )

  const connected = sources.length > 0
  const enabled = connected && sources[0].sync_enabled === true
  const rawLastSynced = connected ? sources[0].last_synced_at : null

  const lastSyncedAt =
    rawLastSynced instanceof Date
      ? rawLastSynced.toISOString()
      : typeof rawLastSynced === 'string'
        ? rawLastSynced
        : null

  const now = new Date()
  const currentPeriod = { year: now.getFullYear(), month: now.getMonth() + 1 }

  // ── BQ: calculating (métricas per-cliente del período vigente) ──
  let calculating: boolean | null = false
  let currentTotalTasks: number | null = null
  let currentOtdPct: number | null = null
  let lastCalculatedPeriodKey: number | null = null

  if (connected) {
    try {
      const projectId = getBigQueryProjectId()
      const bq = getBigQueryClient()

      const [rows] = await bq.query({
        query: `
          SELECT
            COUNTIF(period_year = @y AND period_month = @m) AS current_rows,
            SUM(IF(period_year = @y AND period_month = @m, total_tasks, 0)) AS current_tasks,
            MAX(IF(period_year = @y AND period_month = @m, otd_pct, NULL)) AS current_otd,
            MAX(period_year * 100 + period_month) AS last_period_key
          FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
          WHERE client_id = @clientId OR space_id = @spaceId
        `,
        params: { y: currentPeriod.year, m: currentPeriod.month, clientId: resolvedClientId ?? '', spaceId },
        types: { y: 'INT64', m: 'INT64', clientId: 'STRING', spaceId: 'STRING' }
      })

      const row = (rows?.[0] ?? {}) as BqStatusRow
      const currentRows = Number(row.current_rows ?? 0)

      calculating = currentRows > 0
      currentTotalTasks = row.current_tasks === null || row.current_tasks === undefined ? null : Number(row.current_tasks)
      currentOtdPct = row.current_otd === null || row.current_otd === undefined ? null : Number(row.current_otd)
      lastCalculatedPeriodKey = row.last_period_key === null || row.last_period_key === undefined ? null : Number(row.last_period_key)
    } catch (error) {
      // BQ no determinable → calculating=null (honest degradation, no inventar).
      calculating = null
      captureWithDomain(error, 'delivery', {
        tags: { source: 'ico_sync_status_bq_read_failed' },
        extra: { spaceId, clientId: resolvedClientId }
      })
    }
  }

  const stage: IcoSyncStage = !connected
    ? 'not_connected'
    : !enabled
      ? 'connected_not_enabled'
      : calculating === true
        ? 'calculating'
        : 'enabled_not_calculating'

  return {
    ok: true,
    clientId: resolvedClientId,
    spaceId,
    spaceName,
    stage,
    connected,
    enabled,
    calculating,
    lastSyncedAt,
    currentPeriod,
    currentTotalTasks,
    currentOtdPct,
    lastCalculatedPeriodKey
  }
}
