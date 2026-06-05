import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1019 — Employment contract cases stuck at `validation_blocked` for too long.
 *
 * A contract case in `validation_blocked` has deterministic jurisdiction-pack blockers
 * that an operator must resolve. Overdue (> 7 days) means the case is stalled.
 *
 * Kind `lag`, moduleKey `workforce`, steady = 0. Severity: 0 → ok; > 0 → warning;
 * max age > 14 days → error. Interval arithmetic on TIMESTAMPTZ (TASK-893 safe).
 */
export const CONTRACTING_VALIDATION_BLOCKED_OVERDUE_SIGNAL_ID =
  'workforce.contracting.validation_blocked_overdue'

const ERROR_THRESHOLD_DAYS = 14

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COALESCE(MAX(EXTRACT(DAY FROM (now() - updated_at)))::int, 0) AS max_age_days
  FROM greenhouse_hr.workforce_contracting_cases
  WHERE case_kind = 'employment_contract'
    AND status = 'validation_blocked'
    AND updated_at < now() - interval '7 days'
`

export const getContractingValidationBlockedOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number; max_age_days: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const maxAgeDays = Number(rows[0]?.max_age_days ?? 0)

    const severity: 'ok' | 'warning' | 'error' =
      count === 0 ? 'ok' : maxAgeDays > ERROR_THRESHOLD_DAYS ? 'error' : 'warning'

    return {
      signalId: CONTRACTING_VALIDATION_BLOCKED_OVERDUE_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'lag',
      source: 'getContractingValidationBlockedOverdueSignal',
      label: 'Contratos bloqueados por validación (overdue)',
      severity,
      summary:
        count === 0
          ? 'Sin contratos bloqueados por validación por más de 7 días.'
          : `${count} contrato${count === 1 ? '' : 's'} en validation_blocked > 7 días (máx ${maxAgeDays} días).`,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: "workforce_contracting_cases WHERE status='validation_blocked' AND updated_at < now()-7d" },
        { kind: 'metric', label: 'overdue_count', value: String(count) },
        { kind: 'metric', label: 'max_age_days', value: String(maxAgeDays) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', { tags: { source: 'reliability_signal_contracting_validation_blocked_overdue' } })

    return {
      signalId: CONTRACTING_VALIDATION_BLOCKED_OVERDUE_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'lag',
      source: 'getContractingValidationBlockedOverdueSignal',
      label: 'Contratos bloqueados por validación (overdue)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
