import 'server-only'

import { query } from '@/lib/db'
import { isNotionStatusTransitionsWebhookEnabled } from '@/lib/notion-metrics/status-transitions-flags'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-908 Slice 3.5 — Notion correction transitions source availability signal.
 *
 * Detecta el % de tareas completadas (universo canonical sobre el cual RpA es
 * calculable) cuyo `task_source_id` NO tiene rows en `greenhouse_delivery.
 * task_status_transitions`. Esas tareas tendrían `sourceMode='unavailable'`
 * al invocar `countCorrectionTransitions`, lo cual mapea a
 * `calculateRpa.dataStatus='unavailable'` downstream (TASK-901).
 *
 * Pre-TASK-908b deployment (webhook + reactive consumer no shipped todavía),
 * este signal va a reportar 100% unavailable — ESPERADO porque la tabla está
 * vacía. Post-deployment Notion webhook + backfill opcional, baja a
 * steady state esperado < 10% (TASK-908b §Slice 9 marker).
 *
 * Subsystem rollup canonical: `delivery` module (registry.ts:147 ya tiene
 * `incidentDomainTag='delivery'` + `filesOwned: src/lib/ico-engine/**`). El
 * helper canonical `countCorrectionTransitions` vive en
 * `src/lib/notion-metrics/` que se considera parte de delivery domain.
 *
 * **Severity matrix canonical V1.0 (pre-TASK-908b deployment)**:
 *
 *   - 0% unavailable        → `ok` (steady state post deployment)
 *   - 0 < unavailable ≤ 10% → `ok` (acceptable post deployment con backfill parcial)
 *   - 10 < unavailable ≤ 50% → `warning` (backfill incompleto o webhook dropping)
 *   - unavailable > 50%     → `error` (pre-deployment OR webhook caído)
 *   - 0 tareas completed    → `unknown` (sin datos)
 *
 * Pre TASK-908b deployment (esperado V1.0): severity=error 100%. Este es el
 * baseline expected — el signal va a alertar inmediato cuando TASK-908b shipee
 * y la cobertura empiece a crecer monotónicamente.
 *
 * **Steady state esperado (post TASK-908b + backfill verde)**: < 10%.
 *
 * Patrón fuente: TASK-571 (income_settlement_reconciliation), TASK-720
 * (instrumentCategoriesWithoutKpiRule). Detector canonical:
 * VIEW canónica + helper + reliability signal (TASK-766/774).
 */

export const NOTION_CORRECTION_TRANSITIONS_SOURCE_AVAILABILITY_SIGNAL_ID =
  'notion.correction_transitions.source_availability'

const WARNING_THRESHOLD_PCT = 10
const ERROR_THRESHOLD_PCT = 50

/**
 * **Schema naming drift canonical** (hotfix Sentry JAVASCRIPT-NEXTJS-65, 2026-05-18):
 *
 * Las 2 tablas usan nombres DISTINTOS para el mismo identificador canonical
 * (Notion page UUID):
 *
 * - `greenhouse_delivery.tasks.notion_task_id` (TEXT NOT NULL) — canonical en
 *   la tabla snapshot de Notion delivery
 * - `greenhouse_delivery.task_status_transitions.task_source_id` (TEXT NOT NULL)
 *   — canonical en la tabla event-sourced append-only de TASK-908
 *
 * Mismo identificador, diferente naming convention cross-table. Otros callsites
 * canonical usan el mismo pattern (e.g. `src/lib/projects/get-project-detail.ts`
 * usa `dt.task_source_id = t.notion_page_id` desde BQ delivery view).
 *
 * Pattern canonical V1: alias `t.notion_task_id AS task_source_id` en el CTE
 * para que el LEFT JOIN downstream funcione idéntico al naming de transitions.
 * Drift architectural (mismo dato 2 nombres) queda como ISSUE follow-up para
 * evaluar rename de column en `task_status_transitions` (NO urgente — el alias
 * es correct + canonical per pattern fuente).
 *
 * Live PG verified pre-merge canonical (CLAUDE.md "SQL Signal Reader Schema
 * Validation Gate" TASK-893 hotfix #3): query retorna shape esperado +
 * severity=error 100% pre-TASK-912 deployment (steady state ese state).
 */
const QUERY_SQL = `
  WITH completed_in_window AS (
    SELECT t.notion_task_id AS task_source_id
    FROM greenhouse_delivery.tasks t
    WHERE t.completed_at IS NOT NULL
      AND t.completed_at >= NOW() - INTERVAL '90 days'
  ),
  with_transitions AS (
    SELECT DISTINCT task_source_id
    FROM greenhouse_delivery.task_status_transitions
  )
  SELECT
    COUNT(*)::int AS total_completed,
    COUNT(*) FILTER (WHERE wt.task_source_id IS NULL)::int AS unavailable_count
  FROM completed_in_window c
  LEFT JOIN with_transitions wt ON wt.task_source_id = c.task_source_id
`

type SignalRow = {
  total_completed: number
  unavailable_count: number
  [key: string]: unknown
}

export const getNotionCorrectionTransitionsSourceAvailabilitySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<SignalRow>(QUERY_SQL)
      const row = rows[0]

      const total = Number(row?.total_completed ?? 0)
      const unavailable = Number(row?.unavailable_count ?? 0)

      const unavailablePct = total > 0 ? Math.round((unavailable / total) * 1000) / 10 : 0
      const captureEnabled = isNotionStatusTransitionsWebhookEnabled()

      if (!captureEnabled && total > 0) {
        return {
          signalId: NOTION_CORRECTION_TRANSITIONS_SOURCE_AVAILABILITY_SIGNAL_ID,
          moduleKey: 'delivery',
          kind: 'data_quality',
          source: 'getNotionCorrectionTransitionsSourceAvailabilitySignal',
          label: 'Cobertura canonical de correction transitions',
          severity: 'unknown',
          summary:
            `Captura de correction transitions deshabilitada por flag — ${unavailablePct}% unavailable (${unavailable}/${total}). La cobertura no es accionable hasta activar NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED.`,
          observedAt,
          evidence: [
            {
              kind: 'sql',
              label: 'Query',
              value:
                'greenhouse_delivery.tasks completed last 90d LEFT JOIN task_status_transitions — count NULL rate'
            },
            {
              kind: 'metric',
              label: 'unavailable_pct',
              value: String(unavailablePct)
            },
            {
              kind: 'metric',
              label: 'total_completed_tasks_90d',
              value: String(total)
            },
            {
              kind: 'metric',
              label: 'unavailable_count',
              value: String(unavailable)
            },
            {
              kind: 'metric',
              label: 'NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED',
              value: process.env.NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED ?? 'unset'
            },
            {
              kind: 'doc',
              label: 'Tracking table',
              value: 'greenhouse_delivery.task_status_transitions'
            },
            {
              kind: 'doc',
              label: 'Spec canonical',
              value: 'docs/architecture/metrics/RPA_V1.md §4'
            }
          ]
        }
      }

      const severity: 'ok' | 'warning' | 'error' | 'unknown' =
        total === 0
          ? 'unknown'
          : unavailablePct <= WARNING_THRESHOLD_PCT
            ? 'ok'
            : unavailablePct <= ERROR_THRESHOLD_PCT
              ? 'warning'
              : 'error'

      const summary =
        total === 0
          ? 'Sin tareas completadas en últimos 90 días — signal sin datos para evaluar.'
          : severity === 'ok'
            ? `Cobertura canonical de correction transitions saludable (${unavailablePct}% unavailable — ${unavailable}/${total} tareas sin transitions).`
            : severity === 'warning'
              ? `Cobertura parcial de correction transitions (${unavailablePct}% unavailable — ${unavailable}/${total} tareas sin rows). Backfill incompleto o webhook con dropping. Revisar TASK-908b Slice 9 + Notion webhook subscription state.`
              : `Cobertura crítica de correction transitions (${unavailablePct}% unavailable — ${unavailable}/${total} tareas sin rows). Pre-deployment o webhook caído. Revisar TASK-908b shipping state + Notion webhook subscription.`

      return {
        signalId: NOTION_CORRECTION_TRANSITIONS_SOURCE_AVAILABILITY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'data_quality',
        source: 'getNotionCorrectionTransitionsSourceAvailabilitySignal',
        label: 'Cobertura canonical de correction transitions',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'greenhouse_delivery.tasks completed last 90d LEFT JOIN task_status_transitions — count NULL rate'
          },
          {
            kind: 'metric',
            label: 'unavailable_pct',
            value: String(unavailablePct)
          },
          {
            kind: 'metric',
            label: 'total_completed_tasks_90d',
            value: String(total)
          },
          {
            kind: 'metric',
            label: 'unavailable_count',
            value: String(unavailable)
          },
          {
            kind: 'metric',
            label: 'warning_threshold_pct',
            value: String(WARNING_THRESHOLD_PCT)
          },
          {
            kind: 'metric',
            label: 'error_threshold_pct',
            value: String(ERROR_THRESHOLD_PCT)
          },
          {
            kind: 'doc',
            label: 'Helper canonical',
            value: 'src/lib/notion-metrics/count-correction-transitions.ts'
          },
          {
            kind: 'doc',
            label: 'Tracking table',
            value: 'greenhouse_delivery.task_status_transitions'
          },
          {
            kind: 'doc',
            label: 'Spec canonical',
            value: 'docs/architecture/metrics/RPA_V1.md §4'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'delivery', {
        tags: {
          source: 'reliability_signal_notion_correction_transitions_source_availability'
        }
      })

      return {
        signalId: NOTION_CORRECTION_TRANSITIONS_SOURCE_AVAILABILITY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'data_quality',
        source: 'getNotionCorrectionTransitionsSourceAvailabilitySignal',
        label: 'Cobertura canonical de correction transitions',
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
