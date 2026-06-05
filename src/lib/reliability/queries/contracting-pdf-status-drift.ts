import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1023 — Reliability signal: drift between a contracting case's current `status` and the
 * status its persisted PDF was last rendered at (`pdf_status_at_render`).
 *
 * Unlike the finiquito (1:1 status↔watermark), a contracting case has many statuses that map to
 * the SAME watermark bucket (PROYECTO). A strict `status != pdf_status_at_render` would be noisy,
 * so drift is detected by comparing the WATERMARK BUCKET of both statuses — i.e. the persisted PDF
 * watermark is stale relative to the current status (e.g. case became `fully_signed` [clean] but the
 * PDF still carries the PROYECTO watermark because the re-render did not run).
 *
 * Invariant: the canonical helper `regenerateContractingPdfForStatus` keeps `pdf_status_at_render`
 * in lockstep with `status` on every render. Drift = a status transition without a re-render
 * (e.g. a future signature transition forgets to re-render, or a render soft-failed).
 *
 * Kind: `drift`. Severity: `warning` if count > 0, `error` if any drift older than 24h. Steady = 0.
 */
export const CONTRACTING_PDF_STATUS_DRIFT_SIGNAL_ID = 'workforce.contracting.pdf_status_drift'

const DEFAULT_WINDOW_DAYS = 90

// Watermark bucket per status — must mirror resolveContractingWatermark (contracting-document-pdf.tsx).
const bucketSql = (col: string) => `
  CASE
    WHEN ${col} IN ('fully_signed','registered_external','active','accepted','converted_to_contract') THEN 'clean'
    WHEN ${col} IN ('voided','withdrawn') THEN 'voided'
    WHEN ${col} IN ('rejected','signature_failed') THEN 'rejected'
    WHEN ${col} = 'expired' THEN 'expired'
    WHEN ${col} = 'superseded' THEN 'superseded'
    ELSE 'proyecto'
  END`

const DRIFT_WHERE = `
  c.pdf_asset_id IS NOT NULL
  AND c.pdf_status_at_render IS NOT NULL
  AND c.created_at >= NOW() - ($1::int * INTERVAL '1 day')
  AND (${bucketSql('c.status')}) IS DISTINCT FROM (${bucketSql('c.pdf_status_at_render')})`

export interface ContractingPdfStatusDriftRow {
  caseId: string
  caseKind: string
  currentStatus: string
  pdfStatusAtRender: string
  driftAgeHours: number
}

type SqlRow = {
  case_id: string
  case_kind: string
  current_status: string
  pdf_status_at_render: string
  drift_age_hours: number | string
}

export const listContractingPdfStatusDriftRows = async (
  windowDays = DEFAULT_WINDOW_DAYS,
  limit = 50
): Promise<ContractingPdfStatusDriftRow[]> => {
  const rows = await query<SqlRow>(
    `SELECT
       c.case_id,
       c.case_kind,
       c.status AS current_status,
       c.pdf_status_at_render,
       EXTRACT(EPOCH FROM (NOW() - COALESCE(c.pdf_generated_at, c.updated_at))) / 3600 AS drift_age_hours
     FROM greenhouse_hr.workforce_contracting_cases c
     WHERE ${DRIFT_WHERE}
     ORDER BY COALESCE(c.pdf_generated_at, c.updated_at) ASC NULLS LAST
     LIMIT ${Math.min(Math.max(Math.trunc(limit), 1), 500)}`,
    [Math.min(Math.max(Math.trunc(windowDays), 1), 365)]
  )

  return rows.map(row => ({
    caseId: row.case_id,
    caseKind: row.case_kind,
    currentStatus: row.current_status,
    pdfStatusAtRender: row.pdf_status_at_render,
    driftAgeHours: Number(row.drift_age_hours ?? 0)
  }))
}

export const getContractingPdfStatusDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await listContractingPdfStatusDriftRows()
    const count = rows.length
    const maxAgeHours = rows.reduce((acc, row) => Math.max(acc, row.driftAgeHours), 0)

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : maxAgeHours > 24 ? 'error' : 'warning'

    return {
      signalId: CONTRACTING_PDF_STATUS_DRIFT_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'drift',
      source: 'getContractingPdfStatusDriftSignal',
      label: 'Contrato PDF status drift',
      severity,
      summary:
        count === 0
          ? 'Sin drift entre el estado del caso y el watermark del PDF persistido (últimos 90 días).'
          : `${count} caso${count === 1 ? '' : 's'} con watermark del PDF desfasado del estado actual (max ${maxAgeHours.toFixed(1)}h). Regenera el PDF.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'max_age_hours', value: maxAgeHours.toFixed(1) },
        { kind: 'metric', label: 'window_days', value: String(DEFAULT_WINDOW_DAYS) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1023-workforce-contracting-pdf-signable-render-consumer.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', {
      tags: { source: 'reliability_signal_contracting_pdf_status_drift' }
    })

    return {
      signalId: CONTRACTING_PDF_STATUS_DRIFT_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'drift',
      source: 'getContractingPdfStatusDriftSignal',
      label: 'Contrato PDF status drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
