import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * Notion ↔ member bridge coverage detector.
 *
 * Mide qué porcentaje de tareas Notion recientes (últimos 90 días) tienen
 * `assignee_member_id` resuelto. En la proyección PostgreSQL canónica,
 * `source_updated_at` representa el `last_edited_time` de Notion. Una caída brusca indica regresión del bridge
 * identity Notion-user-id → member-id (el bug class del incidente 2026-05-16
 * post-TASK-877: el resolver PG-first quedó con cobertura parcial sin que
 * BigQuery fallback engagara, dejando ~95% de tareas sin atribución y
 * colapsando el cálculo de bonificaciones OTD/RpA en payroll proyectado).
 *
 * Subsystem rollup: `Identity & Access` (module=identity).
 *
 * **Severity matrix canonical**:
 *
 *   - 0 tareas en ventana → `unknown` (sin señal — sync caído upstream)
 *   - coverage >= 60%      → `ok`     (baseline calibrado post-recovery 2026-05-16)
 *   - 40% ≤ coverage < 60% → `warning` (caída significativa, requiere revisión)
 *   - coverage < 40%       → `error`   (regresión sistémica del bridge)
 *
 * **Por qué el umbral es 60% y no 100%**: Notion tiene usuarios externos
 * legítimos (contratistas del cliente, Sky/Berel, etc.) que NO están en
 * `greenhouse_core.members` y por diseño no tienen `assignee_member_id`. El
 * baseline post-recovery 2026-05-16 fue 64% coverage. Si esto sube
 * (modeling de external contractors en TASK derivada futura), bumpear umbral.
 *
 * **Patrón fuente**: TASK-571 / TASK-720 / TASK-877 — VIEW canónica + reader
 * + reliability signal + lint rule. Mismo shape que
 * `identity-relationship-member-contract-drift.ts`.
 *
 * **Steady state esperado**: coverage >= 60% → severity `ok`. Cualquier caída
 * sostenida es indicador inmediato de regresión.
 */
export const IDENTITY_NOTION_BRIDGE_COVERAGE_SIGNAL_ID =
  'identity.notion_bridge.coverage_drift'

const COVERAGE_OK_THRESHOLD_PCT = 60
const COVERAGE_WARNING_THRESHOLD_PCT = 40
const RECENT_WINDOW_DAYS = 90

const QUERY_SQL = `
  WITH recent_assigned AS (
    SELECT
      assignee_source_id,
      assignee_member_id
    FROM greenhouse_delivery.tasks
    WHERE assignee_source_id IS NOT NULL
      AND COALESCE(source_updated_at, updated_at, created_at, NOW()) >= NOW() - INTERVAL '${RECENT_WINDOW_DAYS} days'
  )
  SELECT
    COUNT(*)::int AS total_assigned_tasks,
    COUNT(*) FILTER (WHERE assignee_member_id IS NOT NULL)::int AS resolved_tasks,
    COUNT(DISTINCT assignee_source_id)::int AS distinct_assignees,
    COUNT(DISTINCT assignee_source_id) FILTER (WHERE assignee_member_id IS NULL)::int AS unresolved_distinct_assignees
  FROM recent_assigned
`

type CoverageRow = {
  total_assigned_tasks: number
  resolved_tasks: number
  distinct_assignees: number
  unresolved_distinct_assignees: number
}

export const getIdentityNotionBridgeCoverageSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CoverageRow>(QUERY_SQL)
    const row = rows[0]

    const total = Number(row?.total_assigned_tasks ?? 0)
    const resolved = Number(row?.resolved_tasks ?? 0)
    const distinctAssignees = Number(row?.distinct_assignees ?? 0)
    const unresolvedAssignees = Number(row?.unresolved_distinct_assignees ?? 0)

    const coveragePct = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0

    const severity: 'ok' | 'warning' | 'error' | 'unknown' =
      total === 0
        ? 'unknown'
        : coveragePct >= COVERAGE_OK_THRESHOLD_PCT
          ? 'ok'
          : coveragePct >= COVERAGE_WARNING_THRESHOLD_PCT
            ? 'warning'
            : 'error'

    const summary =
      total === 0
        ? `Sin tareas Notion en últimos ${RECENT_WINDOW_DAYS} días. El sync Notion puede estar caído upstream — revisa /admin/operations.`
        : severity === 'ok'
          ? `Bridge Notion↔member operativo (${coveragePct}% cobertura, ${resolved}/${total} tareas resueltas).`
          : severity === 'warning'
            ? `Cobertura del bridge Notion↔member cayó a ${coveragePct}% (umbral OK: ${COVERAGE_OK_THRESHOLD_PCT}%). ${unresolvedAssignees} usuarios Notion sin resolver. Revisa si nuevos colaboradores requieren backfill de members.notion_user_id.`
            : `Regresión sistémica del bridge Notion↔member: cobertura ${coveragePct}% (esperado >= ${COVERAGE_OK_THRESHOLD_PCT}%). ${unresolvedAssignees} usuarios Notion sin resolver. Esto colapsa el cálculo de bonificaciones ICO en payroll proyectado. Revisa loadNotionMemberMapPostgresFirst en src/lib/identity/reconciliation/notion-member-map.ts.`

    return {
      signalId: IDENTITY_NOTION_BRIDGE_COVERAGE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityNotionBridgeCoverageSignal',
      label: 'Cobertura bridge Notion↔member',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_delivery.tasks — recent assignee_member_id resolution coverage using source_updated_at'
        },
        {
          kind: 'metric',
          label: 'coverage_pct',
          value: String(coveragePct)
        },
        {
          kind: 'metric',
          label: 'total_assigned_tasks',
          value: String(total)
        },
        {
          kind: 'metric',
          label: 'resolved_tasks',
          value: String(resolved)
        },
        {
          kind: 'metric',
          label: 'distinct_assignees',
          value: String(distinctAssignees)
        },
        {
          kind: 'metric',
          label: 'unresolved_distinct_assignees',
          value: String(unresolvedAssignees)
        },
        {
          kind: 'metric',
          label: 'window_days',
          value: String(RECENT_WINDOW_DAYS)
        },
        {
          kind: 'metric',
          label: 'ok_threshold_pct',
          value: String(COVERAGE_OK_THRESHOLD_PCT)
        },
        {
          kind: 'doc',
          label: 'Bridge resolver',
          value: 'src/lib/identity/reconciliation/notion-member-map.ts'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_notion_bridge_coverage' }
    })

    return {
      signalId: IDENTITY_NOTION_BRIDGE_COVERAGE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityNotionBridgeCoverageSignal',
      label: 'Cobertura bridge Notion↔member',
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
