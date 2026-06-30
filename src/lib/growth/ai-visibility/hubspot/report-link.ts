import 'server-only'

/**
 * TASK-1242 — Resolución del `report_url` público para el HubSpot handoff.
 *
 * El report_url nace del `report_token` (no enumerable) del snapshot publicado (TASK-1239),
 * NO de un campo del reporte. Si aún no hay snapshot para el run, el handoff omite la prop
 * (la company se actualiza igual con score/gap/motion). El path público lo posee TASK-1241;
 * acá se construye con la base del portal — contrato a alinear con esa task.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const PUBLIC_REPORT_PATH_PREFIX = '/grader/r'

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

/** URL pública estable del reporte a partir del token. */
export const buildPublicReportUrl = (reportToken: string): string => {
  const base = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://greenhouse.efeoncepro.com').replace(/\/+$/, '')

  return `${base}${PUBLIC_REPORT_PATH_PREFIX}/${reportToken}`
}
