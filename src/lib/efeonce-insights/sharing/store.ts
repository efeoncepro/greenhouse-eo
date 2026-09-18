import 'server-only'

/**
 * TASK-1848 — acceso a datos del ShareGrant. Sólo tablas `greenhouse_insights.insight_share_*`
 * (registradas en el boundary del dominio). El token nunca entra acá: sólo su digest.
 */

import type { InsightActor, InsightActorKind } from '../contracts/states'
import type { InsightEditionState } from '../contracts/states'
import { runInsightsQuery, toIso, type InsightsDbClient } from '../stores/db'

import type { InsightShareDownloadableOutput, InsightShareGrantRecord, InsightShareRevokeReason, InsightShareSource } from './contracts'

const GRANT_COLUMNS = `share_grant_id, organization_id, edition_id, download_outputs, label, source, expires_at,
  created_by_actor_kind, created_by_user_id, created_at, revoked_at, revoked_by_actor_kind, revoke_reason`

type GrantRow = {
  share_grant_id: string
  organization_id: string
  edition_id: string
  download_outputs: string[]
  label: string | null
  source: InsightShareSource
  expires_at: Date | string
  created_by_actor_kind: InsightActorKind
  created_by_user_id: string | null
  created_at: Date | string
  revoked_at: Date | string | null
  revoked_by_actor_kind: InsightActorKind | null
  revoke_reason: InsightShareRevokeReason | null
}

const mapGrant = (row: GrantRow): InsightShareGrantRecord => ({
  shareGrantId: row.share_grant_id,
  organizationId: row.organization_id,
  editionId: row.edition_id,
  downloadOutputs: (row.download_outputs ?? []) as InsightShareDownloadableOutput[],
  label: row.label,
  source: row.source,
  expiresAt: toIso(row.expires_at) ?? '',
  createdByActorKind: row.created_by_actor_kind,
  createdByUserId: row.created_by_user_id,
  createdAt: toIso(row.created_at) ?? '',
  revokedAt: toIso(row.revoked_at),
  revokedByActorKind: row.revoked_by_actor_kind,
  revokeReason: row.revoke_reason
})

export interface InsertInsightShareGrantInput {
  organizationId: string
  editionId: string
  tokenDigest: string
  downloadOutputs: InsightShareDownloadableOutput[]
  label: string | null
  source: InsightShareSource
  ttlDays: number
  actor: InsightActor
}

export const insertInsightShareGrant = async (client: InsightsDbClient, input: InsertInsightShareGrantInput): Promise<InsightShareGrantRecord> => {
  // `expires_at` se calcula en DB contra el MISMO now() que `created_at`: el CHECK de 90 días compara
  // ambos y un reloj de app distinto podría rozarlo.
  const rows = await runInsightsQuery<GrantRow>(
    client,
    `INSERT INTO greenhouse_insights.insight_share_grants
       (organization_id, edition_id, token_digest, download_outputs, label, source, expires_at, created_by_actor_kind, created_by_user_id)
     VALUES ($1, $2, $3, $4::text[], $5, $6, now() + make_interval(days => $7::int), $8, $9)
     RETURNING ${GRANT_COLUMNS}`,
    [input.organizationId, input.editionId, input.tokenDigest, input.downloadOutputs, input.label, input.source, input.ttlDays, input.actor.kind, input.actor.userId ?? null]
  )

  return mapGrant(rows[0]!)
}

export const countActiveInsightShareGrants = async (client: InsightsDbClient | undefined, organizationId: string, editionId: string): Promise<number> => {
  const rows = await runInsightsQuery<{ total: string }>(
    client,
    `SELECT count(*)::text AS total FROM greenhouse_insights.insight_share_grants
      WHERE organization_id = $1 AND edition_id = $2 AND revoked_at IS NULL AND expires_at > now()`,
    [organizationId, editionId]
  )

  return Number(rows[0]?.total ?? 0)
}

export const listInsightShareGrantsForEdition = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  editionId: string
): Promise<InsightShareGrantRecord[]> => {
  const rows = await runInsightsQuery<GrantRow>(
    client,
    `SELECT ${GRANT_COLUMNS} FROM greenhouse_insights.insight_share_grants
      WHERE organization_id = $1 AND edition_id = $2
      ORDER BY created_at DESC, share_grant_id COLLATE "C" DESC
      LIMIT 200`,
    [organizationId, editionId]
  )

  return rows.map(mapGrant)
}

export const getInsightShareGrant = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  shareGrantId: string,
  options: { forUpdate?: boolean } = {}
): Promise<InsightShareGrantRecord | null> => {
  const rows = await runInsightsQuery<GrantRow>(
    client,
    `SELECT ${GRANT_COLUMNS} FROM greenhouse_insights.insight_share_grants
      WHERE organization_id = $1 AND share_grant_id = $2${options.forUpdate ? ' FOR UPDATE' : ''}`,
    [organizationId, shareGrantId]
  )

  return rows[0] ? mapGrant(rows[0]) : null
}

/** Revoca un grant activo. Devuelve null si ya estaba revocado (idempotente para el caller). */
export const revokeInsightShareGrant = async (
  client: InsightsDbClient,
  input: { organizationId: string; shareGrantId: string; actor: InsightActor; reason: InsightShareRevokeReason }
): Promise<InsightShareGrantRecord | null> => {
  const rows = await runInsightsQuery<GrantRow>(
    client,
    `UPDATE greenhouse_insights.insight_share_grants
        SET revoked_at = now(), revoked_by_actor_kind = $3, revoked_by_user_id = $4, revoke_reason = $5
      WHERE organization_id = $1 AND share_grant_id = $2 AND revoked_at IS NULL
      RETURNING ${GRANT_COLUMNS}`,
    [input.organizationId, input.shareGrantId, input.actor.kind, input.actor.userId ?? null, input.reason]
  )

  return rows[0] ? mapGrant(rows[0]) : null
}

/** Retiro de edición / autoridad revocada: corta TODOS los grants vivos de la edición. */
export const revokeActiveInsightShareGrantsForEdition = async (
  client: InsightsDbClient,
  input: { organizationId: string; editionId: string; actor: InsightActor; reason: InsightShareRevokeReason }
): Promise<InsightShareGrantRecord[]> => {
  const rows = await runInsightsQuery<GrantRow>(
    client,
    `UPDATE greenhouse_insights.insight_share_grants
        SET revoked_at = now(), revoked_by_actor_kind = $3, revoked_by_user_id = $4, revoke_reason = $5
      WHERE organization_id = $1 AND edition_id = $2 AND revoked_at IS NULL
      RETURNING ${GRANT_COLUMNS}`,
    [input.organizationId, input.editionId, input.actor.kind, input.actor.userId ?? null, input.reason]
  )

  return rows.map(mapGrant)
}

/**
 * Resolución pública: el grant por digest JUNTO con todo lo que puede cortarlo — estado y audiencia
 * de la edición, organización activa y módulo `insights_v1` vigente — en UNA lectura, justo antes de
 * servir. Sin cache: revocar revoca la siguiente request.
 */
export interface ResolvedInsightShareGrant {
  grant: InsightShareGrantRecord
  editionState: InsightEditionState
  editionAudience: string
  organizationActive: boolean
  moduleActive: boolean
}

export const resolveInsightShareGrantByDigest = async (tokenDigest: string, client?: InsightsDbClient): Promise<ResolvedInsightShareGrant | null> => {
  const rows = await runInsightsQuery<GrantRow & { edition_state: InsightEditionState; edition_audience: string; organization_active: boolean; module_active: boolean }>(
    client,
    `SELECT ${GRANT_COLUMNS.split(',').map(column => `g.${column.trim()}`).join(', ')},
            e.state AS edition_state,
            e.audience AS edition_audience,
            COALESCE(o.active = TRUE AND o.status = 'active', FALSE) AS organization_active,
            EXISTS (
              SELECT 1 FROM greenhouse_client_portal.module_assignments ma
               WHERE ma.organization_id = g.organization_id
                 AND ma.module_key = 'insights_v1'
                 AND ma.effective_to IS NULL
                 AND ma.status IN ('active', 'pilot')
                 AND (ma.expires_at IS NULL OR ma.expires_at > now())
            ) AS module_active
       FROM greenhouse_insights.insight_share_grants g
       JOIN greenhouse_insights.insight_editions e ON e.edition_id = g.edition_id AND e.organization_id = g.organization_id
       LEFT JOIN greenhouse_core.organizations o ON o.organization_id = g.organization_id
      WHERE g.token_digest = $1`,
    [tokenDigest]
  )

  const row = rows[0]

  if (!row) return null

  return {
    grant: mapGrant(row),
    editionState: row.edition_state,
    editionAudience: row.edition_audience,
    organizationActive: Boolean(row.organization_active),
    moduleActive: Boolean(row.module_active)
  }
}

export const readInsightOrganizationName = async (organizationId: string): Promise<string | null> => {
  const rows = await runInsightsQuery<{ organization_name: string | null }>(
    undefined,
    `SELECT organization_name FROM greenhouse_core.organizations WHERE organization_id = $1`,
    [organizationId]
  )

  return rows[0]?.organization_name ?? null
}

export type InsightShareAccessOutcome = 'served' | 'not_found' | 'revoked' | 'expired' | 'withdrawn' | 'unavailable' | 'rate_limited'
export type InsightShareClientHint = 'unknown' | 'robot' | 'prefetch'

/** Access log mínimo. Best-effort: un fallo de log nunca bloquea ni abre el acceso. */
export const recordInsightShareAccess = async (input: {
  shareGrantId: string | null
  organizationId: string | null
  editionId: string | null
  accessKind: 'view' | 'download'
  outcome: InsightShareAccessOutcome
  output: string | null
  clientHint: InsightShareClientHint
  subjectHash: string | null
}): Promise<void> => {
  await runInsightsQuery(
    undefined,
    `INSERT INTO greenhouse_insights.insight_share_access_events
       (share_grant_id, organization_id, edition_id, access_kind, outcome, output, client_hint, subject_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [input.shareGrantId, input.organizationId, input.editionId, input.accessKind, input.outcome, input.output, input.clientHint, input.subjectHash]
  )
}

/**
 * Ventana de un minuto por (sujeto, acción) en un UPSERT atómico (patrón TASK-1724). Devuelve
 * true si el hit cabe. El caller decide fallar CERRADO ante un error de DB.
 */
export const consumeInsightShareRateBucket = async (
  subjectHash: string,
  action: 'view' | 'download',
  limitPerMinute: number,
  client?: InsightsDbClient
): Promise<boolean> => {
  const rows = await runInsightsQuery<{ hit_count: number }>(
    client,
    `INSERT INTO greenhouse_insights.insight_share_rate_buckets (subject_hash, action, window_started_at, hit_count)
     VALUES ($1, $2, date_trunc('minute', now()), 1)
     ON CONFLICT (subject_hash, action) DO UPDATE SET
       window_started_at = CASE
         WHEN insight_share_rate_buckets.window_started_at < date_trunc('minute', now()) THEN date_trunc('minute', now())
         ELSE insight_share_rate_buckets.window_started_at
       END,
       hit_count = CASE
         WHEN insight_share_rate_buckets.window_started_at < date_trunc('minute', now()) THEN 1
         ELSE insight_share_rate_buckets.hit_count + 1
       END,
       updated_at = now()
     WHERE insight_share_rate_buckets.window_started_at < date_trunc('minute', now())
        OR insight_share_rate_buckets.hit_count < $3
     RETURNING hit_count`,
    [subjectHash, action, limitPerMinute]
  )

  return rows.length > 0
}
