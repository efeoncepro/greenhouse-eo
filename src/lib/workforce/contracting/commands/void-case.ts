import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertCaseTransition } from '../state-machine'
import { getCaseById } from '../store'
import {
  VOID_STATUS_BY_KIND,
  WorkforceContractingValidationError,
  type WorkforceContractingCaseStatus
} from '../types'
import { insertCaseEvent } from './command-helpers'

export interface VoidWorkforceContractingCaseInput {
  caseId: string
  reason: string
  actorUserId: string
}

export interface VoidWorkforceContractingCaseResult {
  caseId: string
  status: WorkforceContractingCaseStatus
  idempotent: boolean
}

/**
 * Void a contracting case (offer → withdrawn; contract → voided). Terminal.
 * Idempotent: re-voiding an already-voided case is a no-op. The transition is
 * validated against the state machine (cannot void accepted/active/converted cases).
 */
export const voidWorkforceContractingCase = async (
  input: VoidWorkforceContractingCaseInput,
  existingClient?: PoolClient
): Promise<VoidWorkforceContractingCaseResult> => {
  if (input.reason.trim().length < 5) {
    throw new WorkforceContractingValidationError(
      'void_reason_too_short',
      'El motivo de anulación debe tener al menos 5 caracteres.',
      422
    )
  }

  const run = async (client: PoolClient): Promise<VoidWorkforceContractingCaseResult> => {
    const contractingCase = await getCaseById(input.caseId, client, true)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso de contratación no encontrado.', 404)
    }

    const voidStatus = VOID_STATUS_BY_KIND[contractingCase.caseKind]

    if (contractingCase.status === voidStatus) {
      return { caseId: input.caseId, status: contractingCase.status, idempotent: true }
    }

    assertCaseTransition(contractingCase.caseKind, contractingCase.status, voidStatus)

    await client.query(
      `UPDATE greenhouse_hr.workforce_contracting_cases
       SET status = $1, voided_at = now(), void_reason = $2
       WHERE case_id = $3`,
      [voidStatus, input.reason.trim(), input.caseId]
    )

    await insertCaseEvent(client, {
      caseId: input.caseId,
      eventKind: 'case_voided',
      fromStatus: contractingCase.status,
      toStatus: voidStatus,
      actorUserId: input.actorUserId,
      payload: { reason: input.reason.trim() }
    })

    return { caseId: input.caseId, status: voidStatus, idempotent: false }
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}
