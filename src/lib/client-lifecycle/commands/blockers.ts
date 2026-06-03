import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

import { getCaseById } from '../store'
import { ClientLifecycleValidationError, type BlockerMutationResult } from '../types'
import { isTerminalCaseStatus } from '../state-machine'
import { insertCaseEvent, publishLifecycleEvent, LIFECYCLE_EVENT_TYPES } from './command-helpers'

export interface AddLifecycleBlockerInput {
  caseId: string
  reasonCode: string
  actorUserId: string
  detail?: string
}

export interface ResolveLifecycleBlockerInput {
  caseId: string
  reasonCode: string
  actorUserId: string
}

export const addLifecycleBlocker = async (
  input: AddLifecycleBlockerInput,
  existingClient?: PoolClient
): Promise<BlockerMutationResult> => {
  const run = async (client: PoolClient): Promise<BlockerMutationResult> => {
    const caseRow = await getCaseById(input.caseId, client, true)

    if (!caseRow) {
      throw new ClientLifecycleValidationError('case_not_found', 'El caso no existe.', 404)
    }

    if (isTerminalCaseStatus(caseRow.status)) {
      throw new ClientLifecycleValidationError('case_terminal', 'El caso ya está resuelto.', 409)
    }

    const codes = caseRow.blockedReasonCodes.includes(input.reasonCode)
      ? caseRow.blockedReasonCodes
      : [...caseRow.blockedReasonCodes, input.reasonCode]

    // Only in_progress -> blocked is a legal transition; draft stays draft.
    const nextStatus = caseRow.status === 'in_progress' ? 'blocked' : caseRow.status

    await client.query(
      `UPDATE greenhouse_core.client_lifecycle_cases
       SET blocked_reason_codes = $2, status = $3
       WHERE case_id = $1`,
      [input.caseId, codes, nextStatus]
    )

    await insertCaseEvent(client, {
      caseId: input.caseId,
      eventKind: 'blocker_added',
      fromStatus: caseRow.status,
      toStatus: nextStatus,
      actorUserId: input.actorUserId,
      payload: { reasonCode: input.reasonCode, detail: input.detail ?? null }
    })

    await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleBlockerAdded, input.caseId, {
      reasonCode: input.reasonCode
    })

    return { caseId: input.caseId, status: nextStatus, blockedReasonCodes: codes }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}

export const resolveLifecycleBlocker = async (
  input: ResolveLifecycleBlockerInput,
  existingClient?: PoolClient
): Promise<BlockerMutationResult> => {
  const run = async (client: PoolClient): Promise<BlockerMutationResult> => {
    const caseRow = await getCaseById(input.caseId, client, true)

    if (!caseRow) {
      throw new ClientLifecycleValidationError('case_not_found', 'El caso no existe.', 404)
    }

    if (isTerminalCaseStatus(caseRow.status)) {
      throw new ClientLifecycleValidationError('case_terminal', 'El caso ya está resuelto.', 409)
    }

    const codes = caseRow.blockedReasonCodes.filter((code) => code !== input.reasonCode)
    // When the last blocker clears, return a blocked case to in_progress.
    const nextStatus = caseRow.status === 'blocked' && codes.length === 0 ? 'in_progress' : caseRow.status

    await client.query(
      `UPDATE greenhouse_core.client_lifecycle_cases
       SET blocked_reason_codes = $2, status = $3
       WHERE case_id = $1`,
      [input.caseId, codes, nextStatus]
    )

    await insertCaseEvent(client, {
      caseId: input.caseId,
      eventKind: 'blocker_resolved',
      fromStatus: caseRow.status,
      toStatus: nextStatus,
      actorUserId: input.actorUserId,
      payload: { reasonCode: input.reasonCode }
    })

    await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleBlockerResolved, input.caseId, {
      reasonCode: input.reasonCode
    })

    return { caseId: input.caseId, status: nextStatus, blockedReasonCodes: codes }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}
