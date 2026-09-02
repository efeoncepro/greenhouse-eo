/**
 * TASK-1304 — Reader canónico `readSiteAuditReport` (salud técnica del sitio).
 *
 * Sirve SIEMPRE desde los snapshots PG materializados (`seo_site_audit_runs` +
 * `seo_site_audit_findings`) — NUNCA pega a DataForSEO en el render (no live-per-view).
 *
 * Default: el run más reciente del target (cualquier estado — un run `running` se
 * reporta como tal, con findings vacíos: "audit en curso" es un hecho, no un error).
 * `auditRunId` explícito sirve un run puntual (tenant-safe: debe pertenecer al target).
 *
 * Honest degradation: target sin runs → `no_data` (nunca un reporte fabricado con
 * ceros); un run `succeeded` con 0 findings ES el reporte "sitio técnicamente limpio".
 *
 * Consumer-agnóstico (Full API Parity): UI (TASK-1309), Nexa, lane ecosystem y MCP
 * consumen este mismo reader. El plano fino de capability
 * (`growth.seo.observation.read` vía `can()`) es responsabilidad del consumer.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  SeoSiteAuditFindingScope,
  SeoSiteAuditFindingSeverity,
  SeoSiteAuditFindingView,
  SeoSiteAuditRunStatus,
  SeoSiteAuditRunView,
  SiteAuditReportResult
} from '../contracts'
import { isSeoModuleEnabled } from '../flags'

type RunRow = {
  audit_run_id: string
  capture_date: string
  status: SeoSiteAuditRunStatus
  crawled_pages: number | null
  health_score: string | null
  started_at: string | null
  finished_at: string | null
}

type FindingRow = {
  url: string
  issue_type: string
  severity: SeoSiteAuditFindingSeverity
  detail: Record<string, unknown> | null
  finding_scope: SeoSiteAuditFindingScope
}

type PreviousRunRow = {
  audit_run_id: string
  capture_date: string
  health_score: string | null
  critical_count: number
  warning_count: number
  notice_count: number
}

const SEVERITIES: SeoSiteAuditFindingSeverity[] = ['critical', 'warning', 'notice']

const toRunView = (row: RunRow): SeoSiteAuditRunView => ({
  auditRunId: row.audit_run_id,
  captureDate: row.capture_date,
  status: row.status,
  crawledPages: row.crawled_pages,
  healthScore: row.health_score !== null ? Number.parseFloat(row.health_score) : null,
  startedAt: row.started_at,
  finishedAt: row.finished_at
})

export const readSiteAuditReport = async (
  seoTargetId: string,
  auditRunId?: string
): Promise<SiteAuditReportResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  try {
    const targetRows = await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targetRows[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    const runRows = auditRunId
      ? await runGreenhousePostgresQuery<RunRow>(
          `SELECT audit_run_id,
                  capture_date::text AS capture_date,
                  status,
                  crawled_pages,
                  health_score::text AS health_score,
                  to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
                  to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS finished_at
             FROM greenhouse_growth.seo_site_audit_runs
            WHERE audit_run_id = $1
              AND seo_target_id = $2`,
          [auditRunId, seoTargetId]
        )
      : await runGreenhousePostgresQuery<RunRow>(
          `SELECT audit_run_id,
                  capture_date::text AS capture_date,
                  status,
                  crawled_pages,
                  health_score::text AS health_score,
                  to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
                  to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS finished_at
             FROM greenhouse_growth.seo_site_audit_runs
            WHERE seo_target_id = $1
            ORDER BY created_at DESC
            LIMIT 1`,
          [seoTargetId]
        )

    const run = runRows[0]

    if (!run) {
      return { ok: false, errorCode: auditRunId ? 'run_not_found' : 'no_data', status: null }
    }

    const findingRows = await runGreenhousePostgresQuery<FindingRow>(
      `SELECT url, issue_type, severity, detail, finding_scope
         FROM greenhouse_growth.seo_site_audit_findings
        WHERE audit_run_id = $1
        ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
                 issue_type, url`,
      [run.audit_run_id]
    )

    const findings: Record<SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView[]> = {
      critical: [],
      warning: [],
      notice: []
    }

    for (const row of findingRows) {
      findings[row.severity]?.push({
        url: row.url,
        issueType: row.issue_type,
        severity: row.severity,
        detail: row.detail ?? {},
        // Default defensivo: una fila sin alcance legible es de página (todo lo anterior a
        // TASK-1670 lo es). Nunca al revés — inventar `site` inflaría el alcance del problema.
        findingScope: row.finding_scope === 'site' ? 'site' : 'page'
      })
    }

    // Crawl anterior comparable, para que el reporte se lea como movimiento y no como foto
    // (el módulo se vende como serie de tiempo). Sólo runs TERMINADOS: comparar contra uno
    // fallido o en vuelo daría un delta inventado. Los totales se agregan en la misma
    // consulta para no traer sus findings enteros — del anterior sólo importa el conteo.
    const previousRows = await runGreenhousePostgresQuery<PreviousRunRow>(
      `SELECT r.audit_run_id,
              r.capture_date::text AS capture_date,
              r.health_score::text AS health_score,
              COUNT(f.*) FILTER (WHERE f.severity = 'critical')::int AS critical_count,
              COUNT(f.*) FILTER (WHERE f.severity = 'warning')::int  AS warning_count,
              COUNT(f.*) FILTER (WHERE f.severity = 'notice')::int   AS notice_count
         FROM greenhouse_growth.seo_site_audit_runs r
         LEFT JOIN greenhouse_growth.seo_site_audit_findings f ON f.audit_run_id = r.audit_run_id
        WHERE r.seo_target_id = $1
          AND r.audit_run_id <> $2
          AND r.capture_date <= $3::date
          AND r.status IN ('succeeded', 'degraded')
        GROUP BY r.audit_run_id, r.capture_date, r.health_score, r.created_at
        ORDER BY r.capture_date DESC, r.created_at DESC
        LIMIT 1`,
      [seoTargetId, run.audit_run_id, run.capture_date]
    )

    const previousRow = previousRows[0]

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      run: toRunView(run),
      findings,
      totals: Object.fromEntries(SEVERITIES.map(severity => [severity, findings[severity].length])) as Record<
        SeoSiteAuditFindingSeverity,
        number
      >,
      previous: previousRow
        ? {
            auditRunId: previousRow.audit_run_id,
            captureDate: previousRow.capture_date,
            healthScore: previousRow.health_score !== null ? Number.parseFloat(previousRow.health_score) : null,
            totals: {
              critical: previousRow.critical_count,
              warning: previousRow.warning_count,
              notice: previousRow.notice_count
            }
          }
        : null
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_site_audit_reader' },
      extra: { seoTargetId, auditRunId: auditRunId ?? null }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
