import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { publishQuotationServiceEntryLinked } from '@/lib/commercial/quotation-events'

type QueryableClient = Pick<PoolClient, 'query'>

export interface LinkServiceEntryActor {
  userId: string
  name: string
}

export interface LinkServiceEntryParams {
  hesId: string
  quotationId: string
  actor: LinkServiceEntryActor
}

export interface LinkServiceEntryResult {
  hesId: string
  quotationId: string
  hesNumber: string | null
  amountAuthorizedClp: number | null
}

interface HesRow extends Record<string, unknown> {
  hes_id: string
  hes_number: string | null
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  amount_clp: string | number | null
  amount_authorized_clp: string | number | null
  quotation_id: string | null
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  current_version: number | null
}

/**
 * Links a Service Entry Sheet (HES) to a canonical quotation.
 *
 * Validates both exist and that their clientId/organizationId are consistent,
 * sets `service_entry_sheets.quotation_id`, publishes
 * `commercial.quotation.hes_linked`, and records a `hes_received` audit entry.
 */
export const linkServiceEntryToQuotation = async (
  params: LinkServiceEntryParams
): Promise<LinkServiceEntryResult> => {
  const { hesId, quotationId, actor } = params

  return withTransaction(async (client: QueryableClient) => {
    const hesResult = (await client.query(
      `SELECT hes_id, hes_number, client_id, organization_id, space_id,
              amount_clp, amount_authorized_clp, quotation_id
         FROM greenhouse_finance.service_entry_sheets
         WHERE hes_id = $1
         FOR UPDATE`,
      [hesId]
    )) as { rows: HesRow[] }

    const hes = hesResult.rows[0]

    if (!hes) {
      throw new Error(`HES ${hesId} not found.`)
    }

    const quotationResult = (await client.query(
      `SELECT quotation_id, client_id, organization_id, current_version
         FROM greenhouse_commercial.quotations
         WHERE quotation_id = $1
         LIMIT 1`,
      [quotationId]
    )) as { rows: QuotationRow[] }

    const quotation = quotationResult.rows[0]

    if (!quotation) {
      throw new Error(`Quotation ${quotationId} not found.`)
    }

    if (quotation.client_id && hes.client_id && quotation.client_id !== hes.client_id) {
      throw new Error(
        `Client mismatch between HES (${hes.client_id}) and quotation (${quotation.client_id}).`
      )
    }

    if (
      quotation.organization_id &&
      hes.organization_id &&
      quotation.organization_id !== hes.organization_id
    ) {
      throw new Error(
        `Organization mismatch between HES (${hes.organization_id}) and quotation (${quotation.organization_id}).`
      )
    }

    await client.query(
      `UPDATE greenhouse_finance.service_entry_sheets
         SET quotation_id = $1, updated_at = NOW()
         WHERE hes_id = $2`,
      [quotationId, hesId]
    )

    const amountAuthorizedClp =
      hes.amount_authorized_clp !== null && hes.amount_authorized_clp !== undefined
        ? Number(hes.amount_authorized_clp)
        : hes.amount_clp !== null && hes.amount_clp !== undefined
          ? Number(hes.amount_clp)
          : null

    await publishQuotationServiceEntryLinked(
      {
        quotationId,
        hesId,
        hesNumber: hes.hes_number,
        amountAuthorizedClp,
        linkedBy: actor.userId
      },
      client
    )

    await recordAudit(
      {
        quotationId,
        versionNumber: quotation.current_version ?? null,
        action: 'hes_received',
        actorUserId: actor.userId,
        actorName: actor.name,
        details: {
          hesId,
          hesNumber: hes.hes_number,
          amountAuthorizedClp
        }
      },
      client
    )

    return {
      hesId,
      quotationId,
      hesNumber: hes.hes_number,
      amountAuthorizedClp
    }
  })
}
