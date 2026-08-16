import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'
import { createHiringApplication } from '@/lib/hiring/store'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { TalentPoolLifecycle, TalentPoolPurpose } from './contracts'
import { deriveTalentPoolAccess, TALENT_POOL_FUTURE_CONSENT_TTL_MONTHS, TALENT_POOL_POLICY_VERSION } from './policy'

type MembershipRow = {
  membership_id: string
  public_id: string
  candidate_facet_id: string
  identity_profile_id: string
  lifecycle_status: TalentPoolLifecycle
  aggregate_version: number
  future_consent_expires_at: Date | string | null
}

const required = (value: string, field: string, min = 1) => {
  const normalized = value?.trim()

  if (!normalized || normalized.length < min || normalized.length > 200) {
    throw new HiringValidationError(`${field} no es válido.`, 'talent_pool_invalid_request')
  }

  return normalized
}

const loadMembershipForUpdate = async (client: PoolClient, publicId: string) => {
  const result = await client.query<MembershipRow>(
    `SELECT m.membership_id, m.public_id, m.candidate_facet_id, cf.identity_profile_id,
            m.lifecycle_status, m.aggregate_version, m.future_consent_expires_at
       FROM greenhouse_hiring.talent_pool_membership m
       JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id = m.candidate_facet_id
      WHERE m.public_id = $1 FOR UPDATE OF m`,
    [required(publicId, 'talentProfileId')]
  )

  if (!result.rows[0]) throw new HiringNotFoundError('El perfil de talento no existe.', 'talent_pool_profile_not_found')

  return result.rows[0]
}

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)

  copy.setUTCMonth(copy.getUTCMonth() + months)

  return copy
}

export const recordTalentPoolConsent = async (input: {
  talentProfileId: string
  purpose: TalentPoolPurpose
  policyVersion?: string
  evidenceRef?: string
  source: 'public_application' | 'candidate_self_service' | 'internal_operator'
  actorType: 'candidate' | 'operator'
  actorUserId?: string | null
  idempotencyKey: string
  correlationId?: string | null
  expiresAt?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const membership = await loadMembershipForUpdate(client, input.talentProfileId)
    const idempotencyKey = required(input.idempotencyKey, 'idempotencyKey', 8)

    const existing = await client.query<{
      consent_event_id: string
      receipt_public_id: string
      expires_at: Date | string | null
    }>(
      `SELECT consent_event_id,receipt_public_id,expires_at FROM greenhouse_hiring.talent_pool_consent_event
      WHERE membership_id=$1 AND purpose=$2 AND idempotency_key=$3`,
      [membership.membership_id, input.purpose, idempotencyKey]
    )

    if (existing.rows[0])
      return {
        talentProfileId: membership.public_id,
        lifecycleStatus: membership.lifecycle_status,
        expiresAt: existing.rows[0].expires_at ? new Date(existing.rows[0].expires_at).toISOString() : null,
        receiptId: existing.rows[0].receipt_public_id,
        idempotent: true
      }

    const now = new Date()

    const expiry =
      input.purpose === 'future_opportunities'
        ? new Date(input.expiresAt ?? addMonths(now, TALENT_POOL_FUTURE_CONSENT_TTL_MONTHS).toISOString())
        : null

    if (expiry && (!Number.isFinite(expiry.getTime()) || expiry <= now)) {
      throw new HiringValidationError('La vigencia del consentimiento no es válida.', 'talent_pool_invalid_expiry')
    }

    const policyVersion = required(input.policyVersion ?? TALENT_POOL_POLICY_VERSION, 'policyVersion')

    const hasCurrentFutureLease = Boolean(
      membership.future_consent_expires_at && new Date(membership.future_consent_expires_at).getTime() > now.getTime()
    )

    const nextLifecycle: TalentPoolLifecycle =
      input.purpose === 'future_opportunities' || hasCurrentFutureLease ? 'pool_eligible' : 'active_process'

    const event = await client.query<{ consent_event_id: string; receipt_public_id: string }>(
      `INSERT INTO greenhouse_hiring.talent_pool_consent_event
      (membership_id,purpose,action,policy_version,source,evidence_ref,actor_type,actor_user_id,
       idempotency_key,effective_at,expires_at,correlation_id)
     VALUES ($1,$2,'granted',$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING consent_event_id,receipt_public_id`,
      [
        membership.membership_id,
        input.purpose,
        policyVersion,
        input.source,
        input.evidenceRef ?? null,
        input.actorType,
        input.actorUserId ?? null,
        idempotencyKey,
        now,
        expiry,
        input.correlationId ?? null
      ]
    )

    await client.query(
      `UPDATE greenhouse_hiring.talent_pool_membership SET lifecycle_status=$2,
       future_consent_expires_at=CASE WHEN $3::timestamptz IS NULL THEN future_consent_expires_at ELSE $3 END,
       withdrawn_at=NULL, aggregate_version=aggregate_version+1 WHERE membership_id=$1`,
      [membership.membership_id, nextLifecycle, expiry]
    )
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentPoolMembership,
        aggregateId: membership.membership_id,
        eventType: EVENT_TYPES.talentPoolConsentRecorded,
        payload: {
          talentProfileId: membership.public_id,
          purpose: input.purpose,
          consentEventId: event.rows[0].consent_event_id,
          policyVersion
        }
      },
      client
    )

    return {
      talentProfileId: membership.public_id,
      lifecycleStatus: nextLifecycle,
      expiresAt: expiry?.toISOString() ?? null,
      receiptId: event.rows[0].receipt_public_id,
      idempotent: false
    }
  })

export const requestTalentPoolFutureConsent = async (input: {
  talentProfileId: string
  source: 'public_application' | 'internal_operator'
  evidenceRef?: string | null
  idempotencyKey: string
  correlationId?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const membership = await loadMembershipForUpdate(client, input.talentProfileId)
    const key = required(input.idempotencyKey, 'idempotencyKey', 8)

    const event = await client.query<{ consent_event_id: string; receipt_public_id: string }>(
      `INSERT INTO greenhouse_hiring.talent_pool_consent_event
      (membership_id,purpose,action,policy_version,source,evidence_ref,actor_type,idempotency_key,correlation_id)
     VALUES ($1,'future_opportunities','requested',$2,$3,$4,'candidate',$5,$6)
     ON CONFLICT (membership_id,purpose,idempotency_key) DO NOTHING
     RETURNING consent_event_id,receipt_public_id`,
      [
        membership.membership_id,
        TALENT_POOL_POLICY_VERSION,
        input.source,
        input.evidenceRef ?? null,
        key,
        input.correlationId ?? null
      ]
    )

    if (!event.rows[0]) {
      const existing = await client.query<{ receipt_public_id: string }>(
        `SELECT receipt_public_id FROM greenhouse_hiring.talent_pool_consent_event
        WHERE membership_id=$1 AND purpose='future_opportunities' AND idempotency_key=$2`,
        [membership.membership_id, key]
      )

      return {
        talentProfileId: membership.public_id,
        receiptId: existing.rows[0]?.receipt_public_id ?? null,
        idempotent: true
      }
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentPoolMembership,
        aggregateId: membership.membership_id,
        eventType: EVENT_TYPES.talentPoolConsentRequested,
        payload: {
          talentProfileId: membership.public_id,
          consentEventId: event.rows[0].consent_event_id,
          receiptId: event.rows[0].receipt_public_id
        }
      },
      client
    )

    return { talentProfileId: membership.public_id, receiptId: event.rows[0].receipt_public_id, idempotent: false }
  })

export const withdrawTalentPoolConsent = async (input: {
  talentProfileId: string
  purpose?: TalentPoolPurpose
  source: 'candidate_self_service' | 'internal_operator'
  actorType: 'candidate' | 'operator'
  actorUserId?: string | null
  idempotencyKey: string
  correlationId?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const membership = await loadMembershipForUpdate(client, input.talentProfileId)
    const purpose = input.purpose ?? 'future_opportunities'
    const key = required(input.idempotencyKey, 'idempotencyKey', 8)

    const inserted = await client.query<{ consent_event_id: string; receipt_public_id: string }>(
      `INSERT INTO greenhouse_hiring.talent_pool_consent_event
      (membership_id,purpose,action,source,actor_type,actor_user_id,idempotency_key,correlation_id)
     VALUES ($1,$2,'withdrawn',$3,$4,$5,$6,$7)
     ON CONFLICT (membership_id,purpose,idempotency_key) DO NOTHING
     RETURNING consent_event_id,receipt_public_id`,
      [
        membership.membership_id,
        purpose,
        input.source,
        input.actorType,
        input.actorUserId ?? null,
        key,
        input.correlationId ?? null
      ]
    )

    if (!inserted.rows[0]) {
      const existing = await client.query<{ receipt_public_id: string }>(
        `SELECT receipt_public_id FROM greenhouse_hiring.talent_pool_consent_event
        WHERE membership_id=$1 AND purpose=$2 AND idempotency_key=$3`,
        [membership.membership_id, purpose, key]
      )

      return {
        talentProfileId: membership.public_id,
        lifecycleStatus: membership.lifecycle_status,
        receiptId: existing.rows[0]?.receipt_public_id ?? null,
        idempotent: true
      }
    }

    const activeApplication = await client.query<{ active: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM greenhouse_hiring.hiring_application
        WHERE candidate_facet_id=$1 AND stage NOT IN ('rejected','withdrawn','closed')
      ) AS active`,
      [membership.candidate_facet_id]
    )

    const preservesActivePurpose = purpose === 'future_opportunities' && activeApplication.rows[0]?.active === true
    const nextLifecycle: TalentPoolLifecycle = preservesActivePurpose ? 'active_process' : 'withdrawn'

    await client.query(
      `UPDATE greenhouse_hiring.talent_pool_membership SET lifecycle_status=$2,
       withdrawn_at=CASE WHEN $2='withdrawn' THEN NOW() ELSE NULL END,
       future_consent_expires_at=CASE WHEN $3='future_opportunities' THEN NULL ELSE future_consent_expires_at END,
       aggregate_version=aggregate_version+1 WHERE membership_id=$1`,
      [membership.membership_id, nextLifecycle, purpose]
    )

    if (!preservesActivePurpose) {
      await client.query(`DELETE FROM greenhouse_hiring.talent_pool_evidence_projection WHERE membership_id=$1`, [
        membership.membership_id
      ])
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentPoolMembership,
        aggregateId: membership.membership_id,
        eventType: EVENT_TYPES.talentPoolConsentWithdrawn,
        payload: { talentProfileId: membership.public_id, purpose }
      },
      client
    )

    return {
      talentProfileId: membership.public_id,
      lifecycleStatus: nextLifecycle,
      receiptId: inserted.rows[0].receipt_public_id,
      idempotent: false
    }
  })

export const updateTalentAvailability = async (input: {
  talentProfileId: string
  availability: string
  actorUserId?: string | null
  idempotencyKey: string
  correlationId?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const membership = await loadMembershipForUpdate(client, input.talentProfileId)

    if (['withdrawn', 'expired'].includes(membership.lifecycle_status)) {
      throw new HiringValidationError('El perfil no admite actualizaciones.', 'talent_pool_consent_required', 409)
    }

    const availability = required(input.availability, 'availability')
    const key = required(input.idempotencyKey, 'idempotencyKey', 8)

    const activity = await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_activity
      (membership_id,activity_type,actor_user_id,idempotency_key,correlation_id,details_json)
     VALUES ($1,'availability_updated',$2,$3,$4,jsonb_build_object('availability',$5::text))
     ON CONFLICT (membership_id,activity_type,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
     RETURNING activity_id`,
      [membership.membership_id, input.actorUserId ?? null, key, input.correlationId ?? null, availability]
    )

    if (!activity.rows[0]) return { talentProfileId: membership.public_id, availability, idempotent: true }
    await client.query(`UPDATE greenhouse_hiring.candidate_facet SET availability=$2 WHERE candidate_facet_id=$1`, [
      membership.candidate_facet_id,
      availability
    ])
    await client.query(
      `UPDATE greenhouse_hiring.talent_pool_membership SET aggregate_version=aggregate_version+1 WHERE membership_id=$1`,
      [membership.membership_id]
    )
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentPoolMembership,
        aggregateId: membership.membership_id,
        eventType: EVENT_TYPES.talentPoolAvailabilityUpdated,
        payload: { talentProfileId: membership.public_id }
      },
      client
    )

    return { talentProfileId: membership.public_id, availability, idempotent: false }
  })

export const proposeTalentInvitation = async (input: {
  talentProfileId: string
  openingId: string
  requestedBy: string
  idempotencyKey: string
  correlationId?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const membership = await loadMembershipForUpdate(client, input.talentProfileId)

    const access = deriveTalentPoolAccess({
      lifecycleStatus: membership.lifecycle_status,
      futureConsentExpiresAt: membership.future_consent_expires_at
        ? new Date(membership.future_consent_expires_at).toISOString()
        : null
    })

    if (!access.contactable || !access.allowedActions.includes('invite')) {
      throw new HiringValidationError(
        'El perfil no tiene consentimiento vigente para esta invitación.',
        'talent_pool_consent_required',
        409,
        { reasonCodes: access.reasonCodes }
      )
    }

    const openingId = required(input.openingId, 'openingId')
    const key = required(input.idempotencyKey, 'idempotencyKey', 8)

    const existing = await client.query<{ invitation_id: string; proposal_ref: string; state: string }>(
      `SELECT invitation_id,proposal_ref,state FROM greenhouse_hiring.talent_pool_invitation
      WHERE membership_id=$1 AND opening_id=$2`,
      [membership.membership_id, openingId]
    )

    if (existing.rows[0])
      return {
        talentProfileId: membership.public_id,
        proposalRef: existing.rows[0].proposal_ref,
        state: existing.rows[0].state,
        idempotent: true
      }
    const proposalRef = `tlpp-${createHash('sha256').update(`${membership.membership_id}|${openingId}|${key}`).digest('hex').slice(0, 24)}`

    const proposal = await client.query<{ invitation_id: string }>(
      `INSERT INTO greenhouse_hiring.talent_pool_invitation
      (membership_id,opening_id,state,proposal_ref,idempotency_key,requested_by)
     VALUES ($1,$2,'proposed',$3,$4,$5) RETURNING invitation_id`,
      [membership.membership_id, openingId, proposalRef, key, required(input.requestedBy, 'requestedBy')]
    )

    await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_activity
    (membership_id,activity_type,actor_user_id,idempotency_key,correlation_id,source_ref,details_json)
    VALUES ($1,'invitation_proposed',$2,$3,$4,$5,jsonb_build_object('openingId',$6::text))`,
      [
        membership.membership_id,
        input.requestedBy,
        key,
        input.correlationId ?? null,
        proposal.rows[0].invitation_id,
        openingId
      ]
    )

    return { talentProfileId: membership.public_id, proposalRef, state: 'proposed' as const, idempotent: false }
  })

export const inviteTalentToOpening = async (input: {
  talentProfileId: string
  openingId: string
  proposalRef: string
  idempotencyKey: string
  requestedBy: string
  confirmedBy: string
  correlationId?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const membership = await loadMembershipForUpdate(client, input.talentProfileId)

    const access = deriveTalentPoolAccess({
      lifecycleStatus: membership.lifecycle_status,
      futureConsentExpiresAt: membership.future_consent_expires_at
        ? new Date(membership.future_consent_expires_at).toISOString()
        : null
    })

    if (!access.contactable || !access.allowedActions.includes('invite')) {
      throw new HiringValidationError(
        'El perfil no tiene consentimiento vigente para esta invitación.',
        'talent_pool_consent_required',
        409,
        { reasonCodes: access.reasonCodes }
      )
    }

    const openingId = required(input.openingId, 'openingId')
    const proposalRef = required(input.proposalRef, 'proposalRef', 4)
    const key = required(input.idempotencyKey, 'idempotencyKey', 8)

    const previous = await client.query<{
      invitation_id: string
      application_id: string | null
      state: string
      opening_id: string
      requested_by: string
    }>(
      `SELECT invitation_id,application_id,state,opening_id,requested_by
       FROM greenhouse_hiring.talent_pool_invitation
      WHERE membership_id=$1 AND proposal_ref=$2 FOR UPDATE`,
      [membership.membership_id, proposalRef]
    )

    const proposal = previous.rows[0]

    if (!proposal || proposal.opening_id !== openingId) {
      throw new HiringValidationError(
        'La propuesta no existe o no corresponde al efecto confirmado.',
        'talent_pool_proposal_not_found',
        404
      )
    }

    if (proposal.state !== 'proposed') {
      return {
        talentProfileId: membership.public_id,
        applicationId: proposal.application_id,
        state: proposal.state,
        idempotent: true
      }
    }

    const existing = await client.query<{ application_id: string }>(
      `SELECT application_id FROM greenhouse_hiring.hiring_application WHERE opening_id=$1 AND identity_profile_id=$2`,
      [openingId, membership.identity_profile_id]
    )

    let applicationId = existing.rows[0]?.application_id ?? null
    const state: 'executed' | 'reused' = applicationId ? 'reused' : 'executed'

    if (!applicationId) {
      const application = await createHiringApplication(
        {
          openingId,
          identityProfileId: membership.identity_profile_id,
          candidateFacetId: membership.candidate_facet_id,
          source: 'manual',
          dedupeFingerprint: createHash('sha256')
            .update(`talent_pool|${membership.membership_id}|${openingId}`)
            .digest('hex')
        },
        input.confirmedBy,
        client
      )

      applicationId = application.applicationId
    }

    const invitation = await client.query<{ invitation_id: string }>(
      `UPDATE greenhouse_hiring.talent_pool_invitation SET application_id=$2,state=$3,confirmed_by=$4,executed_at=NOW()
      WHERE invitation_id=$1 RETURNING invitation_id`,
      [proposal.invitation_id, applicationId, state, required(input.confirmedBy, 'confirmedBy')]
    )

    await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_activity
    (membership_id,activity_type,actor_user_id,idempotency_key,correlation_id,source_ref,details_json)
    VALUES ($1,$2,$3,$4,$5,$6,jsonb_build_object('openingId',$7::text))`,
      [
        membership.membership_id,
        state === 'reused' ? 'invitation_reused' : 'invitation_executed',
        input.confirmedBy,
        key,
        input.correlationId ?? null,
        invitation.rows[0].invitation_id,
        openingId
      ]
    )
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentPoolInvitation,
        aggregateId: invitation.rows[0].invitation_id,
        eventType: EVENT_TYPES.talentPoolInvitationExecuted,
        payload: { talentProfileId: membership.public_id, openingId, applicationId, state }
      },
      client
    )

    return { talentProfileId: membership.public_id, applicationId, state, idempotent: false }
  })
