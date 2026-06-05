import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1019 — Workforce Contracting AI drafting failures.
 *
 * Counts Claude drafting runs (`workforce_contracting_ai_runs`) that ended in
 * `status = 'failed'` in the last 24h (schema-invalid output, provider error). With
 * `WORKFORCE_CONTRACTING_AI_ENABLED` OFF there are no runs → 0. Advisory-only: a failed
 * run never blocks a case, but a sustained > 0 means the prompt/schema/secret needs
 * attention.
 *
 * Kind `dead_letter`, moduleKey `workforce`, steady = 0. Date arithmetic uses an
 * interval comparison on a TIMESTAMPTZ column (no EXTRACT(EPOCH FROM date - date), TASK-893).
 * Severity: 0 → ok · > 0 → error · query falla → unknown.
 */
export const CONTRACTING_AI_DRAFT_FAILED_SIGNAL_ID = 'workforce.contracting.ai_draft_failed'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.workforce_contracting_ai_runs
  WHERE status = 'failed' AND created_at > now() - interval '24 hours'
`

export const getContractingAiDraftFailedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'error' = count === 0 ? 'ok' : 'error'

    return {
      signalId: CONTRACTING_AI_DRAFT_FAILED_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'dead_letter',
      source: 'getContractingAiDraftFailedSignal',
      label: 'Fallas de drafting Claude (contratación)',
      severity,
      summary:
        count === 0
          ? 'Sin fallas de drafting Claude en las últimas 24h.'
          : `${count} corrida${count === 1 ? '' : 's'} de drafting Claude fallida${count === 1 ? '' : 's'} (24h).`,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: "workforce_contracting_ai_runs WHERE status='failed' (24h)" },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md#10' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', { tags: { source: 'reliability_signal_contracting_ai_draft_failed' } })

    return {
      signalId: CONTRACTING_AI_DRAFT_FAILED_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'dead_letter',
      source: 'getContractingAiDraftFailedSignal',
      label: 'Fallas de drafting Claude (contratación)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
