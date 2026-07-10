import 'server-only'

// TASK-770 — Commands del bridge hiring→HRIS (V1 humano-asistido).
//
// Flujo: handoff approved(internal_hire) [cola 356] → review (claim del request) →
// create-member (core source-neutral, pending_intake) → open-onboarding (checklist A,
// reusa TASK-030) → [HR completa intake por el path existente: completeWorkforceMemberIntake
// + readiness — 770 NO lo reimplementa] → complete (verifica intake completed + marca el
// HiringHandoff completed con downstreamRef=member:<id>).
//
// Idempotencia: claim atómico por hiring_handoff_id (UNIQUE + FOR UPDATE); cada command
// re-invocado sobre el estado ya alcanzado es no-op replay. Conflictos de identidad NUNCA
// se auto-resuelven: el request queda `blocked` con código auditado (loud, no throw mudo).

import { getHiringHandoffById, transitionHiringHandoff, type HiringHandoff } from '@/lib/hiring/handoff'
import { createOnboardingInstance } from '@/lib/hr-onboarding/store'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { HiringActivationError, HiringActivationIdentityConflictError } from './errors'
import { resolveOrCreateMemberForIdentityProfile } from './member-core'
import {
  appendActivationEvent,
  getActivationRequestByHandoffId,
  insertActivationRequest,
  lockActivationRequestByHandoffId,
  normalizeActivationRequest,
  updateActivationRequestState,
  type HiringActivationRequestRow,
} from './store'
import type { HiringActivationBlockedReason, HiringActivationRequest, HiringActivationState } from './types'

interface CommandInput {
  hiringHandoffId: string
  actorUserId: string | null
}

const runGreenhouseQuery = withGreenhousePostgresTransaction

/** El handoff debe existir, ser internal_hire y estar en un estado consumible por el bridge. */
const assertConsumableHandoff = async (hiringHandoffId: string): Promise<HiringHandoff> => {
  const handoff = await getHiringHandoffById(hiringHandoffId.trim())

  if (!handoff) {
    throw new HiringActivationError('El handoff no existe.', 'hiring_activation_handoff_not_found', 404)
  }

  if (handoff.selectedDestination !== 'internal_hire') {
    throw new HiringActivationError(
      'El bridge de activación solo procesa handoffs de contratación interna.',
      'hiring_activation_destination_unsupported',
      422,
    )
  }

  if (!['approved', 'in_setup', 'completed'].includes(handoff.state)) {
    throw new HiringActivationError(
      'El handoff aún no está aprobado. Apruébalo antes de iniciar la activación.',
      'hiring_activation_handoff_not_approved',
      409,
    )
  }

  return handoff
}

/**
 * review — claim del request para un handoff aprobado de la cola. Idempotente: si el
 * request ya existe, lo retorna sin transicionar.
 */
export const reviewHiringActivation = async (input: CommandInput): Promise<HiringActivationRequest> => {
  const handoff = await assertConsumableHandoff(input.hiringHandoffId)

  return runGreenhouseQuery(async (client) => {
    const existing = await lockActivationRequestByHandoffId(client, handoff.handoffId)

    if (existing) return normalizeActivationRequest(existing)

    const inserted = await insertActivationRequest(client, {
      hiringHandoffId: handoff.handoffId,
      hiringApplicationId: handoff.applicationId,
      identityProfileId: handoff.identityProfileId,
      candidateFacetId: handoff.candidateFacetId,
      createdByUserId: input.actorUserId,
    })

    await appendActivationEvent(client, {
      activationRequestId: inserted.activation_request_id,
      fromState: null,
      toState: 'pending_hr_review',
      actorUserId: input.actorUserId,
      reasonCode: 'review_claimed',
      reasonDetail: null,
    })

    return normalizeActivationRequest(inserted)
  })
}

interface PersonSnapshotRow extends Record<string, unknown> {
  full_name: string
  canonical_email: string | null
}

/**
 * create-member — materializa la faceta member (core source-neutral) sobre el MISMO
 * identity_profile_id. Conflicto de identidad → request blocked con código (nunca merge).
 */
export const createMemberForHiringActivation = async (
  input: CommandInput,
): Promise<HiringActivationRequest> => {
  const handoff = await assertConsumableHandoff(input.hiringHandoffId)

  return runGreenhouseQuery(async (client) => {
    let request = await lockActivationRequestByHandoffId(client, handoff.handoffId)

    if (!request) {
      request = await insertActivationRequest(client, {
        hiringHandoffId: handoff.handoffId,
        hiringApplicationId: handoff.applicationId,
        identityProfileId: handoff.identityProfileId,
        candidateFacetId: handoff.candidateFacetId,
        createdByUserId: input.actorUserId,
      })
    }

    const currentState = request.state as HiringActivationState

    // Idempotencia: member ya materializado → replay.
    if (request.member_id && currentState !== 'cancelled') {
      return normalizeActivationRequest(request)
    }

    if (currentState === 'cancelled') {
      throw new HiringActivationError(
        'La activación fue cancelada. Reabre el caso antes de continuar.',
        'hiring_activation_cancelled',
        409,
      )
    }

    const personResult = await client.query<PersonSnapshotRow>(
      `SELECT full_name, canonical_email FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
      [handoff.identityProfileId],
    )

    const person = personResult.rows[0]

    if (!person) {
      throw new HiringActivationError(
        'La persona del handoff no existe en el registro de identidad.',
        'hiring_activation_person_missing',
        422,
      )
    }

    try {
      const result = await resolveOrCreateMemberForIdentityProfile(client, {
        identityProfileId: handoff.identityProfileId,
        displayName: person.full_name,
        primaryEmail: person.canonical_email,
        hireDate: handoff.tentativeStartDate,
        roleTitle: null,
      })

      const updated = await updateActivationRequestState(client, {
        activationRequestId: request.activation_request_id,
        state: 'member_created',
        memberId: result.memberId,
        memberOutcome: result.outcome,
        blockedReason: null,
        blockedDetail: null,
      })

      await appendActivationEvent(client, {
        activationRequestId: request.activation_request_id,
        fromState: currentState,
        toState: 'member_created',
        actorUserId: input.actorUserId,
        reasonCode: `member_${result.outcome}`,
        reasonDetail: null,
        memberId: result.memberId,
      })

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.hiringActivationRequest,
          aggregateId: request.activation_request_id,
          eventType: EVENT_TYPES.hiringActivationLinked,
          payload: {
            activationRequestId: request.activation_request_id,
            hiringHandoffId: handoff.handoffId,
            applicationId: handoff.applicationId,
            identityProfileId: handoff.identityProfileId,
            memberId: result.memberId,
            memberOutcome: result.outcome,
            actorUserId: input.actorUserId,
          },
        },
        client,
      )

      return normalizeActivationRequest(updated)
    } catch (error) {
      if (error instanceof HiringActivationIdentityConflictError) {
        // Loud + auditable: el request queda blocked con código estable; humano resuelve.
        const blocked = await blockRequestInTransaction(client, request, error.kind, error.message, input.actorUserId)

        captureWithDomain(error, 'identity', {
          tags: { source: 'hiring_activation_create_member' },
          extra: { hiringHandoffId: handoff.handoffId, kind: error.kind },
        })

        return normalizeActivationRequest(blocked)
      }

      throw error
    }
  })
}

const blockRequestInTransaction = async (
  client: Parameters<typeof updateActivationRequestState>[0],
  request: HiringActivationRequestRow,
  reason: HiringActivationBlockedReason,
  detail: string,
  actorUserId: string | null,
): Promise<HiringActivationRequestRow> => {
  const blocked = await updateActivationRequestState(client, {
    activationRequestId: request.activation_request_id,
    state: 'blocked',
    blockedReason: reason,
    blockedDetail: detail.slice(0, 500),
  })

  await appendActivationEvent(client, {
    activationRequestId: request.activation_request_id,
    fromState: request.state as HiringActivationState,
    toState: 'blocked',
    actorUserId,
    reasonCode: reason,
    reasonDetail: detail.slice(0, 500),
  })

  return blocked
}

/**
 * open-onboarding — asegura el checklist de onboarding (TASK-030, idempotente: el consumer
 * de member.created pudo haberlo creado ya) y registra los ids en el mapping. Sin template
 * aplicable → request blocked (onboarding_template_missing), nunca mudo.
 */
export const openOnboardingForHiringActivation = async (
  input: CommandInput,
): Promise<HiringActivationRequest> => {
  const handoff = await assertConsumableHandoff(input.hiringHandoffId)
  const request = await getActivationRequestByHandoffId(handoff.handoffId)

  if (!request?.memberId) {
    throw new HiringActivationError(
      'Primero crea o enlaza la faceta de colaborador.',
      'hiring_activation_member_required',
      409,
    )
  }

  if (request.state === 'onboarding_open' && request.onboardingInstanceId) {
    return request
  }

  let onboardingInstanceId: string | null = null

  try {
    // Abre su propia tx (TASK-030); idempotente por (member, type) activo.
    const instance = await createOnboardingInstance({
      input: {
        memberId: request.memberId,
        type: 'onboarding',
        startDate: null,
        source: 'system',
        sourceRef: { source: 'hiring_activation', activationRequestId: request.activationRequestId },
      },
      actorUserId: input.actorUserId,
    })

    onboardingInstanceId = (instance as { instanceId?: string } | null)?.instanceId ?? null
  } catch (error) {
    if (error instanceof HrCoreValidationError && error.statusCode === 409) {
      return runGreenhouseQuery(async (client) => {
        const locked = await lockActivationRequestByHandoffId(client, handoff.handoffId)

        if (!locked) throw error

        const blocked = await blockRequestInTransaction(
          client,
          locked,
          'onboarding_template_missing',
          'No hay template de onboarding activo aplicable al colaborador.',
          input.actorUserId,
        )

        return normalizeActivationRequest(blocked)
      })
    }

    throw error
  }

  return runGreenhouseQuery(async (client) => {
    const locked = await lockActivationRequestByHandoffId(client, handoff.handoffId)

    if (!locked) {
      throw new HiringActivationError('La solicitud de activación no existe.', 'hiring_activation_request_missing', 404)
    }

    if (locked.state === 'onboarding_open' && locked.onboarding_instance_id) {
      return normalizeActivationRequest(locked)
    }

    const updated = await updateActivationRequestState(client, {
      activationRequestId: locked.activation_request_id,
      state: 'onboarding_open',
      onboardingInstanceId,
      blockedReason: null,
      blockedDetail: null,
    })

    await appendActivationEvent(client, {
      activationRequestId: locked.activation_request_id,
      fromState: locked.state as HiringActivationState,
      toState: 'onboarding_open',
      actorUserId: input.actorUserId,
      reasonCode: 'onboarding_checklist_ensured',
      reasonDetail: null,
      memberId: locked.member_id,
      onboardingInstanceId,
    })

    return normalizeActivationRequest(updated)
  })
}

interface MemberIntakeRow extends Record<string, unknown> {
  workforce_intake_status: string
}

interface OnboardingCaseRow extends Record<string, unknown> {
  case_id: string
}

/**
 * complete — cierra el bridge SOLO con evidencia real: el intake del member debe estar
 * `completed` (vía completeWorkforceMemberIntake + readiness, el path existente — 770 no
 * activa a nadie). Marca el HiringHandoff `completed` con downstreamRef=member:<id>.
 */
export const completeHiringActivation = async (input: CommandInput): Promise<HiringActivationRequest> => {
  const handoff = await assertConsumableHandoff(input.hiringHandoffId)
  const request = await getActivationRequestByHandoffId(handoff.handoffId)

  if (!request?.memberId) {
    throw new HiringActivationError(
      'Primero crea o enlaza la faceta de colaborador.',
      'hiring_activation_member_required',
      409,
    )
  }

  if (request.state === 'active') return request

  return runGreenhouseQuery(async (client) => {
    const locked = await lockActivationRequestByHandoffId(client, handoff.handoffId)

    if (!locked?.member_id) {
      throw new HiringActivationError('La solicitud de activación no existe.', 'hiring_activation_request_missing', 404)
    }

    if (locked.state === 'active') return normalizeActivationRequest(locked)

    // Evidencia: el intake completó por el path canónico (readiness + completeWorkforceMemberIntake).
    const memberResult = await client.query<MemberIntakeRow>(
      `SELECT workforce_intake_status FROM greenhouse_core.members WHERE member_id = $1`,
      [locked.member_id],
    )

    if (memberResult.rows[0]?.workforce_intake_status !== 'completed') {
      throw new HiringActivationError(
        'El colaborador aún no completa su ficha laboral. Complétala en Workforce Activation antes de cerrar la activación.',
        'hiring_activation_member_intake_pending',
        409,
      )
    }

    // Evidencia del case de onboarding (lo abre completeWorkforceMemberIntake).
    const caseResult = await client.query<OnboardingCaseRow>(
      `SELECT case_id FROM greenhouse_hr.work_relationship_onboarding_cases
       WHERE member_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [locked.member_id],
    )

    const onboardingCaseId = caseResult.rows[0]?.case_id ?? null

    const updated = await updateActivationRequestState(client, {
      activationRequestId: locked.activation_request_id,
      state: 'active',
      onboardingCaseId,
      blockedReason: null,
      blockedDetail: null,
    })

    await appendActivationEvent(client, {
      activationRequestId: locked.activation_request_id,
      fromState: locked.state as HiringActivationState,
      toState: 'active',
      actorUserId: input.actorUserId,
      reasonCode: 'activation_completed',
      reasonDetail: null,
      memberId: locked.member_id,
      onboardingCaseId,
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringActivationRequest,
        aggregateId: locked.activation_request_id,
        eventType: EVENT_TYPES.hiringActivationCompleted,
        payload: {
          activationRequestId: locked.activation_request_id,
          hiringHandoffId: handoff.handoffId,
          memberId: locked.member_id,
          onboardingInstanceId: locked.onboarding_instance_id,
          onboardingCaseId,
          actorUserId: input.actorUserId,
        },
      },
      client,
    )

    return normalizeActivationRequest(updated)
  }).then(async (result) => {
    // Marca el handoff completed (command 356, idempotente, tx propia) con la evidencia.
    // Post-commit del request: si esto falla, el retry del complete es replay seguro.
    await transitionHiringHandoff({
      handoffId: handoff.handoffId,
      action: 'complete',
      actorUserId: input.actorUserId,
      downstreamRef: `member:${result.memberId}`,
      reasonCode: 'hiring_activation_completed',
    })

    return result
  })
}

/** cancel — la activación no sigue (candidato desiste / se resolvió fuera). Auditado. */
export const cancelHiringActivation = async (
  input: CommandInput & { reasonDetail?: string },
): Promise<HiringActivationRequest> => {
  return runGreenhouseQuery(async (client) => {
    const locked = await lockActivationRequestByHandoffId(client, input.hiringHandoffId.trim())

    if (!locked) {
      throw new HiringActivationError('La solicitud de activación no existe.', 'hiring_activation_request_missing', 404)
    }

    if (locked.state === 'cancelled') return normalizeActivationRequest(locked)

    if (locked.state === 'active') {
      throw new HiringActivationError(
        'La activación ya se completó; no se puede cancelar.',
        'hiring_activation_already_active',
        409,
      )
    }

    const updated = await updateActivationRequestState(client, {
      activationRequestId: locked.activation_request_id,
      state: 'cancelled',
      blockedReason: null,
      blockedDetail: null,
    })

    await appendActivationEvent(client, {
      activationRequestId: locked.activation_request_id,
      fromState: locked.state as HiringActivationState,
      toState: 'cancelled',
      actorUserId: input.actorUserId,
      reasonCode: 'cancelled',
      reasonDetail: input.reasonDetail?.slice(0, 500) ?? null,
    })

    return normalizeActivationRequest(updated)
  })
}
