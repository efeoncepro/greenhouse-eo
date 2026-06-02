import 'server-only'

import { getContractorPayableById } from '@/lib/contractor-engagements/payables/store'
import { materializeContractorPayableExpense } from '@/lib/finance/contractor-payable-expense-reactive'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-977 Slice 2 — Materialize the contractor's expense when the payable is
 * ready_for_finance. Sibling of `contractor_payable_finance_obligation` (both
 * trigger on the same event); this one creates the `expenses` row that the
 * settlement (TASK-977 Slice 3) will pay against.
 *
 * Idempotent end-to-end:
 *  - re-reads the payable from PG (never trusts the event payload as truth)
 *  - `materializeContractorPayableExpense` dedups by `contractor_payable_id`
 *  - tolerant to the payable already being past `ready_for_finance` (the obligation
 *    bridge may have advanced it) via the COMMITTED_STATES gate in the materializer
 */
export const contractorPayableExpenseMaterializeProjection: ProjectionDefinition = {
  name: 'contractor_payable_expense_materialize',
  description:
    'Materialize the contractor expense (gross, labor_cost_external) when a payable is ready_for_finance (TASK-977).',
  domain: 'finance',
  triggerEvents: [EVENT_TYPES.contractorPayableReadyForFinance],
  extractScope: payload => {
    const contractorPayableId =
      typeof payload.contractorPayableId === 'string' ? payload.contractorPayableId : null

    if (!contractorPayableId) return null

    return { entityType: 'contractor_payable', entityId: contractorPayableId }
  },
  refresh: async scope => {
    const payable = await getContractorPayableById(scope.entityId)

    if (!payable) {
      return `contractor_payable ${scope.entityId} not found; skipped`
    }

    const result = await materializeContractorPayableExpense(payable)

    return `contractor_payable ${payable.publicId} → ${result.reason}`
  },
  maxRetries: 5
}
