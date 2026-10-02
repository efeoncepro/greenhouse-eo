import 'server-only'

import { createGoogleAuth } from '@/lib/google-credentials'

/**
 * TASK-1876 Slice 3 — Pico reciente de conexiones leído desde la métrica NATIVA de Cloud SQL
 * (`cloudsql.googleapis.com/database/postgresql/num_backends`), no desde `pg_stat_activity`.
 *
 * Por qué: el detector por `pg_stat_activity` necesita una conexión y falla justo cuando la
 * instancia está saturada (ISSUE-174: `53300 remaining connection slots are reserved`); además
 * sólo ve el instante en que alguien abre el overview. La métrica nativa la registra Cloud SQL
 * cada minuto, sin depender de la base, y conserva el pico aunque nadie estuviera mirando.
 * Verificado 2026-09-28: registró 99 backends a las 11:05Z del 2026-09-18.
 *
 * Degrada honestamente: sin instancia configurada o sin permiso de lectura devuelve `null`
 * y el caller lo declara como evidencia no disponible (nunca como "ok").
 */

export interface PostgresBackendsPeak {
  peak: number
  peakAt: string
  windowHours: number
}

const MONITORING_API = 'https://monitoring.googleapis.com/v3'

/** `efeonce-group:us-east4:greenhouse-pg-dev` → `{ project: 'efeonce-group', databaseId: 'efeonce-group:greenhouse-pg-dev' }`. */
export const resolveCloudSqlMonitoringTarget = (instanceConnectionName: string | undefined | null) => {
  const parts = instanceConnectionName?.trim().split(':') ?? []

  if (parts.length !== 3 || parts.some(part => !part)) return null

  const [project, , instance] = parts

  return { project, databaseId: `${project}:${instance}` }
}

type TimeSeriesResponse = {
  timeSeries?: Array<{ points?: Array<{ interval?: { endTime?: string }; value?: { int64Value?: string; doubleValue?: number } }> }>
}

/** Pico (máximo por minuto, sumado sobre bases) dentro de la ventana; `null` si no hay puntos. */
export const pickBackendsPeak = (response: TimeSeriesResponse, windowHours: number): PostgresBackendsPeak | null => {
  let best: PostgresBackendsPeak | null = null

  for (const series of response.timeSeries ?? []) {
    for (const point of series.points ?? []) {
      const value = Number(point.value?.int64Value ?? point.value?.doubleValue)
      const at = point.interval?.endTime

      if (!Number.isFinite(value) || !at) continue
      if (!best || value > best.peak) best = { peak: value, peakAt: at, windowHours }
    }
  }

  return best
}

export const readPostgresBackendsPeak = async ({
  windowHours = 24,
  now = new Date()
}: { windowHours?: number; now?: Date } = {}): Promise<PostgresBackendsPeak | null> => {
  const target = resolveCloudSqlMonitoringTarget(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME)

  if (!target) return null

  const client = await createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/monitoring.read'] }).getClient()

  const response = await client.request<TimeSeriesResponse>({
    url: `${MONITORING_API}/projects/${target.project}/timeSeries`,
    params: {
      filter: `metric.type="cloudsql.googleapis.com/database/postgresql/num_backends" AND resource.labels.database_id="${target.databaseId}"`,
      'interval.startTime': new Date(now.getTime() - windowHours * 3_600_000).toISOString(),
      'interval.endTime': now.toISOString(),
      'aggregation.alignmentPeriod': '60s',
      'aggregation.perSeriesAligner': 'ALIGN_MAX',
      'aggregation.crossSeriesReducer': 'REDUCE_SUM'
    }
  })

  return pickBackendsPeak(response.data, windowHours)
}
