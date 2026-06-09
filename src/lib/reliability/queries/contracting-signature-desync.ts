import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1024 — Reliability signal: a contracting case whose linked signature_request reached a
 * terminal state but the CASE never advanced to match (the reactive bridge consumer failed or
 * dead-lettered). This is the one genuinely-new failure mode the bridge introduces — the aggregate
 * level is already covered by the TASK-490 `documents.signature_request.*` signals.
 *
 * Desync conditions (the request is ahead of the case, with a >30min grace for the consumer + retries):
 *  - request `completed` but case NOT in {fully_signed, registered_external, active}
 *  - request `failed`/`expired` but case NOT in {signature_failed, expired, voided}
 *
 * Kind: `drift`. Severity: warning if count > 0, error if any desync older than 24h. Steady = 0.
 */
export const CONTRACTING_SIGNATURE_DESYNC_SIGNAL_ID = 'workforce.contracting.signature_desync'

const DESYNC_WHERE = `
  c.signature_request_id IS NOT NULL
  AND (
    (sr.status = 'completed'
      AND c.status NOT IN ('fully_signed', 'registered_external', 'active')
      AND sr.completed_at IS NOT NULL
      AND sr.completed_at < NOW() - INTERVAL '30 minutes')
    OR
    (sr.status IN ('failed', 'expired')
      AND c.status NOT IN ('signature_failed', 'expired', 'voided')
      AND sr.updated_at < NOW() - INTERVAL '30 minutes')
  )`

export interface ContractingSignatureDesyncRow {
  caseId: string
  caseStatus: string
  signatureStatus: string
  desyncAgeHours: number
}

type SqlRow = {
  case_id: string
  case_status: string
  signature_status: string
  desync_age_hours: number | string
}

export const listContractingSignatureDesyncRows = async (limit = 50): Promise<ContractingSignatureDesyncRow[]> => {
  const rows = await query<SqlRow>(
    `SELECT
       c.case_id,
       c.status AS case_status,
       sr.status AS signature_status,
       EXTRACT(EPOCH FROM (NOW() - COALESCE(sr.completed_at, sr.updated_at))) / 3600 AS desync_age_hours
     FROM greenhouse_hr.workforce_contracting_cases c
     JOIN greenhouse_core.signature_requests sr ON sr.signature_request_id = c.signature_request_id
     WHERE ${DESYNC_WHERE}
     ORDER BY COALESCE(sr.completed_at, sr.updated_at) ASC
     LIMIT ${Math.min(Math.max(Math.trunc(limit), 1), 500)}`
  )

  return rows.map(row => ({
    caseId: row.case_id,
    caseStatus: row.case_status,
    signatureStatus: row.signature_status,
    desyncAgeHours: Number(row.desync_age_hours ?? 0)
  }))
}

export const getContractingSignatureDesyncSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await listContractingSignatureDesyncRows()
    const count = rows.length
    const maxAgeHours = rows.reduce((acc, row) => Math.max(acc, row.desyncAgeHours), 0)

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : maxAgeHours > 24 ? 'error' : 'warning'

    return {
      signalId: CONTRACTING_SIGNATURE_DESYNC_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'drift',
      source: 'getContractingSignatureDesyncSignal',
      label: 'Contrato firmado sin avanzar el caso',
      severity,
      summary:
        count === 0
          ? 'Sin desync entre la firma y el estado del caso de contratación.'
          : `${count} caso${count === 1 ? '' : 's'} cuya firma terminó pero el caso no avanzó (max ${maxAgeHours.toFixed(1)}h). Revisa el bridge reactivo.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'max_age_hours', value: maxAgeHours.toFixed(1) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1024-workforce-contracting-signature-consumer-zapsign.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'workforce', {
      tags: { source: 'reliability_signal_contracting_signature_desync' }
    })

    return {
      signalId: CONTRACTING_SIGNATURE_DESYNC_SIGNAL_ID,
      moduleKey: 'workforce',
      kind: 'drift',
      source: 'getContractingSignatureDesyncSignal',
      label: 'Contrato firmado sin avanzar el caso',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
