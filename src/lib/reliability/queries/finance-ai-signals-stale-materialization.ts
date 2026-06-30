import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1201 Slice 3 — Reliability heartbeat: Finance AI anomaly-materialization
 * staleness.
 *
 * Detecta el síntoma "finance AI no-signal with eligible data" del risk matrix:
 * el paso de anomaly-materialization quedó stale o falló. La provenance vive en
 * `greenhouse_serving.finance_ai_materialization_runs` (append-only, TASK-1201).
 *
 * NO alerta sobre `skipped_no_eligible_data` (economics no listo = upstream
 * TASK-1200, no una falla del pipeline finance-AI) ni sobre `empty_positive`
 * (salud, sin anomalías). Solo sobre liveness/falla del propio step.
 *
 * Steady state esperado = ok (run reciente, no fallido).
 *
 * SoT: GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md
 */
export const FINANCE_AI_SIGNALS_STALE_MATERIALIZATION_SIGNAL_ID =
  'finance.ai.signals.stale_materialization'

const STALE_WARNING_HOURS = 24
const STALE_ERROR_HOURS = 48

const QUERY_SQL = `
  SELECT
    status,
    started_at::text AS started_at,
    EXTRACT(EPOCH FROM (now() - started_at)) / 3600.0 AS age_hours
  FROM greenhouse_serving.finance_ai_materialization_runs
  ORDER BY started_at DESC
  LIMIT 1
`

interface LatestRunRow extends Record<string, unknown> {
  status: string | null
  started_at: string | null
  age_hours: number | string | null
}

const toNum = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export const getFinanceAiSignalsStaleMaterializationSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    const base = {
      signalId: FINANCE_AI_SIGNALS_STALE_MATERIALIZATION_SIGNAL_ID,
      moduleKey: 'finance' as const,
      kind: 'freshness' as const,
      source: 'getFinanceAiSignalsStaleMaterializationSignal',
      label: 'Finance AI — materialización de señales',
      observedAt
    }

    const docEvidence = {
      kind: 'doc' as const,
      label: 'SoT',
      value: 'docs/architecture/GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md'
    }

    try {
      const rows = await query<LatestRunRow>(QUERY_SQL)
      const row = rows[0]

      if (!row || !row.started_at) {
        return {
          ...base,
          severity: 'awaiting_data',
          summary:
            'El anomaly materializer de Finance AI aún no ha registrado runs. Corre el cron finance-ai-signals para generar provenance.',
          evidence: [docEvidence]
        }
      }

      const status = row.status ?? 'unknown'
      const ageHours = toNum(row.age_hours) ?? 0

      const evidence = [
        { kind: 'metric' as const, label: 'last_run_status', value: status },
        { kind: 'metric' as const, label: 'age_hours', value: ageHours.toFixed(1) },
        { kind: 'metric' as const, label: 'last_run_at', value: row.started_at },
        docEvidence
      ]

      if (status === 'failed') {
        return {
          ...base,
          severity: 'error',
          summary: 'El último run de anomaly-materialization de Finance AI falló. Revisar Sentry domain finance.',
          evidence
        }
      }

      if (ageHours > STALE_ERROR_HOURS) {
        return {
          ...base,
          severity: 'error',
          summary: `El anomaly materializer de Finance AI no corre hace ${ageHours.toFixed(0)}h (> ${STALE_ERROR_HOURS}h). Pipeline probablemente caído.`,
          evidence
        }
      }

      if (ageHours > STALE_WARNING_HOURS) {
        return {
          ...base,
          severity: 'warning',
          summary: `El anomaly materializer de Finance AI no corre hace ${ageHours.toFixed(0)}h (> ${STALE_WARNING_HOURS}h).`,
          evidence
        }
      }

      return {
        ...base,
        severity: 'ok',
        summary: `Anomaly materializer de Finance AI corrió hace ${ageHours.toFixed(1)}h (status=${status}).`,
        evidence
      }
    } catch (error) {
      captureWithDomain(error, 'finance', {
        tags: {
          source: 'finance_ai_signals_stale_materialization',
          stage: 'pg_read'
        }
      })

      return {
        ...base,
        severity: 'unknown',
        summary: 'No se pudo leer la provenance de materialización de Finance AI (degradación honesta).',
        evidence: [docEvidence]
      }
    }
  }
