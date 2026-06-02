import 'server-only'

import {
  getContractorPayableById,
  markPayableObligationCreated
} from '@/lib/contractor-engagements/payables/store'
import { createPaymentObligation } from '@/lib/finance/payment-obligations/create-obligation'
import { captureWithDomain } from '@/lib/observability/capture'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

const FINANCE_CURRENCIES = new Set(['CLP', 'USD'])
const BRIDGE_ACTOR = 'system:contractor-payable-bridge'

/**
 * TASK-793 Slice 3 — Contractor payable → Finance payment_obligation bridge.
 *
 * When a payable reaches `ready_for_finance`, materialize exactly ONE
 * payment_obligation (source_kind='contractor_payable', amount=net_payable) and
 * mark the payable `obligation_created`. Finance remains the owner of payment
 * orders + bank settlement downstream.
 *
 * Idempotent end-to-end:
 *  - re-reads the payable from PG (never trusts the event payload as truth)
 *  - skips when the payable is gone / no longer `ready_for_finance`
 *  - createPaymentObligation dedups via its UNIQUE idempotency index
 *    (source_kind + source_ref=payableId + obligation_kind + beneficiary_id)
 *  - markPayableObligationCreated is a no-op when already linked to the same id
 */
export const contractorPayableFinanceObligationProjection: ProjectionDefinition = {
  name: 'contractor_payable_finance_obligation',
  description:
    'Materialize a Finance payment_obligation when a contractor payable is ready_for_finance (TASK-793).',
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

    if (payable.status !== 'ready_for_finance') {
      return `contractor_payable ${payable.publicId} status=${payable.status}; skipped (idempotent)`
    }

    const obligationCurrency = payable.paymentCurrency ?? payable.currency

    if (!FINANCE_CURRENCIES.has(obligationCurrency)) {
      // Should be impossible: readiness gate blocks unsupported currencies.
      captureWithDomain(
        new Error(`unsupported obligation currency ${obligationCurrency}`),
        'finance',
        {
          tags: { source: 'contractor_payable_bridge' },
          extra: { contractorPayableId: payable.contractorPayableId, obligationCurrency }
        }
      )

      return `contractor_payable ${payable.publicId} unsupported currency ${obligationCurrency}; skipped`
    }

    const result = await createPaymentObligation({
      sourceKind: 'contractor_payable',
      sourceRef: payable.contractorPayableId,
      beneficiaryType: payable.beneficiaryType,
      beneficiaryId: payable.beneficiaryId,
      obligationKind: 'provider_payroll',
      amount: payable.netPayable,
      currency: obligationCurrency as 'CLP' | 'USD',
      dueDate: payable.dueDate ?? undefined,
      metadata: {
        contractorPayableId: payable.contractorPayableId,
        contractorEngagementId: payable.contractorEngagementId,
        payablePublicId: payable.publicId,
        payableSourceKind: payable.payableSourceKind,
        grossAmount: payable.grossAmount,
        withholdingAmount: payable.withholdingAmount,
        payrollVia: payable.payrollVia,
        taxComplianceOwner: payable.taxComplianceOwner
      }
    })

    await markPayableObligationCreated({
      contractorPayableId: payable.contractorPayableId,
      financeObligationId: result.obligation.obligationId,
      actorUserId: BRIDGE_ACTOR
    })

    return (
      `contractor_payable ${payable.publicId} → obligation ${result.obligation.obligationId} ` +
      `(${result.created ? 'created' : 'duplicate'})`
    )
  },
  maxRetries: 5
}
