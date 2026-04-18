import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { publishQuotationPurchaseOrderLinked } from '@/lib/commercial/quotation-events'

type QueryableClient = Pick<PoolClient, 'query'>

export interface LinkPurchaseOrderActor {
  userId: string
  name: string
}

export interface LinkPurchaseOrderParams {
  poId: string
  quotationId: string
  actor: LinkPurchaseOrderActor
}

export interface LinkPurchaseOrderResult {
  poId: string
  quotationId: string
  poNumber: string | null
  authorizedAmountClp: number | null
}

interface PoRow extends Record<string, unknown> {
  po_id: string
  po_number: string | null
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  authorized_amount_clp: string | number | null
  quotation_id: string | null
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  current_version: number | null
}

/**
 * Links a purchase order to a canonical quotation.
 *
 * Validates both exist and that their clientId/organizationId are consistent,
 * sets `purchase_orders.quotation_id`, publishes `commercial.quotation.po_linked`,
 * and records a `po_received` audit entry.
 */
export const linkPurchaseOrderToQuotation = async (
  params: LinkPurchaseOrderParams
): Promise<LinkPurchaseOrderResult> => {
  const { poId, quotationId, actor } = params

  return withTransaction(async (client: QueryableClient) => {
    const poResult = (await client.query(
      `SELECT po_id, po_number, client_id, organization_id, space_id,
              authorized_amount_clp, quotation_id
         FROM greenhouse_finance.purchase_orders
         WHERE po_id = $1
         FOR UPDATE`,
      [poId]
    )) as { rows: PoRow[] }

    const po = poResult.rows[0]

    if (!po) {
      throw new Error(`Purchase order ${poId} not found.`)
    }

    const quotationResult = (await client.query(
      `SELECT quotation_id, client_id, organization_id, space_id, current_version
         FROM greenhouse_commercial.quotations
         WHERE quotation_id = $1
         LIMIT 1`,
      [quotationId]
    )) as { rows: QuotationRow[] }

    const quotation = quotationResult.rows[0]

    if (!quotation) {
      throw new Error(`Quotation ${quotationId} not found.`)
    }

    if (quotation.client_id && po.client_id && quotation.client_id !== po.client_id) {
      throw new Error(
        `Client mismatch between purchase order (${po.client_id}) and quotation (${quotation.client_id}).`
      )
    }

    if (
      quotation.organization_id &&
      po.organization_id &&
      quotation.organization_id !== po.organization_id
    ) {
      throw new Error(
        `Organization mismatch between purchase order (${po.organization_id}) and quotation (${quotation.organization_id}).`
      )
    }

    await client.query(
      `UPDATE greenhouse_finance.purchase_orders
         SET quotation_id = $1, updated_at = NOW()
         WHERE po_id = $2`,
      [quotationId, poId]
    )

    const authorizedAmountClp =
      po.authorized_amount_clp === null || po.authorized_amount_clp === undefined
        ? null
        : Number(po.authorized_amount_clp)

    await publishQuotationPurchaseOrderLinked(
      {
        quotationId,
        poId,
        poNumber: po.po_number,
        authorizedAmountClp,
        linkedBy: actor.userId
      },
      client
    )

    await recordAudit(
      {
        quotationId,
        versionNumber: quotation.current_version ?? null,
        action: 'po_received',
        actorUserId: actor.userId,
        actorName: actor.name,
        details: {
          poId,
          poNumber: po.po_number,
          authorizedAmountClp
        }
      },
      client
    )

    return {
      poId,
      quotationId,
      poNumber: po.po_number,
      authorizedAmountClp
    }
  })
}
