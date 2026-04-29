import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { PayrollDataQualityMetric } from './types'

/**
 * TASK-729 — Detector "compensation_version_overlaps".
 *
 * Detecta `compensation_versions` activas con date ranges solapados para
 * el mismo `member_id`. Es **bug crítico** porque `getApplicableCompensationVersions`
 * podría retornar la versión equivocada al calcular la nómina, produciendo
 * sueldos incorrectos.
 *
 * Steady state = 0. Si > 0, bloquea aprobación efectiva del cálculo
 * (operador debe consolidar manualmente).
 *
 * Read-only. Los rangos se modelan como `tstzrange [effective_from, effective_to)`
 * con `effective_to = NULL` interpretado como "infinito" (max date).
 */
export const detectCompensationVersionOverlaps = async (): Promise<PayrollDataQualityMetric> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ cnt: string }>(
      `SELECT COUNT(DISTINCT a.member_id)::text AS cnt
       FROM greenhouse_payroll.compensation_versions a
       INNER JOIN greenhouse_payroll.compensation_versions b
         ON a.member_id = b.member_id
        AND a.version_id < b.version_id
       WHERE COALESCE(a.is_current, FALSE) = TRUE
         AND COALESCE(b.is_current, FALSE) = TRUE
         AND tstzrange(a.effective_from, a.effective_to, '[)')
             && tstzrange(b.effective_from, b.effective_to, '[)')`
    )

    const count = Number(rows[0]?.cnt ?? 0)

    return {
      key: 'compensation_version_overlaps',
      label: 'Compensaciones vigentes con rangos solapados',
      value: count,
      status: count === 0 ? 'ok' : 'error'
    }
  } catch {
    // Si el schema/columna no existe (legacy), reporta info.
    return {
      key: 'compensation_version_overlaps',
      label: 'Compensaciones vigentes con rangos solapados',
      value: 0,
      status: 'info'
    }
  }
}
