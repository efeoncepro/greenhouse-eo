import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

import { getCaseById, getChecklistItemByCode } from '../store'
import {
  ClientLifecycleValidationError,
  type AdvanceChecklistItemResult,
  type ClientLifecycleItemStatus
} from '../types'
import { assertItemTransition, isTerminalCaseStatus } from '../state-machine'
import { insertCaseEvent, publishLifecycleEvent, LIFECYCLE_EVENT_TYPES } from './command-helpers'

export interface AdvanceChecklistItemInput {
  caseId: string
  itemCode: string
  newStatus: Exclude<ClientLifecycleItemStatus, 'pending'>
  evidenceAssetId?: string
  notes?: string
  blockedReason?: string
  actorUserId: string
  /** Authorize skipping a required item (gated by override capability at the API layer). */
  allowSkipRequired?: boolean
}

const EVENT_KIND_BY_STATUS: Record<string, string> = {
  completed: 'item_completed',
  skipped: 'item_skipped',
  blocked: 'item_blocked',
  not_applicable: 'item_advanced',
  in_progress: 'item_advanced'
}

export const advanceLifecycleChecklistItem = async (
  input: AdvanceChecklistItemInput,
  existingClient?: PoolClient
): Promise<AdvanceChecklistItemResult> => {
  const run = async (client: PoolClient): Promise<AdvanceChecklistItemResult> => {
    const caseRow = await getCaseById(input.caseId, client, true)

    if (!caseRow) {
      throw new ClientLifecycleValidationError('case_not_found', 'El caso no existe.', 404)
    }

    if (isTerminalCaseStatus(caseRow.status)) {
      throw new ClientLifecycleValidationError(
        'case_terminal',
        'No se pueden avanzar ítems de un caso resuelto.',
        409,
        { status: caseRow.status }
      )
    }

    const item = await getChecklistItemByCode(input.caseId, input.itemCode, client, true)

    if (!item) {
      throw new ClientLifecycleValidationError('item_not_found', 'El ítem del checklist no existe.', 404)
    }

    assertItemTransition(item.status, input.newStatus)

    if (input.newStatus === 'skipped' && item.required && !input.allowSkipRequired) {
      throw new ClientLifecycleValidationError(
        'skip_required_item',
        'No se puede omitir un ítem requerido sin override.',
        409,
        { itemCode: input.itemCode }
      )
    }

    if (input.newStatus === 'completed' && item.requiresEvidence && !input.evidenceAssetId) {
      throw new ClientLifecycleValidationError(
        'evidence_required',
        'Este ítem requiere evidencia para completarse.',
        422,
        { itemCode: input.itemCode }
      )
    }

    if (input.newStatus === 'blocked' && !input.blockedReason) {
      throw new ClientLifecycleValidationError(
        'blocked_reason_required',
        'Indica la razón del bloqueo del ítem.',
        400
      )
    }

    if (input.newStatus === 'not_applicable' && !input.notes) {
      throw new ClientLifecycleValidationError(
        'not_applicable_reason_required',
        'Indica por qué el ítem no aplica.',
        400
      )
    }

    const isClosing = input.newStatus === 'completed' || input.newStatus === 'skipped'

    await client.query(
      `UPDATE greenhouse_core.client_lifecycle_checklist_items
       SET status = $2,
           evidence_asset_id = COALESCE($3, evidence_asset_id),
           notes = COALESCE($4, notes),
           blocked_reason = CASE WHEN $2 = 'blocked' THEN $5 ELSE NULL END,
           completed_at = CASE WHEN $6 THEN now() ELSE completed_at END,
           completed_by_user_id = CASE WHEN $6 THEN $7 ELSE completed_by_user_id END
       WHERE item_id = $1`,
      [
        item.itemId,
        input.newStatus,
        input.evidenceAssetId ?? null,
        input.notes ?? null,
        input.blockedReason ?? null,
        isClosing,
        input.actorUserId
      ]
    )

    await insertCaseEvent(client, {
      caseId: input.caseId,
      eventKind: EVENT_KIND_BY_STATUS[input.newStatus] ?? 'item_advanced',
      fromStatus: item.status,
      toStatus: input.newStatus,
      actorUserId: input.actorUserId,
      payload: {
        itemCode: input.itemCode,
        evidenceAssetId: input.evidenceAssetId ?? null
      }
    })

    await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleItemAdvanced, input.caseId, {
      itemCode: input.itemCode,
      fromStatus: item.status,
      toStatus: input.newStatus,
      evidenceAssetId: input.evidenceAssetId ?? null
    })

    return {
      itemId: item.itemId,
      status: input.newStatus,
      caseStatus: caseRow.status
    }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}
