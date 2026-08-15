import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1664 — Salud del keyword discovery: dos señales sobre la misma tabla de runs.
 *
 * `seo.keyword_discovery.stuck_runs` — una corrida en `running` es normal durante los
 * minutos que tardan hasta ~24 llamadas Live; una más vieja que el umbral operacional
 * (15 min) está atascada: worker caído a mitad de corrida o proveedor colgado. Steady = 0.
 * También cuenta `pending` añejo (>2h): con el drain corriendo cada 10 min, un pending de
 * horas significa scheduler pausado con flag ON o drain roto — media promesa al operador.
 *
 * `seo.keyword_discovery.provider_errors` — corridas de las últimas 24h que terminaron
 * `failed` o cerraron con `error_code` de proveedor. Steady = 0. No mira `no_results`
 * (hecho legítimo) ni `budget_blocked` (freno de presupuesto operando como debe; se
 * reporta aparte como warning si se acumula).
 *
 * Date-math: `started_at`/`requested_at`/`completed_at` son TIMESTAMPTZ — comparación de
 * intervalos, nunca EXTRACT(EPOCH FROM DATE-DATE) (gate TASK-893).
 */
export const SEO_KEYWORD_DISCOVERY_STUCK_RUNS_SIGNAL_ID = 'seo.keyword_discovery.stuck_runs'

export const SEO_KEYWORD_DISCOVERY_PROVIDER_ERRORS_SIGNAL_ID = 'seo.keyword_discovery.provider_errors'

export const DISCOVERY_STUCK_RUNNING_MINUTES = 15

export const DISCOVERY_STALE_PENDING_HOURS = 2

const STUCK_SQL = `
  SELECT
    r.run_id,
    r.status,
    (r.status = 'running' AND (NOW() - COALESCE(r.started_at, r.requested_at)) >= ($1::int * INTERVAL '1 minute')) AS is_stuck_running,
    (r.status = 'pending' AND (NOW() - r.requested_at) >= ($2::int * INTERVAL '1 hour')) AS is_stale_pending
  FROM greenhouse_growth.seo_keyword_discovery_runs r
  WHERE r.status IN ('pending', 'running')
`

const ERRORS_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE r.status = 'failed')::int AS failed_runs,
    COUNT(*) FILTER (WHERE r.status = 'partial' AND r.error_code IN ('provider_error', 'breaker_open'))::int AS partial_provider,
    COUNT(*) FILTER (WHERE r.status = 'budget_blocked')::int AS budget_blocked
  FROM greenhouse_growth.seo_keyword_discovery_runs r
  WHERE r.completed_at >= NOW() - INTERVAL '24 hours'
`

type StuckRow = {
  run_id: string
  status: string
  is_stuck_running: boolean
  is_stale_pending: boolean
}

type ErrorsRow = {
  failed_runs: number
  partial_provider: number
  budget_blocked: number
}

export const getSeoKeywordDiscoveryStuckRunsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<StuckRow>(STUCK_SQL, [DISCOVERY_STUCK_RUNNING_MINUTES, DISCOVERY_STALE_PENDING_HOURS])

    const stuckRunning = rows.filter(row => row.is_stuck_running).length
    const stalePending = rows.filter(row => row.is_stale_pending).length
    const inFlight = rows.length

    const severity: 'ok' | 'warning' | 'error' | 'unknown' = stuckRunning > 0 ? 'warning' : stalePending > 0 ? 'warning' : 'ok'

    const summary =
      severity === 'ok'
        ? inFlight > 0
          ? `${inFlight} corrida(s) de discovery en vuelo dentro de la ventana normal.`
          : 'Sin corridas de discovery en vuelo.'
        : stuckRunning > 0
          ? `${stuckRunning} corrida(s) llevan más de ${DISCOVERY_STUCK_RUNNING_MINUTES} min en running — worker caído a mitad de corrida o proveedor colgado; el costo ya incurrido está preservado en el run.`
          : `${stalePending} corrida(s) pending llevan más de ${DISCOVERY_STALE_PENDING_HOURS}h sin drenarse — revisar scheduler ops-seo-keyword-discovery-drain / flag del worker.`

    return {
      signalId: SEO_KEYWORD_DISCOVERY_STUCK_RUNS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoKeywordDiscoveryStuckRunsSignal',
      label: 'Corridas de keyword discovery atascadas',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `seo_keyword_discovery_runs pending/running — umbrales ${DISCOVERY_STUCK_RUNNING_MINUTES}min running / ${DISCOVERY_STALE_PENDING_HOURS}h pending`
        },
        { kind: 'metric', label: 'inFlight', value: String(inFlight) },
        { kind: 'metric', label: 'stuckRunning', value: String(stuckRunning) },
        { kind: 'metric', label: 'stalePending', value: String(stalePending) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_keyword_discovery_stuck' }
    })

    return {
      signalId: SEO_KEYWORD_DISCOVERY_STUCK_RUNS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoKeywordDiscoveryStuckRunsSignal',
      label: 'Corridas de keyword discovery atascadas',
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

export const getSeoKeywordDiscoveryProviderErrorsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<ErrorsRow>(ERRORS_SQL)
    const row = rows[0] ?? { failed_runs: 0, partial_provider: 0, budget_blocked: 0 }

    const providerIssues = row.failed_runs + row.partial_provider

    const severity: 'ok' | 'warning' | 'error' | 'unknown' =
      row.failed_runs > 0 ? 'error' : row.partial_provider > 0 || row.budget_blocked > 1 ? 'warning' : 'ok'

    const summary =
      severity === 'ok'
        ? 'Sin fallas de proveedor en corridas de discovery (24h).'
        : providerIssues > 0
          ? `${row.failed_runs} corrida(s) failed y ${row.partial_provider} partial por proveedor en 24h — revisar breaker/credenciales DataForSEO antes de encolar más.`
          : `${row.budget_blocked} corrida(s) budget_blocked en 24h — el freno de presupuesto está operando; revisar budget del tier antes de reintentar.`

    return {
      signalId: SEO_KEYWORD_DISCOVERY_PROVIDER_ERRORS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'runtime',
      source: 'getSeoKeywordDiscoveryProviderErrorsSignal',
      label: 'Fallas de proveedor en keyword discovery',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: 'seo_keyword_discovery_runs cerradas en 24h por status/error_code' },
        { kind: 'metric', label: 'failedRuns', value: String(row.failed_runs) },
        { kind: 'metric', label: 'partialProvider', value: String(row.partial_provider) },
        { kind: 'metric', label: 'budgetBlocked', value: String(row.budget_blocked) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_keyword_discovery_provider_errors' }
    })

    return {
      signalId: SEO_KEYWORD_DISCOVERY_PROVIDER_ERRORS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'runtime',
      source: 'getSeoKeywordDiscoveryProviderErrorsSignal',
      label: 'Fallas de proveedor en keyword discovery',
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
