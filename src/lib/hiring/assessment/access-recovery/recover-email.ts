import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { claimTokenSensitiveEmailIntent, sendEmail } from '@/lib/email/delivery'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { hiringPublicBaseUrl } from '../../notifications/config'
import { rotateCandidateTestTokenForAccessRecoveryWithClient } from '../instances'
import {
  ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS,
  ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS,
  ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS,
  decideAssessmentAccessRecoveryEligibility,
  digestAssessmentRecoveryIdempotencyKey,
  fingerprintAssessmentRecoveryRequest,
  isAssessmentAccessRecoveryReason,
  type AssessmentAccessRecoveryReason,
  type AssessmentAccessRecoveryReceipt,
  type AssessmentAccessRecoveryResult,
} from './contracts'

export interface RecoveryStateRow extends Record<string, unknown> {
  assessment_id: string
  application_id: string
  opening_id: string
  method: string
  status: string
  started_at: Date | string | null
  token_expires_at: Date | string | null
  time_limit_minutes: number | string | null
  accommodations_json: Record<string, unknown> | string | null
  application_stage: string
  application_decision: string | null
  consent_status: string
  candidate_email: string | null
  candidate_name: string | null
  opening_title: string
  now_at: Date | string
  effective_deadline_at: Date | string | null
}

export interface RecoveryReceiptRow extends Record<string, unknown> {
  recovery_id: string
  assessment_id: string
  application_id: string
  opening_id: string
  actor_user_id: string
  channel: 'email' | 'secure_link'
  reason_code: AssessmentAccessRecoveryReason
  previous_status: string
  resulting_status: string
  token_version_id: string
  issued_at: Date | string
  expires_at: Date | string
  outcome: AssessmentAccessRecoveryReceipt['outcome']
  delivery_id: string | null
}

interface PreparedEmailRecovery {
  receipt: AssessmentAccessRecoveryReceipt
  token: string
  recipientEmail: string
  recipientName: string | null
  openingTitle: string
  timeLimitMinutes: number | null
}

export interface RecoverCandidateTestAccessByEmailInput {
  assessmentId: string
  reasonCode: AssessmentAccessRecoveryReason
  idempotencyKey: string
}

const BLOCKING_PROVIDER_STATUSES = new Set(['bounced', 'complained', 'suppressed'])
const EMAIL_TTL_MS = ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS * 60 * 60 * 1000

const CANDIDATE_ACCESS_HOSTS = new Set([
  'greenhouse.efeoncepro.com',
  'dev-greenhouse.efeoncepro.com',
  'greenhouse-eo-env-staging-efeonce-7670142f.vercel.app',
])

const asDate = (value: Date | string): Date => value instanceof Date ? value : new Date(value)
const iso = (value: Date | string): string => asDate(value).toISOString()
const normalizeEmail = (value: string): string => value.trim().toLowerCase()

export const resolveHiringCandidateAccessOrigin = (rawUrl = hiringPublicBaseUrl()): string => {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new HiringValidationError(
      'El origen público del acceso no está configurado correctamente.',
      'assessment_recovery_access_origin_invalid',
      503,
    )
  }

  const testOnlyHost = process.env.NODE_ENV === 'test' && url.hostname === 'greenhouse.example'

  const localOnlyHost = process.env.NODE_ENV !== 'production'
    && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')

  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/'
    || url.search || url.hash || (!CANDIDATE_ACCESS_HOSTS.has(url.hostname) && !testOnlyHost && !localOnlyHost)) {
    throw new HiringValidationError(
      'El origen público del acceso no está permitido.',
      'assessment_recovery_access_origin_invalid',
      503,
    )
  }

  return url.origin
}

export const normalizeRecoveryReceipt = (row: RecoveryReceiptRow): AssessmentAccessRecoveryReceipt => ({
  recoveryId: row.recovery_id,
  assessmentId: row.assessment_id,
  applicationId: row.application_id,
  openingId: row.opening_id,
  channel: row.channel,
  reasonCode: row.reason_code,
  previousStatus: row.previous_status,
  resultingStatus: row.resulting_status,
  tokenVersionId: row.token_version_id,
  issuedAt: iso(row.issued_at),
  expiresAt: iso(row.expires_at),
  outcome: row.outcome,
  deliveryId: row.delivery_id,
})

const recoverySourceEventId = (input: {
  actorUserId: string
  assessmentId: string
  idempotencyDigest: string
}): string => `assessment-access-recovery:${createHash('sha256')
  .update(`email:v1:${input.actorUserId}:${input.assessmentId}:${input.idempotencyDigest}`)
  .digest('hex')}`

export const loadRecoveryState = async (client: PoolClient, assessmentId: string): Promise<RecoveryStateRow | null> => {
  const result = await client.query<RecoveryStateRow>(
    `SELECT assessment.assessment_id,
            assessment.application_id,
            application.opening_id,
            assessment.method,
            assessment.status,
            assessment.started_at,
            assessment.token_expires_at,
            assessment.time_limit_minutes,
            assessment.accommodations_json,
            application.stage AS application_stage,
            application.decision AS application_decision,
            facet.consent_status,
            profile.canonical_email AS candidate_email,
            profile.full_name AS candidate_name,
            COALESCE(NULLIF(opening.public_title, ''), opening.internal_title) AS opening_title,
            clock_timestamp() AS now_at,
            greenhouse_hiring.assessment_access_recovery_deadline(
              assessment.started_at, assessment.time_limit_minutes, assessment.accommodations_json
            ) AS effective_deadline_at
     FROM greenhouse_hiring.hiring_assessment assessment
     JOIN greenhouse_hiring.hiring_application application
       ON application.application_id = assessment.application_id
     JOIN greenhouse_hiring.candidate_facet facet
       ON facet.candidate_facet_id = application.candidate_facet_id
     JOIN greenhouse_core.identity_profiles profile
       ON profile.profile_id = application.identity_profile_id
     JOIN greenhouse_hiring.hiring_opening opening
       ON opening.opening_id = application.opening_id
     WHERE assessment.assessment_id = $1
     FOR UPDATE OF assessment, application, facet, profile`,
    [assessmentId],
  )

  return result.rows[0] ?? null
}

const assertEmailProviderAllowsRecovery = async (client: PoolClient, recipientEmail: string): Promise<void> => {
  const evidence = await client.query<{ blocked: boolean; provider_status: string | null }>(
    `SELECT EXISTS (
       SELECT 1
       FROM greenhouse_notifications.email_deliveries evidence
       WHERE LOWER(evidence.recipient_email) = $1
         AND (evidence.bounced_at IS NOT NULL OR evidence.complained_at IS NOT NULL
           OR evidence.suppressed_at IS NOT NULL
           OR evidence.provider_status IN ('bounced','complained','suppressed'))
     ) AS blocked,
     (SELECT CASE
               WHEN complained_at IS NOT NULL OR provider_status='complained' THEN 'complained'
               WHEN bounced_at IS NOT NULL OR provider_status='bounced' THEN 'bounced'
               WHEN suppressed_at IS NOT NULL OR provider_status='suppressed' THEN 'suppressed'
             END
      FROM greenhouse_notifications.email_deliveries
      WHERE LOWER(recipient_email) = $1
        AND (bounced_at IS NOT NULL OR complained_at IS NOT NULL OR suppressed_at IS NOT NULL
          OR provider_status IN ('bounced','complained','suppressed'))
      ORDER BY COALESCE(provider_event_created_at, provider_observed_at, updated_at) DESC, created_at DESC
      LIMIT 1) AS provider_status`,
    [normalizeEmail(recipientEmail)],
  )

  const status = evidence.rows[0]?.provider_status

  if (evidence.rows[0]?.blocked || (status && BLOCKING_PROVIDER_STATUSES.has(status))) {
    throw new HiringValidationError(
      'El proveedor bloqueó nuevos correos a esta dirección. Verifica el contacto o usa un enlace temporal.',
      'assessment_recovery_email_provider_blocked',
      409,
      { providerStatus: status },
    )
  }
}

export const assertRecoveryRateLimit = async (client: PoolClient, assessmentId: string): Promise<void> => {
  const result = await client.query<{ total_24h: number | string; cooldown_active: boolean }>(
    `SELECT COUNT(*) FILTER (WHERE created_at >= clock_timestamp() - INTERVAL '24 hours') AS total_24h,
            COALESCE(MAX(created_at) >= clock_timestamp()
              - make_interval(secs => $2::integer), FALSE) AS cooldown_active
     FROM greenhouse_hiring.hiring_assessment_access_recovery
     WHERE assessment_id = $1`,
    [assessmentId, ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS],
  )

  const total = Number(result.rows[0]?.total_24h ?? 0)

  if (total >= ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS) {
    throw new HiringValidationError(
      'Este test alcanzó el máximo de recuperaciones de acceso de las últimas 24 horas.',
      'assessment_recovery_daily_limit',
      429,
    )
  }

  if (result.rows[0]?.cooldown_active) {
    throw new HiringValidationError(
      'Espera un minuto antes de generar un nuevo acceso para este test.',
      'assessment_recovery_cooldown',
      429,
    )
  }
}

const findReceipt = async (input: {
  actorUserId: string
  assessmentId: string
  idempotencyDigest: string
  requestFingerprint: string
}): Promise<AssessmentAccessRecoveryReceipt | null> => {
  const rows = await runGreenhousePostgresQuery<RecoveryReceiptRow>(
    `SELECT recovery_id,assessment_id,application_id,opening_id,actor_user_id,channel,reason_code,
            previous_status,resulting_status,token_version_id,issued_at,expires_at,outcome,delivery_id,
            request_fingerprint
     FROM greenhouse_hiring.hiring_assessment_access_recovery
     WHERE actor_user_id=$1 AND assessment_id=$2 AND channel='email' AND idempotency_digest=$3
     LIMIT 1`,
    [input.actorUserId, input.assessmentId, input.idempotencyDigest],
  )

  const row = rows[0] as (RecoveryReceiptRow & { request_fingerprint?: string }) | undefined

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

const closeReceipt = async (
  recoveryId: string,
  outcome: 'dispatch_accepted' | 'dispatch_failed' | 'dispatch_unknown',
  deliveryId: string,
): Promise<AssessmentAccessRecoveryReceipt> => {
  return withGreenhousePostgresTransaction(async client => {
    const result = await client.query<RecoveryReceiptRow>(
      `UPDATE greenhouse_hiring.hiring_assessment_access_recovery
       SET outcome=$2, updated_at=NOW()
       WHERE recovery_id=$1 AND delivery_id=$3::uuid
         AND outcome IN ('pending_dispatch','dispatch_unknown')
       RETURNING recovery_id,assessment_id,application_id,opening_id,channel,reason_code,
                 actor_user_id,previous_status,resulting_status,token_version_id,issued_at,expires_at,outcome,delivery_id`,
      [recoveryId, outcome, deliveryId],
    )

    const row = result.rows[0]

    if (!row) {
      throw new HiringValidationError(
        'El estado de la recuperación cambió mientras se confirmaba el despacho.',
        'assessment_recovery_stale_outcome',
        409,
      )
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.hiringAssessment,
      aggregateId: row.assessment_id,
      eventType: EVENT_TYPES.hiringAssessmentAccessRecoveryRecorded,
      payload: {
        recoveryId: row.recovery_id,
        assessmentId: row.assessment_id,
        applicationId: row.application_id,
        openingId: row.opening_id,
        actorUserId: row.actor_user_id,
        channel: row.channel,
        reasonCode: row.reason_code,
        previousStatus: row.previous_status,
        resultingStatus: row.resulting_status,
        outcome: row.outcome,
        deliveryId: row.delivery_id,
      },
    }, client)

    return normalizeRecoveryReceipt(row)
  })
}

type RecoveryDeliveryEvidenceRow = RecoveryReceiptRow & {
  delivery_status: string
  resend_id: string | null
}

/**
 * Converges the bounded receipt/delivery split after a process crash. It never
 * retries the email or rotates another credential; it only projects durable
 * evidence from the immutable linked delivery into the receipt and outbox.
 */
export const reconcileCandidateTestAccessRecoveryEmailReceipt = async (
  recoveryId: string,
): Promise<AssessmentAccessRecoveryReceipt | null> => {
  const rows = await runGreenhousePostgresQuery<RecoveryDeliveryEvidenceRow>(
    `SELECT receipt.recovery_id,receipt.assessment_id,receipt.application_id,receipt.opening_id,
            receipt.actor_user_id,receipt.channel,receipt.reason_code,receipt.previous_status,
            receipt.resulting_status,receipt.token_version_id,receipt.issued_at,receipt.expires_at,
            receipt.outcome,receipt.delivery_id,delivery.status AS delivery_status,delivery.resend_id
     FROM greenhouse_hiring.hiring_assessment_access_recovery receipt
     JOIN greenhouse_notifications.email_deliveries delivery
       ON delivery.delivery_id=receipt.delivery_id
      AND delivery.email_type='hiring_assessment_access_recovery'
      AND delivery.source_entity=receipt.assessment_id
     WHERE receipt.recovery_id=$1 AND receipt.channel='email'
     LIMIT 1`,
    [recoveryId],
  )

  const row = rows[0]

  if (!row) return null
  if (!['pending_dispatch', 'dispatch_unknown'].includes(row.outcome)) return normalizeRecoveryReceipt(row)

  const targetOutcome = row.resend_id && ['sent', 'delivered'].includes(row.delivery_status)
    ? 'dispatch_accepted'
    : ['failed', 'skipped', 'rate_limited', 'dead_letter'].includes(row.delivery_status)
      ? 'dispatch_failed'
      : null

  if (!targetOutcome || !row.delivery_id) return normalizeRecoveryReceipt(row)

  try {
    return await closeReceipt(row.recovery_id, targetOutcome, row.delivery_id)
  } catch (error) {
    if (!(error instanceof HiringValidationError) || error.code !== 'assessment_recovery_stale_outcome') throw error

    const current = await runGreenhousePostgresQuery<RecoveryReceiptRow>(
      `SELECT recovery_id,assessment_id,application_id,opening_id,actor_user_id,channel,reason_code,
              previous_status,resulting_status,token_version_id,issued_at,expires_at,outcome,delivery_id
       FROM greenhouse_hiring.hiring_assessment_access_recovery
       WHERE recovery_id=$1 LIMIT 1`,
      [recoveryId],
    )

    return current[0] ? normalizeRecoveryReceipt(current[0]) : null
  }
}

export const recoverCandidateTestAccessByEmail = async (
  input: RecoverCandidateTestAccessByEmailInput,
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

  const idempotencyDigest = digestAssessmentRecoveryIdempotencyKey(idempotencyKey)

  const requestFingerprint = fingerprintAssessmentRecoveryRequest({
    assessmentId,
    channel: 'email',
    reasonCode: input.reasonCode,
  })

  const sourceEventId = recoverySourceEventId({ actorUserId, assessmentId, idempotencyDigest })

  const replay = await findReceipt({ actorUserId, assessmentId, idempotencyDigest, requestFingerprint })

  if (replay) {
    const reconciled = await reconcileCandidateTestAccessRecoveryEmailReceipt(replay.recoveryId)

    return { receipt: reconciled ?? replay, replayed: true, linkRevealed: false }
  }

  // Fail before claiming an intent or rotating a bearer when the public origin is unsafe.
  const accessOrigin = resolveHiringCandidateAccessOrigin()

  let expectedRecipientEmail = ''

  const preflightRows = await runGreenhousePostgresQuery<{ candidate_email: string | null }>(
    `SELECT profile.canonical_email AS candidate_email
     FROM greenhouse_hiring.hiring_assessment assessment
     JOIN greenhouse_hiring.hiring_application application
       ON application.application_id=assessment.application_id
     JOIN greenhouse_core.identity_profiles profile
       ON profile.profile_id=application.identity_profile_id
     WHERE assessment.assessment_id=$1`,
    [assessmentId],
  )

  if (!preflightRows[0]) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')
  expectedRecipientEmail = preflightRows[0].candidate_email?.trim() ?? ''

  if (!expectedRecipientEmail) {
    throw new HiringValidationError(
      'La candidata no tiene un correo resoluble. Usa un enlace temporal después de verificar su identidad.',
      'assessment_recovery_email_missing',
      409,
    )
  }

  const intent = await claimTokenSensitiveEmailIntent<PreparedEmailRecovery>({
    emailType: 'hiring_assessment_access_recovery',
    domain: 'hr',
    recipient: { email: expectedRecipientEmail },
    sourceEventId,
    sourceEntity: assessmentId,
    safeContext: { locale: 'es' },
    issueCredential: async (client, deliveryId) => {
      const state = await loadRecoveryState(client, assessmentId)

      if (!state) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

      if (normalizeEmail(state.candidate_email ?? '') !== normalizeEmail(expectedRecipientEmail)) {
        throw new HiringValidationError(
          'El correo de la candidata cambió durante la operación. Vuelve a intentarlo.',
          'assessment_recovery_recipient_changed',
          409,
        )
      }

      const deadline = state.effective_deadline_at ? asDate(state.effective_deadline_at) : null
      const now = asDate(state.now_at)

      const decision = decideAssessmentAccessRecoveryEligibility({
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

      if (!decision.allowed) {
        throw new HiringValidationError(
          'Este test no puede recuperar acceso en su estado actual.',
          decision.code,
          409,
        )
      }

      await assertEmailProviderAllowsRecovery(client, expectedRecipientEmail)
      await assertRecoveryRateLimit(client, assessmentId)

      const issuedAt = now
      const emailExpiry = new Date(issuedAt.getTime() + EMAIL_TTL_MS)

      const expiresAt = decision.resultingStatus === 'in_progress' && deadline && deadline < emailExpiry
        ? deadline
        : emailExpiry

      const inserted = await client.query<RecoveryReceiptRow>(
        `INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery (
           assessment_id,application_id,opening_id,actor_user_id,channel,reason_code,
           idempotency_digest,request_fingerprint,previous_status,resulting_status,
           issued_at,expires_at,outcome,delivery_id
         ) VALUES ($1,$2,$3,$4,'email',$5,$6,$7,$8,$9,$10,$11,'pending_dispatch',$12::uuid)
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
          decision.resultingStatus,
          issuedAt,
          expiresAt,
          deliveryId,
        ],
      )

      const receipt = inserted.rows[0]

      if (!receipt) throw new Error('Assessment recovery receipt was not created.')

      const rotated = await rotateCandidateTestTokenForAccessRecoveryWithClient(client, {
        assessmentId,
        expectedStatus: state.status as 'assigned' | 'sent' | 'in_progress' | 'expired',
        resultingStatus: decision.resultingStatus,
        expiresAt,
        tokenVersionId: receipt.token_version_id,
      })

      if (!rotated) {
        throw new HiringValidationError(
          'El test cambió de estado durante la recuperación. Vuelve a cargarlo.',
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
          channel: 'email',
          reasonCode: input.reasonCode,
          previousStatus: state.status,
          resultingStatus: decision.resultingStatus,
          outcome: 'pending_dispatch',
          deliveryId,
        },
      }, client)

      return {
        receipt: normalizeRecoveryReceipt(receipt),
        token: rotated.token,
        recipientEmail: expectedRecipientEmail,
        recipientName: state.candidate_name?.trim() || null,
        openingTitle: state.opening_title,
        timeLimitMinutes: rotated.timeLimitMinutes,
      }
    },
  })

  if (!intent.claimed || !intent.value) {
    const existing = await findReceipt({ actorUserId, assessmentId, idempotencyDigest, requestFingerprint })

    if (existing) return { receipt: existing, replayed: true, linkRevealed: false }

    throw new HiringValidationError(
      'El envío de recuperación está pausado. Inténtalo nuevamente cuando se reanude el correo.',
      'assessment_recovery_email_paused',
      503,
    )
  }

  const prepared = intent.value
  const accessUrl = `${accessOrigin}/public/assessment/access#access=${encodeURIComponent(prepared.token)}`
  let dispatchOutcome: 'dispatch_accepted' | 'dispatch_failed' | 'dispatch_unknown'
  let dispatchDeliveryId = intent.deliveryId

  try {
    const delivery = await sendEmail({
      emailType: 'hiring_assessment_access_recovery',
      domain: 'hr',
      recipients: [{
        email: prepared.recipientEmail,
        ...(prepared.recipientName ? { name: prepared.recipientName } : {}),
      }],
      context: {
        recipientName: prepared.recipientName ?? undefined,
        openingTitle: prepared.openingTitle,
        assessmentUrl: accessUrl,
        timeLimitMinutes: prepared.timeLimitMinutes,
        tokenTtlDays: ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS / 24,
        inProgress: prepared.receipt.resultingStatus === 'in_progress',
        expiresAt: prepared.receipt.expiresAt,
        locale: 'es',
      },
      sourceEventId,
      sourceEntity: assessmentId,
      persistence: {
        mode: 'token_sensitive',
        safeContext: {
          locale: 'es',
          expiresAt: prepared.receipt.expiresAt,
          inProgress: prepared.receipt.resultingStatus === 'in_progress',
          timeLimitMinutes: prepared.timeLimitMinutes,
          tokenTtlDays: ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS / 24,
        },
        deliveryIntentId: intent.deliveryId,
      },
    })

    dispatchOutcome = delivery.dispatchOutcome === 'accepted'
      ? 'dispatch_accepted'
      : delivery.dispatchOutcome === 'unknown'
        ? 'dispatch_unknown'
        : 'dispatch_failed'
    dispatchDeliveryId = delivery.deliveryId
  } catch {
    dispatchOutcome = 'dispatch_unknown'
  }

  const receipt = await closeReceipt(prepared.receipt.recoveryId, dispatchOutcome, dispatchDeliveryId)

  return { receipt, replayed: false, linkRevealed: false }
}
