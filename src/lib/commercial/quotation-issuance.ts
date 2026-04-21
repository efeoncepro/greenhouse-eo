import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

import { recordAudit } from '@/lib/commercial/governance/audit-log'
import {
  publishQuotationIssued,
  publishQuotationApproved
} from '@/lib/commercial/quotation-events'
import type { QuotationFxSnapshot } from '@/lib/finance/quotation-fx-snapshot'
import { serializeQuotationFxSnapshotForJsonb } from '@/lib/finance/quotation-fx-snapshot'

import { captureSalesContextAtSent } from './sales-context'

type QueryableClient = Pick<PoolClient, 'query'>

export interface QuotationIssuanceActor {
  userId: string
  name: string
}

export interface FinalizeQuotationIssuedParams {
  quotationId: string
  versionNumber: number
  actor: QuotationIssuanceActor
  organizationId?: string | null
  spaceId?: string | null
  pricingModel?: string | null
  commercialModel?: string | null
  staffingModel?: string | null
  viaApproval?: boolean
  client?: QueryableClient

  /**
   * TASK-466 — Canonical FX snapshot frozen at issue time. When present,
   * `persistIssuedState` writes it into `quotations.exchange_rates` (JSONB)
   * and updates `exchange_snapshot_date` so PDF/email/detail consumers read
   * the same payload without re-resolving FX later. Null/undefined means
   * leave the existing FX payload untouched (legacy path).
   */
  fxSnapshot?: QuotationFxSnapshot | null
}

const persistIssuedState = async (
  client: QueryableClient,
  params: FinalizeQuotationIssuedParams
) => {
  await captureSalesContextAtSent({
    quotationId: params.quotationId,
    organizationId: params.organizationId,
    spaceId: params.spaceId,
    client
  })

  await client.query(
    `UPDATE greenhouse_commercial.quotations
        SET status = 'issued',
            issued_at = CURRENT_TIMESTAMP,
            issued_by = $2,
            sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP),
            approved_at = CASE
              WHEN $3::boolean THEN COALESCE(approved_at, CURRENT_TIMESTAMP)
              ELSE approved_at
            END,
            approved_by = CASE
              WHEN $3::boolean THEN COALESCE(approved_by, $2)
              ELSE approved_by
            END,
            approval_rejected_at = NULL,
            approval_rejected_by = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE quotation_id = $1`,
    [params.quotationId, params.actor.userId, params.viaApproval === true]
  )

  if (params.fxSnapshot) {
    const payload = serializeQuotationFxSnapshotForJsonb(params.fxSnapshot)

    const snapshotDate =
      params.fxSnapshot.rateDateResolved ?? params.fxSnapshot.frozenAt.slice(0, 10)

    await client.query(
      `UPDATE greenhouse_commercial.quotations
          SET exchange_rates = $2::jsonb,
              exchange_snapshot_date = $3::date,
              updated_at = CURRENT_TIMESTAMP
        WHERE quotation_id = $1`,
      [params.quotationId, JSON.stringify(payload), snapshotDate]
    )
  }

  await recordAudit(
    {
      quotationId: params.quotationId,
      versionNumber: params.versionNumber,
      action: 'issued',
      actorUserId: params.actor.userId,
      actorName: params.actor.name,
      details: {
        viaApproval: params.viaApproval === true,
        fxSnapshot: params.fxSnapshot
          ? {
              outputCurrency: params.fxSnapshot.outputCurrency,
              baseCurrency: params.fxSnapshot.baseCurrency,
              rate: params.fxSnapshot.rate,
              rateDateResolved: params.fxSnapshot.rateDateResolved,
              source: params.fxSnapshot.source,
              composedViaUsd: params.fxSnapshot.composedViaUsd,
              readinessState: params.fxSnapshot.readinessState,
              ageDays: params.fxSnapshot.ageDays
            }
          : null
      }
    },
    client
  )

  await publishQuotationIssued(
    {
      quotationId: params.quotationId,
      versionNumber: params.versionNumber,
      issuedBy: params.actor.userId,
      postApproval: params.viaApproval === true,
      pricingModel: params.pricingModel ?? null,
      commercialModel: params.commercialModel ?? null,
      staffingModel: params.staffingModel ?? null
    },
    client
  )

  if (params.viaApproval) {
    await publishQuotationApproved(
      {
        quotationId: params.quotationId,
        approvedBy: params.actor.userId,
        pricingModel: params.pricingModel ?? null,
        commercialModel: params.commercialModel ?? null,
        staffingModel: params.staffingModel ?? null
      },
      client
    )
  }
}

export const finalizeQuotationIssued = async (
  params: FinalizeQuotationIssuedParams
) => {
  if (params.client) {
    await persistIssuedState(params.client, params)

    return { quotationId: params.quotationId, newStatus: 'issued' as const }
  }

  return withTransaction(async client => {
    await persistIssuedState(client, { ...params, client })

    return { quotationId: params.quotationId, newStatus: 'issued' as const }
  })
}
