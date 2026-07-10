import 'server-only'

// TASK-356 — transitionHiringHandoff: command gobernado (capability hiring.handoff.approve)
// que mueve el handoff por la state-machine humana. Idempotente por (handoff, targetState).
// V1 humano-asistido: `completed` exige downstream_ref (evidencia del owner — nunca por
// inferencia); approve exige destino soportado. El command NUNCA escribe members/assignments/
// placements/payroll ni ejecuta side effects downstream — solo el estado del boundary object.

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { COMMAND_ACTION_TARGET, isValidCommandTransition } from './state-machine'
import { appendHandoffAudit, lockHandoffById, normalizeHiringHandoff, updateHandoffState } from './store'
import {
  HIRING_HANDOFF_COMMAND_ACTIONS,
  isSupportedHandoffDestination,
  type HiringHandoffCommandAction,
  type HiringHandoffState,
  type TransitionHiringHandoffInput,
  type TransitionHiringHandoffResult,
} from './types'

const EVENT_BY_TARGET: Partial<Record<HiringHandoffState, string>> = {
  approved: EVENT_TYPES.hiringHandoffApproved,
  in_setup: EVENT_TYPES.hiringHandoffInSetup,
  completed: EVENT_TYPES.hiringHandoffCompleted,
  cancelled: EVENT_TYPES.hiringHandoffCancelled,
}

export const isHiringHandoffCommandAction = (value: string): value is HiringHandoffCommandAction =>
  (HIRING_HANDOFF_COMMAND_ACTIONS as readonly string[]).includes(value)

const sanitizeShortText = (value: string | undefined, field: string, maxLength: number): string | null => {
  if (value == null) return null

  const trimmed = value.trim()

  if (!trimmed) return null

  if (trimmed.length > maxLength) {
    throw new HiringValidationError(
      `El campo ${field} no puede superar ${maxLength} caracteres.`,
      'hiring_handoff_field_too_long',
    )
  }

  return trimmed
}

export const transitionHiringHandoff = async (
  input: TransitionHiringHandoffInput,
): Promise<TransitionHiringHandoffResult> => {
  const handoffId = input.handoffId.trim()

  if (!handoffId) {
    throw new HiringValidationError('El handoff es obligatorio.', 'hiring_handoff_id_required')
  }

  if (!isHiringHandoffCommandAction(input.action)) {
    throw new HiringValidationError('La acción indicada no es válida.', 'hiring_handoff_action_invalid')
  }

  const targetState = COMMAND_ACTION_TARGET[input.action]
  const reasonCode = sanitizeShortText(input.reasonCode, 'reasonCode', 80)
  const reasonDetail = sanitizeShortText(input.reasonDetail, 'reasonDetail', 500)
  const downstreamRef = sanitizeShortText(input.downstreamRef, 'downstreamRef', 200)

  return withGreenhousePostgresTransaction(async (client) => {
    const row = await lockHandoffById(client, handoffId)

    if (!row) {
      throw new HiringNotFoundError('El handoff no existe.', 'hiring_handoff_not_found')
    }

    const currentState = row.state as HiringHandoffState

    // Idempotencia por (handoff, targetState): repetir la misma transición es replay.
    if (currentState === targetState) {
      return { handoff: normalizeHiringHandoff(row), idempotentReplay: true }
    }

    if (!isValidCommandTransition(currentState, targetState)) {
      throw new HiringValidationError(
        'La transición solicitada no es válida para el estado actual del handoff.',
        'hiring_handoff_invalid_transition',
        409,
        { from: currentState, to: targetState },
      )
    }

    if (targetState === 'approved' && !isSupportedHandoffDestination(row.selected_destination as never)) {
      throw new HiringValidationError(
        'El destino del handoff aún no tiene owner downstream soportado.',
        'hiring_handoff_destination_not_supported',
        422,
      )
    }

    if (targetState === 'completed' && !downstreamRef && !row.downstream_ref) {
      throw new HiringValidationError(
        'Completar el handoff requiere la referencia downstream como evidencia.',
        'hiring_handoff_downstream_ref_required',
        422,
      )
    }

    const updated = await updateHandoffState(client, {
      handoffId,
      state: targetState,
      blockedReason: null,
      blockedDetail: null,
      ...(downstreamRef ? { downstreamRef } : {}),
    })

    const handoff = normalizeHiringHandoff(updated)

    await appendHandoffAudit(client, {
      handoffId,
      fromState: currentState,
      toState: targetState,
      decisionId: row.decision_id,
      actorUserId: input.actorUserId,
      reasonCode,
      reasonDetail,
      downstreamRef: downstreamRef ?? row.downstream_ref,
      openPrerequisites: {},
    })

    const eventType = EVENT_BY_TARGET[targetState]

    if (eventType) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.hiringHandoff,
          aggregateId: handoff.handoffId,
          eventType,
          payload: {
            handoffId: handoff.handoffId,
            applicationId: handoff.applicationId,
            openingId: handoff.openingId,
            decisionId: handoff.decisionId,
            selectedDestination: handoff.selectedDestination,
            state: handoff.state,
            actorUserId: input.actorUserId,
            downstreamRef: handoff.downstreamRef,
            reasonCode,
          },
        },
        client,
      )
    }

    return { handoff, idempotentReplay: false }
  })
}
