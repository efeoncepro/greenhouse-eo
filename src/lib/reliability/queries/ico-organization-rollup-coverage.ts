import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1171 — `delivery.ico.client_absent_from_org_rollup` signal.
 *
 * Detecta la **exclusión silenciosa** de un cliente del rollup ICO de organización:
 * un cliente con actividad de delivery en el mes en curso (tareas en
 * `greenhouse_delivery.tasks`) que NO aparece en el rollup
 * `greenhouse_serving.ico_organization_metrics` del período → su dashboard/CVR
 * de cliente queda vacío sin que nada lo avise.
 *
 * **Caso fuente (2026-06-19)**: Grupo Berel (`cli-0863869c-…`) sincronizaba sano
 * (108 tareas en el portal, 84 en el snapshot BQ del período) pero estaba ausente
 * de `metrics_by_organization` — el materializador corría `status=succeeded` con
 * `rows_merged=2` (solo efeonce/sky) por el gap del incremental-delta: una entidad
 * nunca-materializada cuya última edición quedó detrás del cutoff que avanza cada
 * noche jamás entra al MERGE source y, como el MERGE no tiene WHEN NOT MATCHED BY
 * SOURCE, tampoco hay nada que la inserte. El fix de causa raíz (coverage-gap en
 * `buildMergeSql`) hace que el próximo run la inserte; este signal es la
 * defense-in-depth que vuelve VISIBLE la clase de bug (regla ICO
 * "reliability signal upstream": detectarlo antes de que un cliente o Nexa se tope
 * con el muro, no después).
 *
 * PG-based: compara `greenhouse_delivery.tasks.client_id` (clientes con actividad
 * en el mes) vs `greenhouse_serving.ico_organization_metrics.organization_id`
 * (proyección PG del rollup BQ). Grano verificado idéntico (ambos usan los mismos
 * ids canónicos `cli-…` / `space-efeonce` / `hubspot-company-…`). Sin date-math con
 * EXTRACT(EPOCH) (gate TASK-893): `date_trunc('month', CURRENT_DATE)` para la
 * ventana del período.
 *
 * Subsystem rollup: `delivery`. Steady state: `absent_count = 0` → `ok`.
 *
 * Severity matrix:
 *   - source_total = 0          → `unknown` (sin actividad de delivery / sync caído)
 *   - absent_count = 0          → `ok`      (todos los clientes activos están en el rollup)
 *   - 1 ≤ absent_count ≤ 3      → `warning` (cliente(s) excluido(s) — revisar materializador)
 *   - absent_count > 3          → `error`   (exclusión sistémica del rollup de cliente)
 *
 * Cross-ref: docs/tasks/in-progress/TASK-1171-*.md + buildMergeSql coverage-gap.
 */

export const ICO_ORG_ROLLUP_COVERAGE_SIGNAL_ID =
  'delivery.ico.client_absent_from_org_rollup'

const WARNING_MAX_ABSENT = 3

const QUERY_SQL = `
  WITH source_clients AS (
    SELECT DISTINCT t.client_id
    FROM greenhouse_delivery.tasks t
    WHERE t.client_id IS NOT NULL
      AND t.client_id <> ''
      AND COALESCE(t.source_updated_at, t.updated_at, t.created_at)
            >= date_trunc('month', CURRENT_DATE)
  ),
  rollup_clients AS (
    SELECT DISTINCT organization_id
    FROM greenhouse_serving.ico_organization_metrics
    WHERE period_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
  ),
  absent AS (
    SELECT s.client_id
    FROM source_clients s
    WHERE NOT EXISTS (
      SELECT 1 FROM rollup_clients r WHERE r.organization_id = s.client_id
    )
  )
  SELECT
    (SELECT COUNT(*) FROM source_clients)::int AS source_total,
    (SELECT COUNT(*) FROM absent)::int AS absent_count,
    COALESCE(
      (SELECT STRING_AGG(client_id, ', ') FROM (SELECT client_id FROM absent ORDER BY client_id LIMIT 10) x),
      ''
    ) AS absent_sample
`

type CoverageRow = {
  source_total: number
  absent_count: number
  absent_sample: string
  [key: string]: unknown
}

export const getIcoOrganizationRollupCoverageSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<CoverageRow>(QUERY_SQL)
      const row = rows[0]

      const sourceTotal = Number(row?.source_total ?? 0)
      const absentCount = Number(row?.absent_count ?? 0)
      const absentSample = String(row?.absent_sample ?? '')

      const severity: 'ok' | 'warning' | 'error' | 'unknown' =
        sourceTotal === 0
          ? 'unknown'
          : absentCount === 0
            ? 'ok'
            : absentCount <= WARNING_MAX_ABSENT
              ? 'warning'
              : 'error'

      const summary =
        sourceTotal === 0
          ? 'Sin clientes con actividad de delivery en el mes en curso — sync de delivery puede estar caído upstream.'
          : severity === 'ok'
            ? `Rollup ICO de organización completo: los ${sourceTotal} clientes con actividad este mes están en metrics_by_organization.`
            : severity === 'warning'
              ? `${absentCount} cliente(s) con tareas este mes ausente(s) del rollup ICO de organización (${absentSample}). Su dashboard/CVR queda vacío. Revisar coverage-gap del materializador (TASK-1171).`
              : `Exclusión sistémica del rollup ICO de cliente: ${absentCount} clientes con actividad ausentes de metrics_by_organization (${absentSample}). Revisar materializador / incremental-delta coverage-gap.`

      return {
        signalId: ICO_ORG_ROLLUP_COVERAGE_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'data_quality',
        source: 'getIcoOrganizationRollupCoverageSignal',
        label: 'Cobertura rollup ICO de organización (clientes)',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'greenhouse_delivery.tasks (clientes con actividad mes en curso) vs greenhouse_serving.ico_organization_metrics (rollup del período)'
          },
          { kind: 'metric', label: 'source_total', value: String(sourceTotal) },
          { kind: 'metric', label: 'absent_count', value: String(absentCount) },
          { kind: 'metric', label: 'absent_clients', value: absentSample || '(ninguno)' },
          { kind: 'metric', label: 'warning_max_absent', value: String(WARNING_MAX_ABSENT) },
          {
            kind: 'doc',
            label: 'Fix de causa raíz',
            value: 'src/lib/ico-engine/materialize-sql-builders.ts (coverage-gap en buildMergeSql)'
          },
          {
            kind: 'doc',
            label: 'Task',
            value: 'docs/tasks/in-progress/TASK-1171-ico-client-inclusion-systemic-full-api-parity.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'delivery', {
        tags: { source: 'reliability_signal_ico_org_rollup_coverage' }
      })

      return {
        signalId: ICO_ORG_ROLLUP_COVERAGE_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'data_quality',
        source: 'getIcoOrganizationRollupCoverageSignal',
        label: 'Cobertura rollup ICO de organización (clientes)',
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
