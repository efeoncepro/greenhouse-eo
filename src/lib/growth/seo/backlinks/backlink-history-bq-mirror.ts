/**
 * TASK-1304 — Mirror reactivo de `seo_backlink_snapshots` → BigQuery
 * `greenhouse_growth_analytics.seo_backlink_history` (serie larga del perfil de enlaces).
 *
 * Contrato del consumer (patrón `rank-history-bq-mirror`): re-lee PG por
 * (target, capture_date) — NUNCA confía el payload como source of truth — y MERGEa por
 * `backlink_snapshot_id` (idempotente, append-only, sin WHEN MATCHED). Timestamps y
 * numéricos decimales viajan como STRING y se castean en SQL (ISSUE-082).
 *
 * El dataset/tabla se crean como paso de ROLLOUT (`bq mk` documentado en el runbook),
 * nunca auto-create en el hot path.
 */

import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_RANK_HISTORY_DATASET } from '../rank-history-bq-mirror'

export const SEO_BACKLINK_HISTORY_TABLE = 'seo_backlink_history'

type BacklinkSnapshotRowForBq = {
  backlink_snapshot_id: string
  seo_target_id: string
  organization_id: string
  capture_date: string
  referring_domains: number | null
  backlinks_total: string | null
  domain_rank: string | null
  toxic_share: string | null
  new_lost_delta: string
  provider_cost: string
  captured_at: string
}

export interface MirrorBacklinkSnapshotsResult {
  seoTargetId: string
  captureDate: string
  rowsMirrored: number
}

/**
 * Espeja a BQ el snapshot de un (target, capture_date). Idempotente: el MERGE por
 * `backlink_snapshot_id` hace que re-procesar el evento no duplique historia.
 */
export const mirrorBacklinkSnapshotsToBq = async (
  seoTargetId: string,
  captureDate: string
): Promise<MirrorBacklinkSnapshotsResult> => {
  const rows = await runGreenhousePostgresQuery<BacklinkSnapshotRowForBq>(
    `SELECT s.backlink_snapshot_id,
            s.seo_target_id,
            t.organization_id,
            s.capture_date::text AS capture_date,
            s.referring_domains,
            s.backlinks_total::text AS backlinks_total,
            s.domain_rank::text AS domain_rank,
            s.toxic_share::text AS toxic_share,
            s.new_lost_delta::text AS new_lost_delta,
            s.provider_cost::text AS provider_cost,
            to_char(s.captured_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS captured_at
       FROM greenhouse_growth.seo_backlink_snapshots s
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
      WHERE s.seo_target_id = $1
        AND s.capture_date = $2::date`,
    [seoTargetId, captureDate]
  )

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  for (const row of rows) {
    await bigQuery.query({
      query: `MERGE \`${projectId}.${SEO_RANK_HISTORY_DATASET}.${SEO_BACKLINK_HISTORY_TABLE}\` T
        USING (
          SELECT
            @backlink_snapshot_id AS backlink_snapshot_id,
            @seo_target_id AS seo_target_id,
            @organization_id AS organization_id,
            CAST(@capture_date AS DATE) AS capture_date,
            ${row.referring_domains !== null ? '@referring_domains' : 'CAST(NULL AS INT64)'} AS referring_domains,
            ${row.backlinks_total !== null ? 'CAST(@backlinks_total AS INT64)' : 'CAST(NULL AS INT64)'} AS backlinks_total,
            ${row.domain_rank !== null ? 'CAST(@domain_rank AS NUMERIC)' : 'CAST(NULL AS NUMERIC)'} AS domain_rank,
            ${row.toxic_share !== null ? 'CAST(@toxic_share AS NUMERIC)' : 'CAST(NULL AS NUMERIC)'} AS toxic_share,
            @new_lost_delta AS new_lost_delta,
            CAST(@provider_cost AS NUMERIC) AS provider_cost,
            TIMESTAMP(@captured_at) AS captured_at
        ) S
        ON T.backlink_snapshot_id = S.backlink_snapshot_id
        WHEN NOT MATCHED THEN INSERT (
          backlink_snapshot_id, seo_target_id, organization_id, capture_date,
          referring_domains, backlinks_total, domain_rank, toxic_share, new_lost_delta,
          provider_cost, captured_at
        ) VALUES (
          S.backlink_snapshot_id, S.seo_target_id, S.organization_id, S.capture_date,
          S.referring_domains, S.backlinks_total, S.domain_rank, S.toxic_share,
          S.new_lost_delta, S.provider_cost, S.captured_at
        )`,
      params: {
        backlink_snapshot_id: row.backlink_snapshot_id,
        seo_target_id: row.seo_target_id,
        organization_id: row.organization_id,
        capture_date: row.capture_date,
        new_lost_delta: row.new_lost_delta,
        provider_cost: row.provider_cost,
        captured_at: row.captured_at,
        ...(row.referring_domains !== null ? { referring_domains: row.referring_domains } : {}),
        ...(row.backlinks_total !== null ? { backlinks_total: row.backlinks_total } : {}),
        ...(row.domain_rank !== null ? { domain_rank: row.domain_rank } : {}),
        ...(row.toxic_share !== null ? { toxic_share: row.toxic_share } : {})
      },
      types: {
        backlink_snapshot_id: 'STRING',
        seo_target_id: 'STRING',
        organization_id: 'STRING',
        capture_date: 'STRING',
        new_lost_delta: 'STRING',
        provider_cost: 'STRING',
        captured_at: 'STRING',
        ...(row.referring_domains !== null ? { referring_domains: 'INT64' } : {}),
        ...(row.backlinks_total !== null ? { backlinks_total: 'STRING' } : {}),
        ...(row.domain_rank !== null ? { domain_rank: 'STRING' } : {}),
        ...(row.toxic_share !== null ? { toxic_share: 'STRING' } : {})
      }
    })
  }

  return { seoTargetId, captureDate, rowsMirrored: rows.length }
}
