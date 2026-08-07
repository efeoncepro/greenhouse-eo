/**
 * TASK-1304 — Mirror reactivo de `seo_site_audit_runs` → BigQuery
 * `greenhouse_growth_analytics.seo_site_audit_history` (serie analítica del audit).
 *
 * Espeja UNA fila por run TERMINADO (succeeded/degraded/failed) con el rollup de
 * findings por severidad — los findings detallados viven en PG (append-only, ellos SON
 * el historial diagnóstico); BQ recibe la dimensión analítica del run para la serie
 * larga y el modelo dimensional downstream.
 *
 * Contrato del consumer (patrón `rank-history-bq-mirror`): re-lee PG por `audit_run_id`
 * — NUNCA confía el payload como source of truth — y MERGEa idempotente (append-only,
 * sin WHEN MATCHED). Timestamps viajan como STRING y se castean en SQL (ISSUE-082).
 *
 * El dataset/tabla se crean como paso de ROLLOUT (`bq mk` documentado en el runbook),
 * nunca auto-create en el hot path.
 */

import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_RANK_HISTORY_DATASET } from '../rank-history-bq-mirror'

export const SEO_SITE_AUDIT_HISTORY_TABLE = 'seo_site_audit_history'

type AuditRunRowForBq = {
  audit_run_id: string
  seo_target_id: string
  organization_id: string
  capture_date: string
  status: string
  crawled_pages: number | null
  health_score: string | null
  provider_cost: string
  findings_critical: number
  findings_warning: number
  findings_notice: number
  started_at: string | null
  finished_at: string | null
}

export interface MirrorSiteAuditRunResult {
  auditRunId: string
  rowsMirrored: number
}

/**
 * Espeja a BQ un run terminado. Idempotente: el MERGE por `audit_run_id` hace que
 * re-procesar el evento no duplique historia. Un run aún en `running` es no-op.
 */
export const mirrorSiteAuditRunToBq = async (auditRunId: string): Promise<MirrorSiteAuditRunResult> => {
  const rows = await runGreenhousePostgresQuery<AuditRunRowForBq>(
    `SELECT r.audit_run_id,
            r.seo_target_id,
            t.organization_id,
            r.capture_date::text AS capture_date,
            r.status,
            r.crawled_pages,
            r.health_score::text AS health_score,
            r.provider_cost::text AS provider_cost,
            COUNT(*) FILTER (WHERE f.severity = 'critical')::int AS findings_critical,
            COUNT(*) FILTER (WHERE f.severity = 'warning')::int AS findings_warning,
            COUNT(*) FILTER (WHERE f.severity = 'notice')::int AS findings_notice,
            to_char(r.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS started_at,
            to_char(r.finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS finished_at
       FROM greenhouse_growth.seo_site_audit_runs r
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = r.seo_target_id
       LEFT JOIN greenhouse_growth.seo_site_audit_findings f ON f.audit_run_id = r.audit_run_id
      WHERE r.audit_run_id = $1
        AND r.status IN ('succeeded', 'degraded', 'failed')
      GROUP BY r.audit_run_id, r.seo_target_id, t.organization_id, r.capture_date, r.status,
               r.crawled_pages, r.health_score, r.provider_cost, r.started_at, r.finished_at`,
    [auditRunId]
  )

  const row = rows[0]

  if (!row) {
    return { auditRunId, rowsMirrored: 0 }
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `MERGE \`${projectId}.${SEO_RANK_HISTORY_DATASET}.${SEO_SITE_AUDIT_HISTORY_TABLE}\` T
      USING (
        SELECT
          @audit_run_id AS audit_run_id,
          @seo_target_id AS seo_target_id,
          @organization_id AS organization_id,
          CAST(@capture_date AS DATE) AS capture_date,
          @status AS status,
          ${row.crawled_pages !== null ? '@crawled_pages' : 'CAST(NULL AS INT64)'} AS crawled_pages,
          ${row.health_score !== null ? 'CAST(@health_score AS NUMERIC)' : 'CAST(NULL AS NUMERIC)'} AS health_score,
          CAST(@provider_cost AS NUMERIC) AS provider_cost,
          @findings_critical AS findings_critical,
          @findings_warning AS findings_warning,
          @findings_notice AS findings_notice,
          ${row.started_at !== null ? 'TIMESTAMP(@started_at)' : 'CAST(NULL AS TIMESTAMP)'} AS started_at,
          ${row.finished_at !== null ? 'TIMESTAMP(@finished_at)' : 'CAST(NULL AS TIMESTAMP)'} AS finished_at
      ) S
      ON T.audit_run_id = S.audit_run_id
      WHEN NOT MATCHED THEN INSERT (
        audit_run_id, seo_target_id, organization_id, capture_date, status, crawled_pages,
        health_score, provider_cost, findings_critical, findings_warning, findings_notice,
        started_at, finished_at
      ) VALUES (
        S.audit_run_id, S.seo_target_id, S.organization_id, S.capture_date, S.status,
        S.crawled_pages, S.health_score, S.provider_cost, S.findings_critical,
        S.findings_warning, S.findings_notice, S.started_at, S.finished_at
      )`,
    params: {
      audit_run_id: row.audit_run_id,
      seo_target_id: row.seo_target_id,
      organization_id: row.organization_id,
      capture_date: row.capture_date,
      status: row.status,
      provider_cost: row.provider_cost,
      findings_critical: row.findings_critical,
      findings_warning: row.findings_warning,
      findings_notice: row.findings_notice,
      ...(row.crawled_pages !== null ? { crawled_pages: row.crawled_pages } : {}),
      ...(row.health_score !== null ? { health_score: row.health_score } : {}),
      ...(row.started_at !== null ? { started_at: row.started_at } : {}),
      ...(row.finished_at !== null ? { finished_at: row.finished_at } : {})
    },
    types: {
      audit_run_id: 'STRING',
      seo_target_id: 'STRING',
      organization_id: 'STRING',
      capture_date: 'STRING',
      status: 'STRING',
      provider_cost: 'STRING',
      findings_critical: 'INT64',
      findings_warning: 'INT64',
      findings_notice: 'INT64',
      ...(row.crawled_pages !== null ? { crawled_pages: 'INT64' } : {}),
      ...(row.health_score !== null ? { health_score: 'STRING' } : {}),
      ...(row.started_at !== null ? { started_at: 'STRING' } : {}),
      ...(row.finished_at !== null ? { finished_at: 'STRING' } : {})
    }
  })

  return { auditRunId, rowsMirrored: 1 }
}
