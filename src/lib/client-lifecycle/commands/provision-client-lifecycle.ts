import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

import {
  getActiveCaseForOrganization,
  getCaseById,
  getChecklistItems,
  readActiveTemplateItems
} from '../store'
import {
  ClientLifecycleValidationError,
  DEFAULT_TEMPLATE_BY_KIND,
  type ClientLifecycleCaseKind,
  type ClientLifecycleChecklistSnapshot,
  type ClientLifecycleTriggerSource,
  type ProvisionClientLifecycleResult
} from '../types'
import { insertCaseEvent, newItemId, publishLifecycleEvent, LIFECYCLE_EVENT_TYPES } from './command-helpers'

export interface ProvisionClientLifecycleInput {
  organizationId: string
  // V1.0 commands cover onboarding + reactivation (offboarding has its own command, deferred).
  caseKind: Extract<ClientLifecycleCaseKind, 'onboarding' | 'reactivation'>
  triggerSource: ClientLifecycleTriggerSource
  triggeredByUserId: string
  reason?: string
  effectiveDate: string // ISO date
  targetCompletionDate?: string
  templateCode?: string
  previousCaseId?: string
  hubspotDealId?: string
  /** Override the derived initial status (hubspot_deal -> draft, otherwise in_progress). */
  initialStatus?: 'draft' | 'in_progress'
}

const deriveInitialStatus = (
  triggerSource: ClientLifecycleTriggerSource,
  override?: 'draft' | 'in_progress'
): 'draft' | 'in_progress' => {
  if (override) return override

  return triggerSource === 'hubspot_deal' ? 'draft' : 'in_progress'
}

const toSnapshot = (
  items: Awaited<ReturnType<typeof getChecklistItems>>
): ClientLifecycleChecklistSnapshot[] =>
  items.map((item) => ({
    itemId: item.itemId,
    itemCode: item.itemCode,
    status: item.status,
    displayOrder: item.displayOrder
  }))

/**
 * Open a client lifecycle case (onboarding/reactivation), materialize its checklist
 * from the active template, and emit the audit event + outbox event — all atomic.
 *
 * Idempotent: if an active case of the same kind already exists for the organization,
 * the existing case is returned unchanged (idempotent=true).
 *
 * Organizations must already exist (write the org row via upsertCanonicalOrganization
 * BEFORE calling this command). This command never writes greenhouse_core.organizations.
 */
export const provisionClientLifecycle = async (
  input: ProvisionClientLifecycleInput,
  existingClient?: PoolClient
): Promise<ProvisionClientLifecycleResult> => {
  const templateCode = input.templateCode ?? DEFAULT_TEMPLATE_BY_KIND[input.caseKind]
  const status = deriveInitialStatus(input.triggerSource, input.initialStatus)

  const run = async (client: PoolClient): Promise<ProvisionClientLifecycleResult> => {
    // Idempotency: one active case per (organization, kind).
    const existing = await getActiveCaseForOrganization(input.organizationId, input.caseKind, client, true)

    if (existing) {
      const items = await getChecklistItems(existing.caseId, client)


      return {
        caseId: existing.caseId,
        status: existing.status === 'draft' ? 'draft' : 'in_progress',
        checklistItems: toSnapshot(items),
        blockers: existing.blockedReasonCodes,
        idempotent: true
      }
    }

    // Reactivation requires a resolved previous case.
    if (input.caseKind === 'reactivation') {
      if (!input.previousCaseId) {
        throw new ClientLifecycleValidationError(
          'previous_case_required',
          'reactivation requiere previousCaseId.',
          400
        )
      }

      const previous = await getCaseById(input.previousCaseId, client)

      if (!previous) {
        throw new ClientLifecycleValidationError(
          'previous_case_not_found',
          'El caso previo referenciado no existe.',
          404
        )
      }

      if (previous.status !== 'completed' && previous.status !== 'cancelled') {
        throw new ClientLifecycleValidationError(
          'previous_case_not_resolved',
          'El caso previo aún no está resuelto.',
          409
        )
      }
    }

    const templateItems = await readActiveTemplateItems(templateCode, client)

    if (templateItems.length === 0) {
      throw new ClientLifecycleValidationError(
        'template_not_found',
        `No hay items activos para el template ${templateCode}.`,
        422,
        { templateCode }
      )
    }

    const metadata: Record<string, unknown> = {}

    if (input.hubspotDealId) metadata.hubspotDealId = input.hubspotDealId

    const insertedCase = await client.query<{ case_id: string }>(
      `INSERT INTO greenhouse_core.client_lifecycle_cases (
         case_id, organization_id, case_kind, status, trigger_source,
         triggered_by_user_id, reason, effective_date, target_completion_date,
         previous_case_id, template_code, metadata_json
       ) VALUES (
         'clc-' || gen_random_uuid(), $1, $2, $3, $4,
         $5, $6, $7::date, $8::date,
         $9, $10, $11::jsonb
       )
       RETURNING case_id`,
      [
        input.organizationId,
        input.caseKind,
        status,
        input.triggerSource,
        input.triggeredByUserId,
        input.reason ?? null,
        input.effectiveDate,
        input.targetCompletionDate ?? null,
        input.previousCaseId ?? null,
        templateCode,
        JSON.stringify(metadata)
      ]
    )

    const caseId = insertedCase.rows[0]?.case_id

    if (!caseId) {
      throw new ClientLifecycleValidationError('case_insert_failed', 'No se pudo crear el caso.', 500)
    }

    for (const item of templateItems) {
      await client.query(
        `INSERT INTO greenhouse_core.client_lifecycle_checklist_items (
           item_id, case_id, template_code, item_code, item_label, required,
           blocks_completion, requires_evidence, owner_role, display_order, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        [
          newItemId(),
          caseId,
          item.templateCode,
          item.itemCode,
          item.itemLabel,
          item.required,
          item.blocksCompletion,
          item.requiresEvidence,
          item.ownerRole,
          item.defaultOrder
        ]
      )
    }

    await insertCaseEvent(client, {
      caseId,
      eventKind: 'opened',
      toStatus: status,
      actorUserId: input.triggeredByUserId,
      payload: {
        caseKind: input.caseKind,
        triggerSource: input.triggerSource,
        templateCode,
        itemCount: templateItems.length
      }
    })

    await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleCaseOpened, caseId, {
      organizationId: input.organizationId,
      caseKind: input.caseKind,
      triggerSource: input.triggerSource,
      effectiveDate: input.effectiveDate,
      templateCode
    })

    const items = await getChecklistItems(caseId, client)


    return {
      caseId,
      status,
      checklistItems: toSnapshot(items),
      blockers: [],
      idempotent: false
    }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}
