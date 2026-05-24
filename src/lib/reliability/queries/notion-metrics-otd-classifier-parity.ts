import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-923 (M1) — `notion.metrics.shadow_paridad_otd_classifier` signal.
 *
 * Shadow de paridad del clasificador OTD GH-owned vs el `performance_indicator_code`
 * synced de Notion. Valida que el helper canonical `classifyOtdBucket` (source of
 * truth, src/lib/notion-metrics/classify-otd-bucket.ts) produzca el MISMO bucket
 * que la fórmula Notion `Indicador de Performance` para el subconjunto ESTABLE:
 * tareas completadas clasificadas `on_time` / `late_drop`.
 *
 * **Por qué solo el subconjunto estable (decisión de diseño canonical TASK-923)**:
 * el `performance_indicator_code` synced es un snapshot del `Indicador de
 * Performance` al `now()` del último sync; el recompute usa otro `now()`. Para
 * tareas ABIERTAS (`overdue`/`carry_over`) el bucket depende de `now()` → paridad
 * imposible 1:1 (divergencia esperada, no falla). Para tareas COMPLETADAS el
 * split `on_time`/`late_drop` = `completed_at <= due_date` es **estable**
 * (independiente de now()) → ahí la paridad debe ser ~100%. Ese es además el
 * subconjunto que alimenta el bono (OTD%). El gate `esMesActual` + open buckets
 * quedan validados por los unit tests del helper, NO por este signal runtime.
 *
 * PG-based (lee `greenhouse_delivery.tasks` — performance_indicator_code synced +
 * completed_at + due_date): cero dependencia de BQ, valida el helper TS directo.
 * Comparación con `::date` en ambos lados (robusto sea DATE o TIMESTAMP — gate
 * "SQL Signal Reader Schema Validation" CLAUDE.md TASK-893; cero EXTRACT(EPOCH)).
 *
 * Subsystem rollup: `delivery`. Steady state: paridad alta (mismatch ~0%).
 *
 * Severity matrix:
 *   - 0 candidatos              → `unknown` (sin datos)
 *   - mismatch ≤ 2%             → `ok` (paridad sana)
 *   - 2% < mismatch ≤ 10%       → `warning` (revisar divergencias / data legacy)
 *   - mismatch > 10%            → `error` (helper diverge del synced — bloquea cutover M3)
 *
 * Cross-ref: docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §16.3 +
 * docs/tasks/in-progress/TASK-923-*.md.
 */

export const NOTION_METRICS_OTD_CLASSIFIER_PARITY_SIGNAL_ID =
  'notion.metrics.shadow_paridad_otd_classifier'

const WARNING_THRESHOLD_PCT = 2
const ERROR_THRESHOLD_PCT = 10

const QUERY_SQL = `
  WITH candidates AS (
    SELECT
      performance_indicator_code AS synced,
      CASE
        WHEN completed_at::date <= due_date::date THEN 'on_time'
        ELSE 'late_drop'
      END AS gh_expected
    FROM greenhouse_delivery.tasks
    WHERE performance_indicator_code IN ('on_time', 'late_drop')
      AND completed_at IS NOT NULL
      AND due_date IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '90 days'
  )
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE synced <> gh_expected)::int AS mismatch
  FROM candidates
`

type SignalRow = {
  total: number
  mismatch: number
  [key: string]: unknown
}

export const getNotionMetricsOtdClassifierParitySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<SignalRow>(QUERY_SQL)
      const row = rows[0]

      const total = Number(row?.total ?? 0)
      const mismatch = Number(row?.mismatch ?? 0)

      const mismatchPct = total > 0 ? Math.round((mismatch / total) * 1000) / 10 : 0
      const parityPct = total > 0 ? Math.round((1 - mismatch / total) * 1000) / 10 : 0

      const severity: 'ok' | 'warning' | 'error' | 'unknown' =
        total === 0
          ? 'unknown'
          : mismatchPct <= WARNING_THRESHOLD_PCT
            ? 'ok'
            : mismatchPct <= ERROR_THRESHOLD_PCT
              ? 'warning'
              : 'error'

      const summary =
        total === 0
          ? 'Sin tareas completadas (on_time/late_drop) en últimos 90 días — paridad sin datos para evaluar.'
          : severity === 'ok'
            ? `Paridad clasificador OTD sana: ${parityPct}% (${total - mismatch}/${total} completadas coinciden con el synced Notion).`
            : severity === 'warning'
              ? `Paridad clasificador OTD parcial: ${parityPct}% (${mismatch}/${total} divergen). Revisar data legacy / casos edge antes del cutover M3.`
              : `Paridad clasificador OTD crítica: ${parityPct}% (${mismatch}/${total} divergen). El helper classifyOtdBucket diverge del synced — NO avanzar cutover M3 hasta resolver.`

      return {
        signalId: NOTION_METRICS_OTD_CLASSIFIER_PARITY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getNotionMetricsOtdClassifierParitySignal',
        label: 'Paridad clasificador OTD (GH vs Notion synced)',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'greenhouse_delivery.tasks completed last 90d (on_time/late_drop) — TS classifyOtdBucket vs performance_indicator_code synced'
          },
          { kind: 'metric', label: 'parity_pct', value: String(parityPct) },
          { kind: 'metric', label: 'mismatch_pct', value: String(mismatchPct) },
          { kind: 'metric', label: 'total_candidates', value: String(total) },
          { kind: 'metric', label: 'mismatch_count', value: String(mismatch) },
          { kind: 'metric', label: 'warning_threshold_pct', value: String(WARNING_THRESHOLD_PCT) },
          { kind: 'metric', label: 'error_threshold_pct', value: String(ERROR_THRESHOLD_PCT) },
          {
            kind: 'doc',
            label: 'Helper canonical (source of truth)',
            value: 'src/lib/notion-metrics/classify-otd-bucket.ts'
          },
          {
            kind: 'doc',
            label: 'ADR',
            value: 'docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §16.3'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'delivery', {
        tags: { source: 'reliability_signal_notion_metrics_otd_classifier_parity' }
      })

      return {
        signalId: NOTION_METRICS_OTD_CLASSIFIER_PARITY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getNotionMetricsOtdClassifierParitySignal',
        label: 'Paridad clasificador OTD (GH vs Notion synced)',
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
