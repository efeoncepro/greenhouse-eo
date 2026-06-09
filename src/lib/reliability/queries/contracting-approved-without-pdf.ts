import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1019 — Approved contract cases waiting too long for the PDF render.
 *
 * A contract at `ready_for_pdf` was internally approved but the document artifact has
 * not been generated. Drift > 7 days means the (future) EPIC-001 render/signature
 * consumer has not picked it up. Steady = 0 until the render consumer exists AND keeps
 * up; in the foundation it is naturally 0 because no case reaches `ready_for_pdf`
 * without the (future) render-readiness command.
 *
 * Kind `drift`, moduleKey `workforce`. Severity: 0 → ok; > 0 → error. Interval on
 * TIMESTAMPTZ (TASK-893 safe).
 */
export const CONTRACTING_APPROVED_WITHOUT_PDF_SIGNAL_ID = 'workforce.contracting.approved_without_pdf'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.workforce_contracting_cases
  WHERE case_kind = 'employment_contract'
    AND status = 'ready_for_pdf'
    AND updated_at < now() - interval '7 days'
`

export const getContractingApprovedWithoutPdfSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'error' = count === 0 ? 'ok' : 'error'

    return {
      signalId: CONTRACTING_APPROVED_WITHOUT_PDF_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'drift',
      source: 'getContractingApprovedWithoutPdfSignal',
      label: 'Contratos aprobados sin PDF generado',
      severity,
      summary:
        count === 0
          ? 'Sin contratos esperando generación de PDF por más de 7 días.'
          : `${count} contrato${count === 1 ? '' : 's'} en ready_for_pdf > 7 días sin artefacto generado.`,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: "workforce_contracting_cases WHERE status='ready_for_pdf' AND updated_at < now()-7d" },
        { kind: 'metric', label: 'drift_count', value: String(count) },
        { kind: 'doc', label: 'Consumer', value: 'EPIC-001 render/signature (future task)' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', { tags: { source: 'reliability_signal_contracting_approved_without_pdf' } })

    return {
      signalId: CONTRACTING_APPROVED_WITHOUT_PDF_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'drift',
      source: 'getContractingApprovedWithoutPdfSignal',
      label: 'Contratos aprobados sin PDF generado',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
