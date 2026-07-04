import 'server-only'

/**
 * TASK-1242 — Resolución del `report_url` público para el HubSpot handoff.
 *
 * El report_url nace del `report_token` (no enumerable) del snapshot publicado (TASK-1239),
 * NO de un campo del reporte. Si aún no hay snapshot para el run, el handoff omite la prop
 * (la company se actualiza igual con score/gap/motion).
 *
 * TASK-1324 — el render público del informe **NO vive en `greenhouse-eo`**: vive en el hub
 * headless `think.efeoncepro.com/brand-visibility/r/<token>` (repo `efeonce-think`, ADR
 * `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`). El path viejo del portal
 * (`greenhouse.efeoncepro.com/grader/r/<token>`) daba 404 en cada correo. Este helper es la
 * **fuente única** del URL público — lo consumen el correo y el handoff HubSpot; un cambio,
 * ambos alineados. El host se resuelve por env var dedicada `PUBLIC_GRADER_HUB_URL` (default =
 * hub canónico); NO reusar `NEXT_PUBLIC_APP_URL` (ese es el portal). La URL es estable ante el
 * futuro merge del hub en `efeonce-web` (se conserva subdominio/path).
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { buildPublicReportUrl } from '../public-report-url'
import { resolvePreferredReportUrl } from '../report/short-link'

/** Token del snapshot público más reciente del run (null si aún no se publicó). */
export const getLatestReportTokenForRun = async (runId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ report_token: string }>(
    `SELECT report_token
       FROM greenhouse_growth.grader_reports
      WHERE run_id = $1 AND audience = 'public'
      ORDER BY as_of DESC
      LIMIT 1`,
    [runId],
  )

  return rows[0]?.report_token ?? null
}

/** Ref (id + token) del snapshot público más reciente del run — necesario para resolver el short link. */
export const getLatestPublicReportRefForRun = async (
  runId: string
): Promise<{ reportId: string; reportToken: string } | null> => {
  const rows = await runGreenhousePostgresQuery<{ report_id: string; report_token: string }>(
    `SELECT report_id, report_token
       FROM greenhouse_growth.grader_reports
      WHERE run_id = $1 AND audience = 'public'
      ORDER BY as_of DESC
      LIMIT 1`,
    [runId],
  )

  const row = rows[0]

  return row ? { reportId: row.report_id, reportToken: row.report_token } : null
}

/**
 * TASK-1330 — URL de share PREFERIDA (corta si el flag ON + link activo; si no la larga) para el run.
 * `null` si aún no hay snapshot público. Fuente única para correo + HubSpot handoff (mismo criterio
 * que el token route). Con el flag OFF devuelve la larga sin costo extra.
 */
export const resolveReportShareUrlForRun = async (runId: string): Promise<string | null> => {
  const ref = await getLatestPublicReportRefForRun(runId)

  if (!ref) return null

  return resolvePreferredReportUrl({ reportId: ref.reportId, reportToken: ref.reportToken })
}

export { buildPublicReportUrl }
