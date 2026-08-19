import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { rotateCandidateTestTokenForAccessRecoveryWithClient } from '../instances'
import {
  ASSESSMENT_ACCESS_RECOVERY_SECURE_LINK_TTL_HOURS,
  decideAssessmentAccessRecoveryEligibility,
  digestAssessmentRecoveryIdempotencyKey,
  fingerprintAssessmentRecoveryRequest,
  isAssessmentAccessRecoveryReason,
  type AssessmentAccessRecoveryReason,
  type AssessmentAccessRecoveryResult,
} from './contracts'
import {
  assertRecoveryRateLimit,
  loadRecoveryState,
  normalizeRecoveryReceipt,
  resolveHiringCandidateAccessOrigin,
  type RecoveryReceiptRow,
} from './recover-email'

export interface RecoverCandidateTestAccessBySecureLinkInput {
  assessmentId: string
  reasonCode: AssessmentAccessRecoveryReason
  idempotencyKey: string
}

const SECURE_LINK_TTL_MS = ASSESSMENT_ACCESS_RECOVERY_SECURE_LINK_TTL_HOURS * 60 * 60 * 1000

type PreparedSecureLink =
  | { replayed: true; receipt: ReturnType<typeof normalizeRecoveryReceipt> }
  | { replayed: false; receipt: ReturnType<typeof normalizeRecoveryReceipt>; token: string }

const findReceiptWithClient = async (
  client: PoolClient,
  input: {
    actorUserId: string
    assessmentId: string
    idempotencyDigest: string
    requestFingerprint: string
  },
) => {
  const result = await client.query<RecoveryReceiptRow & { request_fingerprint: string }>(
    `SELECT recovery_id,assessment_id,application_id,opening_id,actor_user_id,channel,reason_code,
            previous_status,resulting_status,token_version_id,issued_at,expires_at,outcome,delivery_id,
            request_fingerprint
     FROM greenhouse_hiring.hiring_assessment_access_recovery
     WHERE actor_user_id=$1 AND assessment_id=$2 AND channel='secure_link' AND idempotency_digest=$3
     LIMIT 1`,
    [input.actorUserId, input.assessmentId, input.idempotencyDigest],
  )

  const row = result.rows[0]

  if (!row) return null

  if (row.request_fingerprint !== input.requestFingerprint) {
    throw new HiringValidationError(
      'La clave de idempotencia ya se usó para una solicitud distinta.',
      'assessment_recovery_idempotency_conflict',
      409,
    )
  }

  return normalizeRecoveryReceipt(row)
}

/**
 * Human-only is enforced by the Product API adapter. This domain command is deliberately
 * actor-explicit so workers/agents cannot acquire authority implicitly. It never persists,
 * publishes or logs the raw bearer; only the first serialized caller receives it.
 */
export const recoverCandidateTestAccessBySecureLink = async (
  input: RecoverCandidateTestAccessBySecureLinkInput,
  actorUserId: string,
): Promise<AssessmentAccessRecoveryResult> => {
  const assessmentId = input.assessmentId?.trim()
  const idempotencyKey = input.idempotencyKey?.trim()

  if (!actorUserId) {
    throw new HiringValidationError('Falta el usuario que recupera el acceso.', 'assessment_recovery_missing_actor', 401)
  }

  if (!assessmentId) {
    throw new HiringValidationError('assessmentId es obligatorio.', 'assessment_recovery_field_required', 400)
  }

  if (!isAssessmentAccessRecoveryReason(input.reasonCode)) {
    throw new HiringValidationError('Debes elegir un motivo válido.', 'assessment_recovery_invalid_reason', 400)
  }

  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 200) {
    throw new HiringValidationError(
      'La clave de idempotencia debe tener entre 16 y 200 caracteres.',
      'assessment_recovery_invalid_idempotency_key',
      400,
    )
  }

  // Resolve and allowlist the response origin before entering the credential transaction.
  const accessOrigin = resolveHiringCandidateAccessOrigin()
  const idempotencyDigest = digestAssessmentRecoveryIdempotencyKey(idempotencyKey)

  const requestFingerprint = fingerprintAssessmentRecoveryRequest({
    assessmentId,
    channel: 'secure_link',
    reasonCode: input.reasonCode,
  })

  const prepared = await withGreenhousePostgresTransaction<PreparedSecureLink>(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `assessment-access-recovery:secure-link:${actorUserId}:${assessmentId}:${idempotencyDigest}`,
    ])

    const existing = await findReceiptWithClient(client, {
      actorUserId,
      assessmentId,
      idempotencyDigest,
      requestFingerprint,
    })

    if (existing) return { replayed: true, receipt: existing }

    const state = await loadRecoveryState(client, assessmentId)

    if (!state) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    const now = new Date(state.now_at)
    const deadline = state.effective_deadline_at ? new Date(state.effective_deadline_at) : null

    const eligibility = decideAssessmentAccessRecoveryEligibility({
      method: state.method,
      status: state.status,
      startedAt: state.started_at,
      tokenExpiresAt: state.token_expires_at,
      effectiveDeadlineAt: deadline,
      applicationStage: state.application_stage,
      applicationDecision: state.application_decision,
      consentStatus: state.consent_status,
      reasonCode: input.reasonCode,
      now,
    })

    if (!eligibility.allowed) {
      throw new HiringValidationError(
        'Este test no puede recuperar acceso en su estado actual.',
        eligibility.code,
        409,
      )
    }

    await assertRecoveryRateLimit(client, assessmentId, 'secure_link')

    const secureLinkExpiry = new Date(now.getTime() + SECURE_LINK_TTL_MS)

    const expiresAt = eligibility.resultingStatus === 'in_progress' && deadline && deadline < secureLinkExpiry
      ? deadline
      : secureLinkExpiry

    const inserted = await client.query<RecoveryReceiptRow>(
      `INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery (
         assessment_id,application_id,opening_id,actor_user_id,channel,reason_code,
         idempotency_digest,request_fingerprint,previous_status,resulting_status,
         issued_at,expires_at,outcome,delivery_id
       ) VALUES ($1,$2,$3,$4,'secure_link',$5,$6,$7,$8,$9,$10,$11,'link_issued',NULL)
       RETURNING recovery_id,assessment_id,application_id,opening_id,actor_user_id,channel,reason_code,
                 previous_status,resulting_status,token_version_id,issued_at,expires_at,outcome,delivery_id`,
      [
        assessmentId,
        state.application_id,
        state.opening_id,
        actorUserId,
        input.reasonCode,
        idempotencyDigest,
        requestFingerprint,
        state.status,
        eligibility.resultingStatus,
        now,
        expiresAt,
      ],
    )

    const receipt = inserted.rows[0]

    if (!receipt) throw new Error('Assessment secure-link recovery receipt was not created.')

    const rotated = await rotateCandidateTestTokenForAccessRecoveryWithClient(client, {
      assessmentId,
      expectedStatus: state.status as 'assigned' | 'sent' | 'in_progress' | 'expired',
      resultingStatus: eligibility.resultingStatus,
      expiresAt,
      tokenVersionId: receipt.token_version_id,
    })

    if (!rotated) {
      throw new HiringValidationError(
        'El test cambió de estado durante la recuperación.',
        'assessment_recovery_stale_state',
        409,
      )
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.hiringAssessment,
      aggregateId: assessmentId,
      eventType: EVENT_TYPES.hiringAssessmentAccessRecoveryRecorded,
      payload: {
        recoveryId: receipt.recovery_id,
        assessmentId,
        applicationId: state.application_id,
        openingId: state.opening_id,
        actorUserId,
        channel: 'secure_link',
        reasonCode: input.reasonCode,
        previousStatus: state.status,
        resultingStatus: eligibility.resultingStatus,
        outcome: 'link_issued',
        deliveryId: null,
      },
    }, client)

    return { replayed: false, receipt: normalizeRecoveryReceipt(receipt), token: rotated.token }
  })

  if (prepared.replayed) {
    return { receipt: prepared.receipt, replayed: true, linkRevealed: false }
  }

  const receipt = {
    ...prepared.receipt,
    channel: 'secure_link' as const,
    outcome: 'link_issued' as const,
  }

  return {
    receipt,
    replayed: false,
    linkRevealed: true,
    accessUrl: `${accessOrigin}/public/assessment/access#access=${encodeURIComponent(prepared.token)}`,
  }
}
