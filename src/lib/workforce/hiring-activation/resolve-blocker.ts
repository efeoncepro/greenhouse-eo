import 'server-only'

import { createHash } from 'node:crypto'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import {
  findHiringActivationBlocker,
  getHiringActivationBlockerActionContract,
  isHiringActivationBlockerResolutionAction,
  normalizeHiringActivationBlockerKey,
} from './blockers'
import { HiringActivationError } from './errors'
import { getHiringActivationDetail, type HiringActivationDetail } from './readers'
import { createMemberForHiringActivation, openOnboardingForHiringActivation } from './service'
import { appendActivationEvent, lockActivationRequestByHandoffId } from './store'
import type {
  HiringActivationActionableBlocker,
  HiringActivationBlockerResolutionAction,
  HiringActivationBlockerResolutionResultStatus,
  HiringActivationRequest,
  HiringActivationState,
} from './types'

interface ResolveHiringActivationBlockerInput {
  hiringHandoffId: string
  blockerKey: string
  action: string
  payload?: unknown
  actorUserId: string | null
}

export interface ResolveHiringActivationBlockerResult {
  status: HiringActivationBlockerResolutionResultStatus
  resolved: boolean
  blockerKey: string
  action: HiringActivationBlockerResolutionAction
  payloadDigest: string
  blocker: HiringActivationActionableBlocker
  request: HiringActivationRequest | null
  detail: HiringActivationDetail
}

type NormalizedPayload = {
  value: Record<string, unknown>
  auditShape: Record<string, unknown>
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`
}

const normalizePayload = (payload: unknown): NormalizedPayload => {
  if (payload === undefined || payload === null) {
    return { value: {}, auditShape: { keys: [], reason: 'omitted' } }
  }

  if (typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HiringActivationError(
      'El payload de resolución debe ser un objeto JSON.',
      'hiring_activation_blocker_payload_invalid',
      400,
    )
  }

  const input = payload as Record<string, unknown>
  const keys = Object.keys(input).sort()
  const unsupportedKey = keys.find((key) => key !== 'reason')

  if (unsupportedKey) {
    throw new HiringActivationError(
      'El payload contiene campos no soportados para este blocker.',
      'hiring_activation_blocker_payload_invalid',
      400,
      { unsupportedKey },
    )
  }

  const normalized: Record<string, unknown> = {}

  if (input.reason !== undefined) {
    if (typeof input.reason !== 'string') {
      throw new HiringActivationError(
        'La razón operativa debe ser texto.',
        'hiring_activation_blocker_payload_invalid',
        400,
      )
    }

    const reason = input.reason.trim()

    if (reason.length > 240) {
      throw new HiringActivationError(
        'La razón operativa debe tener máximo 240 caracteres.',
        'hiring_activation_blocker_payload_invalid',
        400,
      )
    }

    if (reason) normalized.reason = reason
  }

  return {
    value: normalized,
    auditShape: {
      keys,
      reason: normalized.reason ? 'provided' : 'omitted',
    },
  }
}

export const computeHiringActivationBlockerPayloadDigest = ({
  hiringHandoffId,
  blockerKey,
  action,
  payload,
}: {
  hiringHandoffId: string
  blockerKey: string
  action: HiringActivationBlockerResolutionAction
  payload: Record<string, unknown>
}): string =>
  createHash('sha256')
    .update(
      stableStringify({
        hiringHandoffId: hiringHandoffId.trim(),
        blockerKey: normalizeHiringActivationBlockerKey(blockerKey),
        action,
        payload,
      }),
    )
    .digest('hex')

const appendResolutionAudit = async ({
  hiringHandoffId,
  actorUserId,
  blockerKey,
  action,
  payloadDigest,
  auditShape,
  resultStatus,
}: {
  hiringHandoffId: string
  actorUserId: string | null
  blockerKey: string
  action: HiringActivationBlockerResolutionAction
  payloadDigest: string
  auditShape: Record<string, unknown>
  resultStatus: 'attempted' | 'not_resolvable'
}): Promise<void> => {
  await withGreenhousePostgresTransaction(async (client) => {
    const locked = await lockActivationRequestByHandoffId(client, hiringHandoffId.trim())

    if (!locked) {
      throw new HiringActivationError('La solicitud de activación no existe.', 'hiring_activation_request_missing', 404)
    }

    await appendActivationEvent(client, {
      activationRequestId: locked.activation_request_id,
      fromState: locked.state as HiringActivationState,
      toState: locked.state as HiringActivationState,
      actorUserId,
      reasonCode: `blocker_resolution_${resultStatus}`,
      reasonDetail: null,
      memberId: locked.member_id,
      onboardingInstanceId: locked.onboarding_instance_id,
      onboardingCaseId: locked.onboarding_case_id,
      metadata: {
        blockerKey: normalizeHiringActivationBlockerKey(blockerKey),
        action,
        payloadDigest,
        payloadShape: auditShape,
        resultStatus,
      },
    })
  })
}

const assertFreshDetail = async (hiringHandoffId: string): Promise<HiringActivationDetail> => {
  const detail = await getHiringActivationDetail(hiringHandoffId)

  if (!detail) {
    throw new HiringActivationError('La activación no existe.', 'hiring_activation_not_found', 404)
  }

  return detail
}

export const resolveHiringActivationBlocker = async (
  input: ResolveHiringActivationBlockerInput,
): Promise<ResolveHiringActivationBlockerResult> => {
  if (!isHiringActivationBlockerResolutionAction(input.action)) {
    throw new HiringActivationError(
      'La acción de resolución de blocker no existe.',
      'hiring_activation_blocker_action_not_found',
      404,
    )
  }

  const action = input.action
  const actionContract = getHiringActivationBlockerActionContract(action)

  if (!actionContract) {
    throw new HiringActivationError(
      'La acción de resolución de blocker no tiene contrato vigente.',
      'hiring_activation_blocker_action_not_found',
      404,
    )
  }

  const normalizedPayload = normalizePayload(input.payload)

  const payloadDigest = computeHiringActivationBlockerPayloadDigest({
    hiringHandoffId: input.hiringHandoffId,
    blockerKey: input.blockerKey,
    action,
    payload: normalizedPayload.value,
  })

  const detail = await assertFreshDetail(input.hiringHandoffId)
  const blocker = findHiringActivationBlocker(detail.blockers, input.blockerKey)

  if (!blocker) {
    throw new HiringActivationError(
      'El blocker ya no está vigente. Refresca el detalle antes de reintentar.',
      'hiring_activation_blocker_stale',
      409,
      { detail },
    )
  }

  const supportsAction = blocker.supportedActions.some((candidate) => candidate.action === action)

  if (blocker.status === 'not_resolvable' || !supportsAction) {
    await appendResolutionAudit({
      hiringHandoffId: input.hiringHandoffId,
      actorUserId: input.actorUserId,
      blockerKey: blocker.key,
      action,
      payloadDigest,
      auditShape: normalizedPayload.auditShape,
      resultStatus: 'not_resolvable',
    })

    const freshDetail = await assertFreshDetail(input.hiringHandoffId)

    return {
      status: 'not_resolvable',
      resolved: false,
      blockerKey: blocker.key,
      action,
      payloadDigest,
      blocker,
      request: freshDetail.request,
      detail: freshDetail,
    }
  }

  await appendResolutionAudit({
    hiringHandoffId: input.hiringHandoffId,
    actorUserId: input.actorUserId,
    blockerKey: blocker.key,
    action,
    payloadDigest,
    auditShape: normalizedPayload.auditShape,
    resultStatus: 'attempted',
  })

  switch (action) {
    case 'retry-create-member':
      await createMemberForHiringActivation({
        hiringHandoffId: input.hiringHandoffId,
        actorUserId: input.actorUserId,
      })
      break
    case 'retry-open-onboarding':
      await openOnboardingForHiringActivation({
        hiringHandoffId: input.hiringHandoffId,
        actorUserId: input.actorUserId,
      })
      break
  }

  const freshDetail = await assertFreshDetail(input.hiringHandoffId)
  const remainingBlocker = findHiringActivationBlocker(freshDetail.blockers, blocker.key)

  return {
    status: remainingBlocker ? 'still_blocked' : 'resolved',
    resolved: !remainingBlocker,
    blockerKey: blocker.key,
    action,
    payloadDigest,
    blocker: remainingBlocker ?? blocker,
    request: freshDetail.request,
    detail: freshDetail,
  }
}
