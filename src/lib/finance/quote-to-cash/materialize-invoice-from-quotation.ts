import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { publishQuotationInvoiceEmitted } from '@/lib/commercial/quotation-events'
import { ensureContractForQuotation } from '@/lib/commercial/contract-lifecycle'
import { materializeContractProfitabilitySnapshots } from '@/lib/commercial-intelligence/contract-profitability-materializer'
import {
  buildIncomeTaxWriteFields,
  parsePersistedIncomeTaxSnapshot,
  serializeIncomeTaxSnapshot
} from '@/lib/finance/income-tax-snapshot'
import { createFinanceIncomeInPostgres } from '@/lib/finance/postgres-store-slice2'

export interface MaterializeInvoiceFromQuotationActor {
  userId: string
  name: string
}

export interface MaterializeInvoiceFromQuotationParams {
  quotationId: string
  actor: MaterializeInvoiceFromQuotationActor
  dueDate?: string | null
}

export interface MaterializeInvoiceFromQuotationResult {
  incomeId: string
  quotationId: string
  contractId: string
  totalAmountClp: number
  quotationStatus: 'converted'
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  client_name_cache: string | null
  status: string
  legacy_status: string | null
  converted_to_income_id: string | null
  current_version: number | null
  total_price: string | number | null
  total_amount: string | number | null
  total_amount_clp: string | number | null
  currency: string | null
  description: string | null
  hubspot_deal_id: string | null
  organization_hubspot_company_id: string | null
  subtotal: string | number | null
  tax_rate: string | number | null
  tax_amount: string | number | null
  tax_code: string | null
  tax_rate_snapshot: string | number | null
  tax_amount_snapshot: string | number | null
  tax_snapshot_json: unknown | null
  tax_snapshot_frozen_at: string | null
}

interface ClientNameRow extends Record<string, unknown> {
  client_name: string | null
}

interface CountRow extends Record<string, unknown> {
  cnt: string | number | null
}

const addDaysToIsoDate = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00Z`)

  d.setUTCDate(d.getUTCDate() + days)

  return d.toISOString().slice(0, 10)
}

const resolveClientName = async (
  client: PoolClient,
  clientId: string | null,
  fallbackCache: string | null
): Promise<string> => {
  if (fallbackCache) return fallbackCache

  if (!clientId) return 'Sin cliente'

  const res = (await client.query(
    `SELECT client_name FROM greenhouse_core.clients WHERE client_id = $1 LIMIT 1`,
    [clientId]
  )) as { rows: ClientNameRow[] }

  return res.rows[0]?.client_name || clientId
}

/**
 * Materializes an income row (invoice) directly from an issued quotation,
 * bypassing the OC/HES enterprise branch. This is the "simple branch" for
 * quote-to-cash — typical of non-enterprise clients without procurement chain.
 *
 * Preconditions:
 *  - Quotation status must be 'issued' (legacy: 'approved'/'sent')
 *  - Quotation must NOT already be converted
 *  - No POs or approved HES may be linked to this quotation (use enterprise branch)
 */
export const materializeInvoiceFromApprovedQuotation = async (
  params: MaterializeInvoiceFromQuotationParams
): Promise<MaterializeInvoiceFromQuotationResult> => {
  const { quotationId, actor } = params

  const result = await withTransaction(async client => {
    // TASK-524: resolve HubSpot anchors so the materialized income inherits
    // the commercial thread. `organization_hubspot_company_id` joins through
    // greenhouse_core.organizations because quotations don't carry
    // `hubspot_company_id` directly — only `hubspot_deal_id`.
    const quotationResult = (await client.query(
      `SELECT q.quotation_id, q.quotation_number, q.client_id, q.organization_id, q.space_id,
              q.client_name_cache, q.status, q.legacy_status, q.converted_to_income_id,
              q.current_version, q.total_price, q.total_amount, q.total_amount_clp,
              q.currency, q.description, q.subtotal,
              q.tax_rate, q.tax_amount, q.tax_code, q.tax_rate_snapshot, q.tax_amount_snapshot,
              q.tax_snapshot_json, q.tax_snapshot_frozen_at,
              q.hubspot_deal_id,
              o.hubspot_company_id AS organization_hubspot_company_id
         FROM greenhouse_commercial.quotations q
         LEFT JOIN greenhouse_core.organizations o
           ON o.organization_id = q.organization_id
         WHERE q.quotation_id = $1
         FOR UPDATE OF q`,
      [quotationId]
    )) as { rows: QuotationRow[] }

    const quotation = quotationResult.rows[0]

    if (!quotation) {
      throw new Error(`Quotation ${quotationId} not found.`)
    }

    if (quotation.converted_to_income_id || quotation.status === 'converted') {
      throw new Error(
        `Quotation ${quotationId} already converted to income ${quotation.converted_to_income_id ?? '(unknown)'}.`
      )
    }

    const allowedStatuses = new Set(['issued', 'approved', 'sent'])

    if (!allowedStatuses.has(quotation.status)) {
      throw new Error(
        `Quotation ${quotationId} must be in status 'issued' (legacy: 'approved' or 'sent') (current: ${quotation.status}).`
      )
    }

    // Enterprise branch guard: if any POs or approved HES are linked, force
    // caller to materialize via the HES branch for proper chain accounting.
    const poCountResult = (await client.query(
      `SELECT COUNT(*)::text AS cnt
         FROM greenhouse_finance.purchase_orders
         WHERE quotation_id = $1`,
      [quotationId]
    )) as { rows: CountRow[] }

    const poCount = Number(poCountResult.rows[0]?.cnt ?? 0)

    if (poCount > 0) {
      throw new Error(
        `Quotation ${quotationId} has ${poCount} linked purchase order(s); use the enterprise branch (approve HES and materialize from it) instead.`
      )
    }

    const hesCountResult = (await client.query(
      `SELECT COUNT(*)::text AS cnt
         FROM greenhouse_finance.service_entry_sheets
         WHERE quotation_id = $1
           AND status = 'approved'`,
      [quotationId]
    )) as { rows: CountRow[] }

    const hesCount = Number(hesCountResult.rows[0]?.cnt ?? 0)

    if (hesCount > 0) {
      throw new Error(
        `Quotation ${quotationId} has ${hesCount} approved HES; use the enterprise branch instead.`
      )
    }

    const incomeId = `INC-${randomUUID().slice(0, 8)}`

    const totalAmountRaw = quotation.total_price ?? quotation.total_amount ?? quotation.total_amount_clp ?? 0
    const totalAmountClpRaw = quotation.total_amount_clp ?? quotation.total_price ?? quotation.total_amount ?? 0
    const subtotal = Number(quotation.subtotal ?? totalAmountRaw)
    const currency = quotation.currency || 'CLP'
    const invoiceDate = new Date().toISOString().slice(0, 10)
    const dueDate = params.dueDate || addDaysToIsoDate(invoiceDate, 30)
    const sourceTaxSnapshot = parsePersistedIncomeTaxSnapshot(quotation.tax_snapshot_json)

    const taxWriteFields = await buildIncomeTaxWriteFields({
      subtotal,
      taxCode: quotation.tax_code,
      taxRate: quotation.tax_rate_snapshot != null
        ? Number(quotation.tax_rate_snapshot)
        : quotation.tax_rate != null
          ? Number(quotation.tax_rate)
          : null,
      taxAmount: quotation.tax_amount_snapshot != null
        ? Number(quotation.tax_amount_snapshot)
        : quotation.tax_amount != null
          ? Number(quotation.tax_amount)
          : null,
      totalAmount: totalAmountRaw != null ? Number(totalAmountRaw) : null,
      sourceSnapshot: sourceTaxSnapshot,
      issuedAt: quotation.tax_snapshot_frozen_at ?? invoiceDate
    })

    const totalAmount = taxWriteFields.totalAmount

    const totalAmountClp = currency === 'CLP'
      ? totalAmount
      : Number(totalAmountClpRaw ?? totalAmount)

    const exchangeRateToClp = totalAmount > 0
      ? totalAmountClp / totalAmount
      : 1

    const clientName = await resolveClientName(
      client,
      quotation.client_id,
      quotation.client_name_cache
    )

    await client.query(
      `UPDATE greenhouse_commercial.quotations
         SET status = 'converted',
             converted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE quotation_id = $1`,
      [quotationId]
    )

    const contract = await ensureContractForQuotation({
      quotationId,
      actor,
      client
    })

    await createFinanceIncomeInPostgres({
      incomeId,
      clientId: quotation.client_id,
      organizationId: quotation.organization_id,
      clientProfileId: null,
      hubspotCompanyId: quotation.organization_hubspot_company_id,
      hubspotDealId: quotation.hubspot_deal_id,
      clientName,
      invoiceNumber: quotation.quotation_number,
      invoiceDate,
      dueDate,
      description: quotation.description,
      currency,
      subtotal,
      taxRate: taxWriteFields.taxRate,
      taxAmount: taxWriteFields.taxAmount,
      taxCode: taxWriteFields.taxCode,
      taxRateSnapshot: taxWriteFields.taxRateSnapshot,
      taxAmountSnapshot: taxWriteFields.taxAmountSnapshot,
      taxSnapshotJson: serializeIncomeTaxSnapshot(taxWriteFields.taxSnapshot),
      isTaxExempt: taxWriteFields.isTaxExempt,
      taxSnapshotFrozenAt: taxWriteFields.taxSnapshotFrozenAt,
      totalAmount,
      exchangeRateToClp,
      totalAmountClp,
      paymentStatus: 'pending',
      quotationId,
      contractId: contract.contractId,
      sourceHesId: null,
      purchaseOrderId: null,
      hesId: null,
      poNumber: null,
      hesNumber: null,
      serviceLine: null,
      incomeType: 'service_fee',
      partnerId: null,
      partnerName: null,
      partnerSharePercent: null,
      partnerShareAmount: null,
      netAfterPartner: null,
      notes: null,
      actorUserId: actor.userId
    }, { client })

    await client.query(
      `UPDATE greenhouse_commercial.quotations
         SET converted_to_income_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE quotation_id = $2`,
      [incomeId, quotationId]
    )

    await publishQuotationInvoiceEmitted(
      {
        quotationId,
        incomeId,
        sourceHesId: null,
        totalAmountClp,
        emittedBy: actor.userId
      },
      client
    )

    await recordAudit(
      {
        quotationId,
        versionNumber: quotation.current_version ?? null,
        action: 'invoice_triggered',
        actorUserId: actor.userId,
        actorName: actor.name,
        details: {
          incomeId,
          totalAmountClp,
          branch: 'simple'
        }
      },
      client
    )

    await recordAudit(
      {
        quotationId,
        versionNumber: quotation.current_version ?? null,
        action: 'status_changed',
        actorUserId: actor.userId,
        actorName: actor.name,
        details: {
          fromStatus: quotation.status,
          toStatus: 'converted',
          incomeId
        }
      },
      client
    )

    return {
      incomeId,
      quotationId,
      contractId: contract.contractId,
      totalAmountClp,
      quotationStatus: 'converted' as const
    }
  })

  await materializeContractProfitabilitySnapshots({ contractId: result.contractId })

  return result
}
