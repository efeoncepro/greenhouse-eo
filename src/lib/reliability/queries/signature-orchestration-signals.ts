import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-490 — Reliability signals for the signature orchestration platform (EPIC-001).
 *
 * Three failure modes, one per signal (Greenhouse pattern: 1 signal per failure mode, never a
 * coarse `signature.health` rollup — TASK-742/774/768):
 *
 *  1. `documents.signature_request.pending_overdue` (lag) — requests stuck `sent`/`partially_signed`
 *     past the expected turnaround. Steady = 0. The provider callback never arrived, or a signer is
 *     dragging. Operator chases the signer or reconciles.
 *  2. `documents.signature_request.failed` (drift) — requests in `failed`. The provider rejected the
 *     document or the send errored. Steady = 0; any > 0 needs a human.
 *  3. `documents.signature_request.signed_artifact_missing` (data_quality) — requests `completed`
 *     whose `signed_document_asset_id` is NULL or points at a missing asset row. The DB CHECK blocks
 *     completing without a signed asset at write time; this is the defense-in-depth read that catches
 *     a vault asset that was deleted/orphaned after completion. Steady = 0.
 *
 * All three degrade honestly to `unknown` (never false-`ok`) when the query fails.
 */

const PENDING_OVERDUE_DAYS = 14
const FAILED_WINDOW_DAYS = 30

const observedNow = () => new Date().toISOString()

const degraded = (
  signalId: string,
  kind: ReliabilitySignal['kind'],
  label: string,
  error: unknown
): ReliabilitySignal => {
  captureWithDomain(error, 'documents', { tags: { source: `reliability_signal_${signalId}` } })

  return {
    signalId,
    moduleKey: 'documents',
    kind,
    source: 'signature-orchestration-signals',
    label,
    severity: 'unknown',
    summary: 'No fue posible leer el signal. Revisa los logs.',
    observedAt: observedNow(),
    evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
  }
}

// ── 1. pending_overdue (lag) ──────────────────────────────────────────────────
export const SIGNATURE_PENDING_OVERDUE_SIGNAL_ID = 'documents.signature_request.pending_overdue'

export const getSignaturePendingOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Firmas pendientes vencidas'

  try {
    const rows = await query<{ count: string; max_age_days: string | null }>(
      `SELECT COUNT(*)::text AS count,
              MAX(EXTRACT(DAY FROM (NOW() - sent_at)))::text AS max_age_days
       FROM greenhouse_core.signature_requests
       WHERE status IN ('sent', 'partially_signed')
         AND sent_at IS NOT NULL
         AND sent_at < NOW() - ($1::int * INTERVAL '1 day')`,
      [PENDING_OVERDUE_DAYS]
    )

    const count = Number(rows[0]?.count ?? 0)
    const maxAgeDays = Number(rows[0]?.max_age_days ?? 0)
    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : maxAgeDays > PENDING_OVERDUE_DAYS * 2 ? 'error' : 'warning'

    return {
      signalId: SIGNATURE_PENDING_OVERDUE_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'lag',
      source: 'signature-orchestration-signals',
      label,
      severity,
      summary:
        count === 0
          ? `Sin solicitudes de firma pendientes por más de ${PENDING_OVERDUE_DAYS} días.`
          : `${count} solicitud${count === 1 ? '' : 'es'} de firma sin completar hace más de ${PENDING_OVERDUE_DAYS} días (max ${maxAgeDays}d). Reconcilia o avisa al firmante.`,
      observedAt: observedNow(),
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'max_age_days', value: String(maxAgeDays) },
        { kind: 'metric', label: 'threshold_days', value: String(PENDING_OVERDUE_DAYS) }
      ]
    }
  } catch (error) {
    return degraded(SIGNATURE_PENDING_OVERDUE_SIGNAL_ID, 'lag', label, error)
  }
}

// ── 2. failed (drift) ─────────────────────────────────────────────────────────
export const SIGNATURE_FAILED_SIGNAL_ID = 'documents.signature_request.failed'

export const getSignatureFailedSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Firmas fallidas'

  try {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_core.signature_requests
       WHERE status = 'failed'
         AND updated_at >= NOW() - ($1::int * INTERVAL '1 day')`,
      [FAILED_WINDOW_DAYS]
    )

    const count = Number(rows[0]?.count ?? 0)
    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: SIGNATURE_FAILED_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'drift',
      source: 'signature-orchestration-signals',
      label,
      severity,
      summary:
        count === 0
          ? `Sin solicitudes de firma fallidas (últimos ${FAILED_WINDOW_DAYS} días).`
          : `${count} solicitud${count === 1 ? '' : 'es'} de firma en estado fallido. Revisa el provider y reintenta.`,
      observedAt: observedNow(),
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'window_days', value: String(FAILED_WINDOW_DAYS) }
      ]
    }
  } catch (error) {
    return degraded(SIGNATURE_FAILED_SIGNAL_ID, 'drift', label, error)
  }
}

// ── 3. signed_artifact_missing (data_quality) ─────────────────────────────────
export const SIGNATURE_SIGNED_ARTIFACT_MISSING_SIGNAL_ID = 'documents.signature_request.signed_artifact_missing'

export const getSignatureSignedArtifactMissingSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Firma completada sin documento firmado'

  try {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_core.signature_requests sr
       WHERE sr.status = 'completed'
         AND (
           sr.signed_document_asset_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM greenhouse_core.assets a WHERE a.asset_id = sr.signed_document_asset_id
           )
         )`
    )

    const count = Number(rows[0]?.count ?? 0)
    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: SIGNATURE_SIGNED_ARTIFACT_MISSING_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'data_quality',
      source: 'signature-orchestration-signals',
      label,
      severity,
      summary:
        count === 0
          ? 'Toda solicitud de firma completada tiene su documento firmado en el vault.'
          : `${count} solicitud${count === 1 ? '' : 'es'} completada${count === 1 ? '' : 's'} sin documento firmado resoluble. Integridad del vault comprometida.`,
      observedAt: observedNow(),
      evidence: [{ kind: 'metric', label: 'count', value: String(count) }]
    }
  } catch (error) {
    return degraded(SIGNATURE_SIGNED_ARTIFACT_MISSING_SIGNAL_ID, 'data_quality', label, error)
  }
}
