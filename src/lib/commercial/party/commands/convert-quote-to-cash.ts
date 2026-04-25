import 'server-only'

import { randomUUID } from 'node:crypto'

import { ensureContractForQuotation } from '@/lib/commercial/contract-lifecycle'
import { publishDealWon } from '@/lib/commercial/deal-events'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { withTransaction } from '@/lib/db'

import { instantiateClientForParty } from './instantiate-client-for-party'
import { promoteParty } from './promote-party'
import {
  completeOperation,
  findCompletedOperationForQuotation,
  startCorrelatedOperation
} from './commercial-operations-audit'
import {
  publishQuoteToCashApprovalRequested,
  publishQuoteToCashCompleted,
  publishQuoteToCashFailed,
  publishQuoteToCashStarted
} from './quote-to-cash-events'
import {
  QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP,
  QuoteToCashApprovalRequiredError,
  QuoteToCashMissingAnchorsError,
  QuotationNotConvertibleError,
  QuotationNotFoundError,
  type ConvertQuoteToCashInput,
  type ConvertQuoteToCashResult
} from './convert-quote-to-cash-types'

// TASK-541 (Fase G): atomic quote-to-cash choreography.
//
// Contract:
//  - Single `withTransaction` covers the lock, state transitions, contract
//    create, client instantiation, party promotion, and all event emits.
//  - `ensureContractForQuotation` is already idempotent; this command calls
//    it INSIDE the transaction so rollbacks are clean on contract failures.
//  - Every event emitted during the op carries the same `correlationId` in
//    the payload so support can reconstruct the cross-aggregate narrative.
//  - Idempotent: a second call against an already-`converted` quote returns
//    the previous audit row without re-executing. No rows are mutated twice.
//  - Rate-limit not enforced here (the entry points — API route, projection
//    — own that concern with their own substrates).
//
// Scope NOT covered here (follow-ups):
//  - Income materialization — stays with `materializeInvoiceFromApprovedQuotation`.
//  - Outbound write of `deal.won` to HubSpot — TASK-540.
//  - Generic approval workflow for deals/quote-to-cash — follow-up.

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string | null
  status: string
  organization_id: string | null
  client_id: string | null
  space_id: string | null
  hubspot_deal_id: string | null
  total_amount_clp: string | number | null
  total_amount: string | number | null
  currency: string | null
  converted_to_income_id: string | null
  converted_at: string | null

  /** Joined from organizations to know whether the party needs promotion. */
  organization_lifecycle_stage: string | null
}

const CONVERTIBLE_STATUSES = new Set(['issued', 'sent', 'approved'])

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const lockQuotation = async (
  client: QueryableClient,
  quotationId: string
): Promise<QuotationRow | null> => {
  const result = await client.query<QuotationRow>(
    `SELECT q.quotation_id,
            q.quotation_number,
            q.status,
            q.organization_id,
            q.client_id,
            q.space_id,
            q.hubspot_deal_id,
            q.total_amount_clp,
            q.total_amount,
            q.currency,
            q.converted_to_income_id,
            q.converted_at::text AS converted_at,
            o.lifecycle_stage AS organization_lifecycle_stage
       FROM greenhouse_commercial.quotations q
       LEFT JOIN greenhouse_core.organizations o
         ON o.organization_id = q.organization_id
       WHERE q.quotation_id = $1
       FOR UPDATE OF q`,
    [quotationId]
  )

  return result.rows[0] ?? null
}

const transitionQuotationToConverted = async (
  client: QueryableClient,
  quotationId: string
): Promise<void> => {
  await client.query(
    `UPDATE greenhouse_commercial.quotations
        SET status = 'converted',
            converted_at = COALESCE(converted_at, NOW()),
            updated_at = NOW()
      WHERE quotation_id = $1
        AND status IN ('issued', 'sent', 'approved')`,
    [quotationId]
  )
}

const publishQuotationConvertedEvent = async (
  client: QueryableClient,
  input: {
    quotationId: string
    organizationId: string | null
    correlationId: string
    contractId: string
    operationId: string
  }
): Promise<void> => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: input.quotationId,
      eventType: EVENT_TYPES.quotationConverted,
      payload: {
        quotationId: input.quotationId,
        organizationId: input.organizationId,
        contractId: input.contractId,
        correlationId: input.correlationId,
        operationId: input.operationId,
        convertedAt: new Date().toISOString(),
        source: 'quote_to_cash_choreography'
      }
    },
    client
  )
}

export const convertQuoteToCash = async (
  input: ConvertQuoteToCashInput
): Promise<ConvertQuoteToCashResult> => {
  if (!input.quotationId?.trim()) {
    throw new QuotationNotFoundError(input.quotationId ?? '(missing)')
  }

  const quotationId = input.quotationId.trim()

  return withTransaction(async client => {
    const quotation = await lockQuotation(client, quotationId)

    if (!quotation) {
      throw new QuotationNotFoundError(quotationId)
    }

    const totalAmountClp =
      toNum(quotation.total_amount_clp) ?? toNum(quotation.total_amount) ?? 0

    // Idempotency: the same quote has already been processed. Return the
    // prior audit row so callers can retry safely.
    if (quotation.status === 'converted' || quotation.converted_to_income_id) {
      const priorOp = await findCompletedOperationForQuotation(client, quotationId)

      if (priorOp) {
        return {
          operationId: priorOp.operation_id,
          correlationId: priorOp.correlation_id,
          status: priorOp.status === 'pending_approval' ? 'pending_approval' : 'idempotent_hit',
          quotationId,
          contractId: priorOp.contract_id,
          clientId: priorOp.client_id,
          organizationId: priorOp.organization_id,
          hubspotDealId: priorOp.hubspot_deal_id,
          organizationPromoted: false,
          clientInstantiated: false,
          dealWonEmitted: false,
          requiresApproval: priorOp.status === 'pending_approval',
          approvalId: priorOp.approval_id,
          message: `Idempotent hit — quotation already processed (operation ${priorOp.operation_id}).`
        }
      }

      // Converted quote with no audit row: unusual (pre-Fase-G conversion via
      // the income materializer). Start a synthetic audit so the conversion
      // is traceable and short-circuit without re-running the choreography.
      const { operationId, correlationId } = await startCorrelatedOperation(client, {
        correlationId: input.correlationId,
        operationType: 'quote_to_cash',
        triggerSource: input.conversionTriggeredBy,
        actorUserId: input.actor.userId,
        tenantScope: input.actor.tenantScope,
        quotationId,
        organizationId: quotation.organization_id,
        hubspotDealId: quotation.hubspot_deal_id,
        totalAmountClp,
        metadata: { reason: 'legacy_converted_quote_with_no_audit' }
      })

      await completeOperation(client, operationId, {
        status: 'idempotent_hit',
        metadataPatch: { legacyConvertedAt: quotation.converted_at }
      })

      return {
        operationId,
        correlationId,
        status: 'idempotent_hit',
        quotationId,
        contractId: null,
        clientId: quotation.client_id,
        organizationId: quotation.organization_id,
        hubspotDealId: quotation.hubspot_deal_id,
        organizationPromoted: false,
        clientInstantiated: false,
        dealWonEmitted: false,
        requiresApproval: false,
        approvalId: null,
        message: 'Quote already converted before Fase G audit substrate existed.'
      }
    }

    if (!CONVERTIBLE_STATUSES.has(quotation.status)) {
      throw new QuotationNotConvertibleError(quotationId, quotation.status)
    }

    if (!quotation.organization_id) {
      throw new QuoteToCashMissingAnchorsError(quotationId)
    }

    // Threshold gate — dual approval required. Persist the approval request
    // as part of the audit and bail out; the generic approval workflow
    // (follow-up) will resume the choreography by calling this command
    // again with `skipApprovalGate: true`.
    const thresholdExceeded =
      totalAmountClp > QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP && !input.skipApprovalGate

    const { operationId, correlationId } = await startCorrelatedOperation(client, {
      correlationId: input.correlationId,
      operationType: 'quote_to_cash',
      triggerSource: input.conversionTriggeredBy,
      actorUserId: input.actor.userId,
      tenantScope: input.actor.tenantScope,
      quotationId,
      organizationId: quotation.organization_id,
      hubspotDealId: quotation.hubspot_deal_id ?? input.hubspotDealId ?? null,
      totalAmountClp,
      metadata: {
        quotationStatus: quotation.status,
        currency: quotation.currency,
        quotationNumber: quotation.quotation_number
      }
    })

    await publishQuoteToCashStarted(
      {
        operationId,
        correlationId,
        quotationId,
        organizationId: quotation.organization_id,
        hubspotDealId: quotation.hubspot_deal_id ?? input.hubspotDealId ?? null,
        triggerSource: input.conversionTriggeredBy,
        actorUserId: input.actor.userId,
        totalAmountClp,
        startedAt: new Date().toISOString()
      },
      client
    )

    if (thresholdExceeded) {
      const approvalId = `qtc-approval-${randomUUID()}`

      await completeOperation(client, operationId, {
        status: 'pending_approval',
        approvalId,
        metadataPatch: { thresholdClp: QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP }
      })

      await publishQuoteToCashApprovalRequested(
        {
          operationId,
          correlationId,
          quotationId,
          organizationId: quotation.organization_id,
          hubspotDealId: quotation.hubspot_deal_id ?? input.hubspotDealId ?? null,
          triggerSource: input.conversionTriggeredBy,
          actorUserId: input.actor.userId,
          totalAmountClp,
          approvalId,
          thresholdClp: QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP,
          requestedAt: new Date().toISOString()
        },
        client
      )

      throw new QuoteToCashApprovalRequiredError(
        quotationId,
        totalAmountClp,
        QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP,
        approvalId
      )
    }

    try {
      // Step 1 — transition quote → converted. Must happen before the
      // contract lifecycle helper so the derived contract status is `active`.
      await transitionQuotationToConverted(client, quotationId)

      // Step 2 — create or reuse the contract.
      const contract = await ensureContractForQuotation({
        quotationId,
        actor: { userId: input.actor.userId, name: input.actor.name ?? input.actor.userId },
        client
      })

      // Step 3 — promote party + (side-effect) instantiate client if missing.
      //   promoteParty → `active_client` internally calls instantiateClientForParty.
      //   If the org is already `active_client` we skip the promotion.
      let organizationPromoted = false
      let clientInstantiated = false

      if (quotation.organization_lifecycle_stage !== 'active_client') {
        try {
          await promoteParty(
            {
              organizationId: quotation.organization_id,
              toStage: 'active_client',
              source: 'quote_converted',
              actor: {
                userId: input.actor.userId,
                reason: `Quote-to-cash conversion (op ${operationId})`
              },
              triggerEntity: { type: 'contract', id: contract.contractId },
              metadata: { correlationId, operationId }
            },
            client
          )
          organizationPromoted = true
        } catch (error) {
          // If the promotion hits an invalid transition (e.g. org is in
          // `provider_only`), abort the whole op — data is rolled back.
          throw error
        }
      }

      // Step 4 — if the org had no client yet, the promotion already
      // instantiated it via side-effect. If the promotion was skipped
      // (already active_client) and the quote has no client_id, instantiate
      // now.
      if (!quotation.client_id && !organizationPromoted) {
        try {
          await instantiateClientForParty(
            {
              organizationId: quotation.organization_id,
              triggerEntity: { type: 'contract', id: contract.contractId },
              actor: { userId: input.actor.userId }
            },
            client
          )
          clientInstantiated = true
        } catch (error) {
          const alreadyHas =
            typeof error === 'object'
            && error !== null
            && 'code' in error
            && (error as { code?: string }).code === 'ORGANIZATION_ALREADY_HAS_CLIENT'

          if (!alreadyHas) throw error
        }
      } else if (organizationPromoted) {
        clientInstantiated = !quotation.client_id
      }

      // Step 5 — canonical quotation.converted event with the correlation id.
      await publishQuotationConvertedEvent(client, {
        quotationId,
        organizationId: quotation.organization_id,
        correlationId,
        contractId: contract.contractId,
        operationId
      })

      // Step 6 — deal.won local event (downstream MRR, cost attribution).
      // We only re-emit when the trigger was NOT the inbound sync — in that
      // case the sync already emitted it before this command ran.
      let dealWonEmitted = false

      if (
        quotation.hubspot_deal_id
        && input.conversionTriggeredBy !== 'deal_won_hubspot'
      ) {
        await publishDealWon(
          {
            dealId: `correlated-${correlationId}`,
            hubspotDealId: quotation.hubspot_deal_id,
            hubspotPipelineId: null,
            dealstage: 'closedwon',
            clientId: quotation.client_id,
            organizationId: quotation.organization_id,
            spaceId: quotation.space_id,
            amountClp: totalAmountClp,
            closeDate: new Date().toISOString().slice(0, 10)
          },
          client
        )
        dealWonEmitted = true
      }

      // Step 7 — finalize the audit row and emit the choreography-level
      // completed event.
      const resolvedClientId =
        quotation.client_id

        // Best-effort — we don't re-load the client row here; the promotion/
        // instantiation side-effects wrote it inside the same tx. Callers
        // that need the exact `client_id` can read from the audit row.
        ?? null

      await completeOperation(client, operationId, {
        status: 'completed',
        contractId: contract.contractId,
        clientId: resolvedClientId,
        metadataPatch: {
          contractStatus: contract.status,
          contractNumber: contract.contractNumber,
          organizationPromoted,
          clientInstantiated,
          dealWonEmitted
        }
      })

      await publishQuoteToCashCompleted(
        {
          operationId,
          correlationId,
          quotationId,
          organizationId: quotation.organization_id,
          hubspotDealId: quotation.hubspot_deal_id ?? input.hubspotDealId ?? null,
          triggerSource: input.conversionTriggeredBy,
          actorUserId: input.actor.userId,
          totalAmountClp,
          contractId: contract.contractId,
          clientId: resolvedClientId ?? '',
          organizationPromoted,
          clientInstantiated,
          dealWonEmitted,
          completedAt: new Date().toISOString()
        },
        client
      )

      return {
        operationId,
        correlationId,
        status: 'completed',
        quotationId,
        contractId: contract.contractId,
        clientId: resolvedClientId,
        organizationId: quotation.organization_id,
        hubspotDealId: quotation.hubspot_deal_id ?? input.hubspotDealId ?? null,
        organizationPromoted,
        clientInstantiated,
        dealWonEmitted,
        requiresApproval: false,
        approvalId: null,
        message: organizationPromoted
          ? 'Quote converted, contract activated, party promoted to active_client.'
          : 'Quote converted, contract activated.'
      }
    } catch (error) {
      const code = error instanceof Error && 'code' in error && typeof (error as { code?: string }).code === 'string'
        ? (error as { code?: string }).code ?? 'UNKNOWN'
        : 'UNKNOWN'

      const message = error instanceof Error ? error.message : String(error)

      // Best-effort audit + event emission before the transaction aborts.
      // These writes are part of the same tx so they rollback too — but we
      // still try so the outer catch at the API layer can introspect them.
      try {
        await completeOperation(client, operationId, {
          status: 'failed',
          errorCode: code,
          errorMessage: message
        })

        await publishQuoteToCashFailed(
          {
            operationId,
            correlationId,
            quotationId,
            organizationId: quotation.organization_id,
            hubspotDealId: quotation.hubspot_deal_id ?? input.hubspotDealId ?? null,
            triggerSource: input.conversionTriggeredBy,
            actorUserId: input.actor.userId,
            totalAmountClp,
            errorCode: code,
            errorMessage: message,
            failedAt: new Date().toISOString()
          },
          client
        )
      } catch {
        // Swallow — the outer transaction will rollback regardless.
      }

      throw error
    }
  })
}
