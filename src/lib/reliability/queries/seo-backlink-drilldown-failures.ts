import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1777 — Drill-downs de enlaces disparados que no completaron.
 *
 * Un drill-down `failed` significa "sabemos que el perfil se movió y NO sabemos qué se
 * movió" — la conclusión opuesta a `skipped_no_movement` (perfil estable). El veredicto
 * queda persistido en `seo_backlink_drilldowns`, así que el signal cuenta los `failed` de
 * las últimas DOS ventanas semanales. Steady = 0.
 *
 * `(CURRENT_DATE - s.capture_date)::int` — patrón TASK-893 (date - date = integer).
 */
export const SEO_BACKLINK_DRILLDOWN_FAILED_SIGNAL_ID = 'seo.backlink.detail_drilldown_failed'

/** Dos ciclos del cron semanal. */
export const SEO_BACKLINK_DRILLDOWN_WINDOW_DAYS = 14

const QUERY_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE d.outcome = 'failed')  AS failed,
    COUNT(*) FILTER (WHERE d.outcome = 'drilled') AS drilled,
    COUNT(*)                                      AS evaluated
  FROM greenhouse_growth.seo_backlink_drilldowns d
  JOIN greenhouse_growth.seo_backlink_snapshots s
    ON s.backlink_snapshot_id = d.backlink_snapshot_id
  WHERE (CURRENT_DATE - s.capture_date)::int < $1
`

type CountsRow = {
  failed: string | number | null
  drilled: string | number | null
  evaluated: string | number | null
}

const toCount = (value: string | number | null): number => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

export const getSeoBacklinkDrilldownFailuresSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountsRow>(QUERY_SQL, [SEO_BACKLINK_DRILLDOWN_WINDOW_DAYS])

    const failed = toCount(rows[0]?.failed ?? 0)
    const drilled = toCount(rows[0]?.drilled ?? 0)
    const evaluated = toCount(rows[0]?.evaluated ?? 0)

    let severity: 'ok' | 'warning' | 'error' = 'ok'
    let summary: string

    if (evaluated === 0) {
      summary =
        'Drill-down de enlaces sin evaluaciones en la ventana (flag OFF / sin snapshots nuevos) — estado esperado pre-rollout.'
    } else if (failed === 0) {
      summary = `Drill-down de enlaces sano: ${evaluated} snapshot(s) evaluado(s), ${drilled} con detalle comprado, 0 fallidos.`
    } else if (failed >= 3 || failed === evaluated) {
      severity = 'error'
      summary = `${failed} drill-down(s) de enlaces fallidos en ${SEO_BACKLINK_DRILLDOWN_WINDOW_DAYS} días: hubo movimiento y NO sabemos qué se movió. Revisar breaker de la familia backlinks y logs del pase en el batch semanal.`
    } else {
      severity = 'warning'
      summary = `${failed} de ${evaluated} drill-down(s) de enlaces fallidos en la ventana. El detalle de esas semanas no es recuperable; verificar el próximo ciclo.`
    }

    return {
      signalId: SEO_BACKLINK_DRILLDOWN_FAILED_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoBacklinkDrilldownFailuresSignal',
      label: 'Drill-down de enlaces fallido',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'seo_backlink_drilldowns outcome=failed en la ventana de 2 ciclos semanales'
        },
        { kind: 'metric', label: 'evaluated', value: String(evaluated) },
        { kind: 'metric', label: 'drilled', value: String(drilled) },
        { kind: 'metric', label: 'failed', value: String(failed) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_backlink_drilldown_failures' }
    })

    return {
      signalId: SEO_BACKLINK_DRILLDOWN_FAILED_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoBacklinkDrilldownFailuresSignal',
      label: 'Drill-down de enlaces fallido',
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
