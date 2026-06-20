import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySeverity, ReliabilitySignal } from '@/types/reliability'

export const DESIGN_HANDOFF_PRIMITIVE_DECISION_MISSING_SIGNAL_ID =
  'design_system.handoff.primitive_decision_missing'
export const DESIGN_HANDOFF_PRIMITIVE_LAB_MISSING_SIGNAL_ID = 'design_system.handoff.primitive_lab_missing'
export const DESIGN_HANDOFF_RUNTIME_WITHOUT_GVC_SIGNAL_ID = 'design_system.handoff.runtime_without_gvc'
export const DESIGN_HANDOFF_ROUTE_ONLY_REUSE_SUSPECT_SIGNAL_ID = 'design_system.handoff.route_only_reuse_suspect'

type PrimitiveGovernanceRow = {
  active_count: number
  primitive_decision_missing_count: number
  primitive_lab_missing_count: number
  runtime_without_gvc_count: number
  route_only_reuse_suspect_count: number
}

const severityForCount = (count: number): ReliabilitySeverity => (count === 0 ? 'ok' : count > 5 ? 'error' : 'warning')

const signal = ({
  signalId,
  label,
  count,
  activeCount,
  okSummary,
  problemSummary,
  observedAt,
  extraEvidence = []
}: {
  signalId: string
  label: string
  count: number
  activeCount: number
  okSummary: string
  problemSummary: string
  observedAt: string
  extraEvidence?: ReliabilitySignal['evidence']
}): ReliabilitySignal => ({
  signalId,
  moduleKey: 'platform',
  kind: 'drift',
  source: 'getDesignHandoffPrimitiveGovernanceSignals',
  label,
  severity: severityForCount(count),
  summary: count === 0 ? okSummary : problemSummary,
  observedAt,
  evidence: [
    { kind: 'metric', label: 'count', value: String(count) },
    { kind: 'metric', label: 'active_count', value: String(activeCount) },
    { kind: 'metric', label: 'steady_state', value: '0' },
    { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entries' },
    ...extraEvidence
  ]
})

const degradedSignal = (signalId: string, label: string, observedAt: string): ReliabilitySignal => ({
  signalId,
  moduleKey: 'platform',
  kind: 'drift',
  source: 'getDesignHandoffPrimitiveGovernanceSignals',
  label,
  severity: 'unknown',
  summary:
    'No fue posible leer el signal de Primitive governance. Verifica que la migracion de TASK-1180 este aplicada.',
  observedAt,
  evidence: [
    { kind: 'metric', label: 'steady_state', value: '0' },
    { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entries' }
  ]
})

export const getDesignHandoffPrimitiveGovernanceSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<PrimitiveGovernanceRow>(
      `WITH active_entries AS (
         SELECT *
           FROM greenhouse_core.design_handoff_entries
          WHERE status <> 'archived'
       )
       SELECT COUNT(*)::int AS active_count,
              COUNT(*) FILTER (WHERE implementation_strategy IS NULL)::int AS primitive_decision_missing_count,
              COUNT(*) FILTER (
                WHERE implementation_strategy IN ('extend_primitive', 'new_primitive')
                  AND primitive_lab_route IS NULL
              )::int AS primitive_lab_missing_count,
              COUNT(*) FILTER (
                WHERE implementation_strategy IN ('reuse_primitive', 'extend_primitive', 'new_primitive', 'variant_kind')
                  AND primitive_gvc_ref IS NULL
                  AND NOT EXISTS (
                    SELECT 1
                      FROM greenhouse_core.design_handoff_entry_evidence evidence
                     WHERE evidence.entry_id = active_entries.entry_id
                       AND evidence.evidence_type = 'gvc_capture'
                  )
              )::int AS runtime_without_gvc_count,
              COUNT(*) FILTER (WHERE implementation_strategy = 'route_only' AND kind = 'component')::int AS route_only_reuse_suspect_count
         FROM active_entries`
    )

    const row = rows[0] ?? {
      active_count: 0,
      primitive_decision_missing_count: 0,
      primitive_lab_missing_count: 0,
      runtime_without_gvc_count: 0,
      route_only_reuse_suspect_count: 0
    }

    return [
      signal({
        signalId: DESIGN_HANDOFF_PRIMITIVE_DECISION_MISSING_SIGNAL_ID,
        label: 'Design handoff primitive decision missing',
        count: row.primitive_decision_missing_count,
        activeCount: row.active_count,
        okSummary: `${row.active_count} handoff${row.active_count === 1 ? '' : 's'} activo${row.active_count === 1 ? '' : 's'} con decision Primitive governance o sin deuda activa.`,
        problemSummary: `${row.primitive_decision_missing_count} de ${row.active_count} handoff${row.active_count === 1 ? '' : 's'} activo${row.active_count === 1 ? '' : 's'} no tienen decision Primitive governance.`,
        observedAt
      }),
      signal({
        signalId: DESIGN_HANDOFF_PRIMITIVE_LAB_MISSING_SIGNAL_ID,
        label: 'Design handoff primitive lab missing',
        count: row.primitive_lab_missing_count,
        activeCount: row.active_count,
        okSummary: 'Las decisiones que extienden o crean primitives tienen Lab asociado o no existen en el ledger activo.',
        problemSummary: `${row.primitive_lab_missing_count} handoff${row.primitive_lab_missing_count === 1 ? '' : 's'} requieren Lab antes de cerrar.`,
        observedAt
      }),
      signal({
        signalId: DESIGN_HANDOFF_RUNTIME_WITHOUT_GVC_SIGNAL_ID,
        label: 'Design handoff runtime without GVC',
        count: row.runtime_without_gvc_count,
        activeCount: row.active_count,
        okSummary: 'Las decisiones Primitive governance reutilizables tienen evidencia GVC o no hay deuda activa.',
        problemSummary: `${row.runtime_without_gvc_count} handoff${row.runtime_without_gvc_count === 1 ? '' : 's'} reutilizables no tienen GVC asociado.`,
        observedAt
      }),
      signal({
        signalId: DESIGN_HANDOFF_ROUTE_ONLY_REUSE_SUSPECT_SIGNAL_ID,
        label: 'Design handoff route-only reuse suspect',
        count: row.route_only_reuse_suspect_count,
        activeCount: row.active_count,
        okSummary: 'No hay componentes marcados como route_only en el ledger activo.',
        problemSummary: `${row.route_only_reuse_suspect_count} handoff${row.route_only_reuse_suspect_count === 1 ? '' : 's'} de componente fueron marcados route_only y requieren review.`,
        observedAt
      })
    ]
  } catch (error) {
    captureWithDomain(error, 'platform', {
      tags: { source: 'reliability_signal_design_handoff_primitive_governance' }
    })

    return [
      degradedSignal(
        DESIGN_HANDOFF_PRIMITIVE_DECISION_MISSING_SIGNAL_ID,
        'Design handoff primitive decision missing',
        observedAt
      ),
      degradedSignal(DESIGN_HANDOFF_PRIMITIVE_LAB_MISSING_SIGNAL_ID, 'Design handoff primitive lab missing', observedAt),
      degradedSignal(DESIGN_HANDOFF_RUNTIME_WITHOUT_GVC_SIGNAL_ID, 'Design handoff runtime without GVC', observedAt),
      degradedSignal(
        DESIGN_HANDOFF_ROUTE_ONLY_REUSE_SUSPECT_SIGNAL_ID,
        'Design handoff route-only reuse suspect',
        observedAt
      )
    ]
  }
}
