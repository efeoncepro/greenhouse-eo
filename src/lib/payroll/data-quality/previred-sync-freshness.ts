import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { PayrollDataQualityMetric } from './types'

/**
 * TASK-729 — Detector "previred_sync_freshness".
 *
 * Cuenta horas desde el último sync exitoso de PREVIRED Chile. PREVIRED
 * es la fuente de UF, UTM y otros indicadores previsionales que el motor
 * de cálculo lee al calcular la nómina. Si está stale, los cálculos pueden
 * usar valores antiguos.
 *
 * - <= 24h → ok
 * - <= 72h → warning
 * - > 72h → error
 *
 * Marcado como métrica operacional (no platform integrity) — no escala el
 * subsystem a `degraded`. Solo informa para que el operador valide.
 *
 * Read-only. Status enum confirmado en repo: 'succeeded' (no 'success').
 */
export const detectPreviredSyncFreshness = async (): Promise<PayrollDataQualityMetric> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ hours_since: string | null }>(
      `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(completed_at))) / 3600 AS hours_since
       FROM greenhouse_sync.source_sync_runs
       WHERE source_system = 'previred'
         AND status = 'succeeded'`
    )

    const rawHours = rows[0]?.hours_since
    const hoursSince = rawHours === null || rawHours === undefined ? null : Number(rawHours)
    const value = hoursSince === null || !Number.isFinite(hoursSince) ? -1 : Math.round(hoursSince)

    let status: PayrollDataQualityMetric['status']

    if (value < 0) {
      // Sin syncs exitosos registrados — operacional, no es bug de plataforma.
      status = 'info'
    } else if (value <= 24) {
      status = 'ok'
    } else if (value <= 72) {
      status = 'warning'
    } else {
      status = 'error'
    }

    return {
      key: 'previred_sync_freshness',
      label: 'Horas desde último sync PREVIRED',
      value,
      status
    }
  } catch {
    return {
      key: 'previred_sync_freshness',
      label: 'Horas desde último sync PREVIRED',
      value: -1,
      status: 'info'
    }
  }
}
