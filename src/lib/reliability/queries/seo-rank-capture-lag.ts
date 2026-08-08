import 'server-only'

import { query } from '@/lib/db'
import { SEO_MODULE_KEYS_READ } from '@/lib/growth/seo/entitlement'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1303 — Rank capture lag detector.
 *
 * Para cada target SEO activo de una org con assignment SEO vigente, computa el lag
 * = días desde el último `capture_date` (`(CURRENT_DATE - MAX(capture_date))::int` —
 * patrón canónico TASK-893, NUNCA `EXTRACT(EPOCH FROM ...)`: date - date es integer).
 * Un target sin captura reciente significa que la serie diaria de la pantalla ancla
 * tiene un hueco — y la SERP de ese día no se puede reconstruir después.
 *
 * Subsystem rollup: `Growth` (module=growth).
 *
 * **Severity matrix canonical** (steady = 0 targets atrasados):
 *   - todos los targets con lag <= 1 día → `ok` (el cron corre ~05:00; hoy o ayer es sano)
 *   - >= 1 target con lag 2–3 días (o sin captura inicial) → `warning`
 *   - >= 1 target con lag >= 4 días → `error`
 *
 * Nota de rollout honesto: mientras el scheduler `ops-seo-rank-capture` esté PAUSADO,
 * los targets elegibles sin captura aparecen en `warning` — eso es correcto: hay orgs
 * pagando por una serie que aún no corre.
 */
export const SEO_RANK_CAPTURE_LAG_SIGNAL_ID = 'seo.rank.capture_lag'

export const SEO_RANK_CAPTURE_LAG_WARN_DAYS = 2
export const SEO_RANK_CAPTURE_LAG_ERROR_DAYS = 4

const QUERY_SQL = `
  SELECT
    t.seo_target_id,
    (CURRENT_DATE - MAX(s.capture_date))::int AS lag_days
  FROM greenhouse_growth.seo_targets t
  LEFT JOIN greenhouse_growth.seo_rank_snapshots s
    ON s.seo_target_id = t.seo_target_id
  WHERE t.status = 'active'
    AND EXISTS (
      SELECT 1
        FROM greenhouse_client_portal.module_assignments ma
       WHERE ma.organization_id = t.organization_id
         AND ma.module_key = ANY($1::text[])
         AND ma.effective_to IS NULL
         AND ma.status IN ('active', 'pilot')
    )
  GROUP BY t.seo_target_id
`

type LagRow = {
  seo_target_id: string
  lag_days: number | null
}

export const getSeoRankCaptureLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Dual-read del cutover `seo_v1 → seo_v2` (TASK-1310). Este reader tenía la clave
    // NUEVA hardcodeada mientras la base sigue en la vieja: veía 0 orgs y reportaba
    // `ok` — un falso sano, que es justo lo que un detector de lag no puede hacer.
    const rows = await query<LagRow>(QUERY_SQL, [[...SEO_MODULE_KEYS_READ]])

    const total = rows.length
    const neverCaptured = rows.filter(row => row.lag_days === null).length

    const errorLagged = rows.filter(
      row => row.lag_days !== null && row.lag_days >= SEO_RANK_CAPTURE_LAG_ERROR_DAYS
    ).length

    const warnLagged = rows.filter(
      row =>
        row.lag_days !== null &&
        row.lag_days >= SEO_RANK_CAPTURE_LAG_WARN_DAYS &&
        row.lag_days < SEO_RANK_CAPTURE_LAG_ERROR_DAYS
    ).length

    const severity: 'ok' | 'warning' | 'error' | 'unknown' =
      errorLagged > 0 ? 'error' : warnLagged + neverCaptured > 0 ? 'warning' : 'ok'

    const summary =
      severity === 'ok'
        ? total > 0
          ? `Serie de rankings al día en ${total} target(s) SEO.`
          : 'Sin targets SEO elegibles para captura (ninguna org con assignment activo).'
        : `${errorLagged + warnLagged} target(s) con la serie de rankings atrasada y ${neverCaptured} sin captura inicial. Cada día sin captura es un hueco irrecuperable de la serie (revisar scheduler ops-seo-rank-capture / gate de costo).`

    return {
      signalId: SEO_RANK_CAPTURE_LAG_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoRankCaptureLagSignal',
      label: 'Lag de captura de rankings SEO',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'seo_targets activos con assignment seo_v2 — (CURRENT_DATE - MAX(capture_date))::int'
        },
        { kind: 'metric', label: 'targets', value: String(total) },
        { kind: 'metric', label: 'warnLagged', value: String(warnLagged) },
        { kind: 'metric', label: 'errorLagged', value: String(errorLagged) },
        { kind: 'metric', label: 'neverCaptured', value: String(neverCaptured) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_rank_capture_lag' }
    })

    return {
      signalId: SEO_RANK_CAPTURE_LAG_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoRankCaptureLagSignal',
      label: 'Lag de captura de rankings SEO',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
