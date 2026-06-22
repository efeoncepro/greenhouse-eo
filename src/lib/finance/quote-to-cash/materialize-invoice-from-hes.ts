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
import { FinanceValidationError } from '@/lib/finance/shared'
import { buildClfIncomeProjection } from '@/lib/finance/multi-currency/clf-income-projection'
import { persistFxSnapshot } from '@/lib/finance/multi-currency/fx-snapshot-store'
import { isFinanceClfIncomeProjectionEnabled } from '@/lib/finance/multi-currency/flags'

export interface MaterializeInvoiceFromHesActor {
  userId: string
  name: string
}

export interface MaterializeInvoiceFromHesParams {
  hesId: string
  actor: MaterializeInvoiceFromHesActor
  dueDate?: string | null
}

export interface MaterializeInvoiceFromHesResult {
  incomeId: string
  quotationId: string
  contractId: string
  sourceHesId: string
  totalAmountClp: number
}

/**
 * TASK-1206 — resultado del primitive idempotente de income (enterprise/HES branch). NO marca
 * la cotización `converted` ni crea el contrato (eso lo hace `convertQuoteToCash` después, vía
 * `closeQuoteToCash`). `created=false` en un replay (la HES ya estaba materializada) — NUNCA un
 * segundo income.
 */
export interface EnsureIncomeFromHesResult {
  incomeId: string
  quotationId: string
  sourceHesId: string
  totalAmountClp: number
  created: boolean
}

interface HesRow extends Record<string, unknown> {
  hes_id: string
  hes_number: string
  purchase_order_id: string | null
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  service_description: string | null
  amount: string | number | null
  currency: string | null
  amount_clp: string | number | null
  amount_authorized_clp: string | number | null
  status: string
  income_id: string | null
  quotation_id: string | null
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  client_name_cache: string | null
  status: string
  converted_to_income_id: string | null
  current_version: number | null
  hubspot_deal_id: string | null
  organization_hubspot_company_id: string | null
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

/** Campos de escritura del income, sin `incomeId`/`contractId` (los inyecta cada caller). */
type HesIncomeWriteFields = Omit<
  Parameters<typeof createFinanceIncomeInPostgres>[0],
  'incomeId' | 'contractId'
>

const HES_SELECT_SQL = `
  SELECT hes_id, hes_number, purchase_order_id, client_id, organization_id, space_id,
         service_description, amount, currency, amount_clp, amount_authorized_clp,
         status, income_id, quotation_id
    FROM greenhouse_finance.service_entry_sheets
    WHERE hes_id = $1
    FOR UPDATE`

const QUOTATION_FOR_HES_SELECT_SQL = `
  SELECT q.quotation_id, q.client_id, q.organization_id, q.space_id, q.client_name_cache,
         q.status, q.converted_to_income_id, q.current_version,
         q.tax_rate, q.tax_amount, q.tax_code, q.tax_rate_snapshot, q.tax_amount_snapshot,
         q.tax_snapshot_json, q.tax_snapshot_frozen_at,
         q.hubspot_deal_id,
         o.hubspot_company_id AS organization_hubspot_company_id
    FROM greenhouse_commercial.quotations q
    LEFT JOIN greenhouse_core.organizations o
      ON o.organization_id = q.organization_id
    WHERE q.quotation_id = $1
    FOR UPDATE OF q`

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
 * Fuente ÚNICA de la construcción de los campos del income desde una HES aprobada (tax snapshot
 * + rama CLF + nombre de cliente). Usado por el materializer legacy y por el primitive
 * idempotente. Devuelve los campos SIN `incomeId`/`contractId` y el `totalAmountClp` pre-CLF.
 */
const buildHesIncomeWriteFields = async (
  client: PoolClient,
  hes: HesRow,
  quotation: QuotationRow,
  dueDateParam: string | null | undefined
): Promise<{ writeFields: HesIncomeWriteFields; totalAmountClp: number }> => {
  const totalAmountClpRaw = hes.amount_authorized_clp !== null && hes.amount_authorized_clp !== undefined
    ? Number(hes.amount_authorized_clp)
    : Number(hes.amount_clp ?? 0)

  const subtotal = Number(hes.amount ?? hes.amount_clp ?? totalAmountClpRaw)
  const currency = hes.currency || 'CLP'
  const invoiceDate = new Date().toISOString().slice(0, 10)
  const dueDate = dueDateParam || addDaysToIsoDate(invoiceDate, 30)
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
    sourceSnapshot: sourceTaxSnapshot,
    issuedAt: quotation.tax_snapshot_frozen_at ?? invoiceDate
  })

  const totalAmount = taxWriteFields.totalAmount

  const totalAmountClp = currency === 'CLP'
    ? totalAmount
    : totalAmountClpRaw

  const exchangeRateToClp = totalAmount > 0
    ? totalAmountClp / totalAmount
    : 1

  // TASK-995 — una HES / OC de cliente en CLF (UF) se proyecta a CLP + plano native UF.
  let finalCurrency = currency
  let finalSubtotal = subtotal
  let finalTaxWriteFields = taxWriteFields
  let finalTotalAmount = totalAmount
  let finalTotalAmountClp = totalAmountClp
  let finalExchangeRateToClp = exchangeRateToClp
  let nativeAmount: number | null = null
  let nativeCurrency: string | null = null
  let nativeToFunctionalFxSnapshotId: string | null = null

  if (currency === 'CLF' && isFinanceClfIncomeProjectionEnabled()) {
    const projection = await buildClfIncomeProjection({
      subtotalClf: subtotal,
      taxAmountClf: taxWriteFields.taxAmount,
      totalClf: totalAmount,
      rateDate: invoiceDate
    })

    if (!projection) {
      throw new FinanceValidationError(
        'No hay valor UF para proyectar la HES/OC CLF a CLP en la fecha de emisión.'
      )
    }

    nativeToFunctionalFxSnapshotId = await persistFxSnapshot(projection.fxSnapshotEvidence, client)
    finalTaxWriteFields = await buildIncomeTaxWriteFields({
      subtotal: projection.functionalSubtotalClp,
      taxCode: quotation.tax_code,
      taxAmount: projection.functionalTaxAmountClp,
      totalAmount: projection.functionalTotalClp,
      issuedAt: invoiceDate
    })
    finalCurrency = 'CLP'
    finalSubtotal = projection.functionalSubtotalClp
    finalTotalAmount = finalTaxWriteFields.totalAmount
    finalTotalAmountClp = finalTaxWriteFields.totalAmount
    finalExchangeRateToClp = 1
    nativeAmount = projection.nativeAmountClf
    nativeCurrency = 'CLF'
  }

  const clientName = await resolveClientName(
    client,
    hes.client_id,
    quotation.client_name_cache
  )

  const writeFields: HesIncomeWriteFields = {
    clientId: hes.client_id,
    organizationId: hes.organization_id,
    clientProfileId: null,
    hubspotCompanyId: quotation.organization_hubspot_company_id,
    hubspotDealId: quotation.hubspot_deal_id,
    clientName,
    invoiceNumber: hes.hes_number,
    invoiceDate,
    dueDate,
    description: hes.service_description,
    currency: finalCurrency,
    subtotal: finalSubtotal,
    taxRate: finalTaxWriteFields.taxRate,
    taxAmount: finalTaxWriteFields.taxAmount,
    taxCode: finalTaxWriteFields.taxCode,
    taxRateSnapshot: finalTaxWriteFields.taxRateSnapshot,
    taxAmountSnapshot: finalTaxWriteFields.taxAmountSnapshot,
    taxSnapshotJson: serializeIncomeTaxSnapshot(finalTaxWriteFields.taxSnapshot),
    isTaxExempt: finalTaxWriteFields.isTaxExempt,
    taxSnapshotFrozenAt: finalTaxWriteFields.taxSnapshotFrozenAt,
    totalAmount: finalTotalAmount,
    exchangeRateToClp: finalExchangeRateToClp,
    totalAmountClp: finalTotalAmountClp,
    nativeAmount,
    nativeCurrency,
    nativeToFunctionalFxSnapshotId,
    paymentStatus: 'pending',
    quotationId: quotation.quotation_id,
    sourceHesId: hes.hes_id,
    purchaseOrderId: hes.purchase_order_id,
    hesId: hes.hes_id,
    poNumber: null,
    hesNumber: hes.hes_number,
    serviceLine: null,
    incomeType: 'service_fee',
    partnerId: null,
    partnerName: null,
    partnerSharePercent: null,
    partnerShareAmount: null,
    netAfterPartner: null,
    notes: null,
    actorUserId: null
  }

  return { writeFields, totalAmountClp }
}

const loadHesAndQuotation = async (
  client: PoolClient,
  hesId: string
): Promise<{ hes: HesRow; quotation: QuotationRow; quotationId: string }> => {
  const hesResult = (await client.query(HES_SELECT_SQL, [hesId])) as { rows: HesRow[] }

  const hes = hesResult.rows[0]

  if (!hes) {
    throw new Error(`HES ${hesId} not found.`)
  }

  if (hes.status !== 'approved') {
    throw new Error(`HES ${hesId} must be approved (current status: ${hes.status}).`)
  }

  if (!hes.quotation_id) {
    throw new Error(`HES ${hesId} has no quotation_id; link it to a quotation first.`)
  }

  const quotationId = hes.quotation_id

  const quotationResult = (await client.query(QUOTATION_FOR_HES_SELECT_SQL, [quotationId])) as {
    rows: QuotationRow[]
  }

  const quotation = quotationResult.rows[0]

  if (!quotation) {
    throw new Error(`Quotation ${quotationId} not found.`)
  }

  return { hes, quotation, quotationId }
}

/**
 * Materializes an income row (invoice) from an approved HES, closing the
 * enterprise branch of the quotation-to-cash chain.
 *
 * Preconditions:
 *  - HES.status must be 'approved'
 *  - HES.quotation_id must be set (HES linked to a canonical quotation)
 *  - HES.income_id must be null (not already materialized)
 *
 * NOTE (TASK-1206): este materializer legacy mantiene su contrato externo (income + HES
 * marcada + cotización converted + contrato en una tx, 409 si ya materializada) y sigue
 * detrás de `/api/finance/hes/[id]/approve`. El camino canónico nuevo es el primitive
 * idempotente `ensureIncomeFromHes` orquestado por `closeQuoteToCash`.
 */
export const materializeInvoiceFromApprovedHes = async (
  params: MaterializeInvoiceFromHesParams
): Promise<MaterializeInvoiceFromHesResult> => {
  const { hesId, actor } = params

  const result = await withTransaction(async client => {
    const { hes, quotation, quotationId } = await loadHesAndQuotation(client, hesId)

    if (hes.income_id) {
      throw new Error(
        `HES ${hesId} already materialized into income ${hes.income_id}.`
      )
    }

    const incomeId = `INC-${randomUUID().slice(0, 8)}`
    const { writeFields, totalAmountClp } = await buildHesIncomeWriteFields(client, hes, quotation, params.dueDate)

    const contract = await ensureContractForQuotation({
      quotationId,
      actor,
      client
    })

    await createFinanceIncomeInPostgres(
      {
        ...writeFields,
        incomeId,
        contractId: contract.contractId,
        actorUserId: actor.userId
      },
      { client }
    )

    await client.query(
      `UPDATE greenhouse_finance.service_entry_sheets
         SET income_id = $1,
             contract_id = COALESCE($3, contract_id),
             invoiced = TRUE,
             updated_at = NOW()
         WHERE hes_id = $2`,
      [incomeId, hesId, contract.contractId]
    )

    const alreadyConverted = Boolean(quotation.converted_to_income_id) || quotation.status === 'converted'

    if (!alreadyConverted) {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
           SET status = 'converted',
               converted_to_income_id = $1,
               converted_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE quotation_id = $2`,
        [incomeId, quotationId]
      )
    }

    await publishQuotationInvoiceEmitted(
      {
        quotationId,
        incomeId,
        sourceHesId: hesId,
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
          sourceHesId: hesId,
          totalAmountClp,
          branch: 'enterprise'
        }
      },
      client
    )

    if (!alreadyConverted) {
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
            incomeId,
            sourceHesId: hesId
          }
        },
        client
      )
    }

    return {
      incomeId,
      quotationId,
      contractId: contract.contractId,
      sourceHesId: hesId,
      totalAmountClp
    }
  })

  await materializeContractProfitabilitySnapshots({ contractId: result.contractId })

  return result
}

/**
 * TASK-1206 — primitive IDEMPOTENTE de income para el cierre Q2C (enterprise/HES branch).
 *
 * A diferencia de `materializeInvoiceFromApprovedHes`, este primitive:
 *  - NO marca la cotización `converted` ni crea el contrato (eso lo hace `convertQuoteToCash`
 *    DESPUÉS, vía `closeQuoteToCash`).
 *  - es IDEMPOTENTE: si la HES ya tiene `income_id` (replay), devuelve ese income y NUNCA crea
 *    un segundo income (anti doble-AR). El lock `FOR UPDATE` serializa cierres concurrentes.
 *  - crea el income con `contract_id` NULL; `convertQuoteToCash` lo backfillea al crear el
 *    contrato (`syncContractIdOnDocumentChain` cubre income + service_entry_sheets).
 *
 * Corre su propia transacción (el orquestador lo invoca ANTES de la conversión).
 */
export const ensureIncomeFromHes = async (
  params: MaterializeInvoiceFromHesParams
): Promise<EnsureIncomeFromHesResult> => {
  const { hesId, actor } = params

  return withTransaction(async client => {
    const { hes, quotation, quotationId } = await loadHesAndQuotation(client, hesId)

    // Idempotencia dura: si la HES ya fue materializada, devolver su income.
    if (hes.income_id) {
      return {
        incomeId: hes.income_id,
        quotationId,
        sourceHesId: hesId,
        totalAmountClp: 0,
        created: false
      }
    }

    const incomeId = `INC-${randomUUID().slice(0, 8)}`
    const { writeFields, totalAmountClp } = await buildHesIncomeWriteFields(client, hes, quotation, params.dueDate)

    await createFinanceIncomeInPostgres(
      {
        ...writeFields,
        incomeId,
        // contract_id NULL — backfilled by ensureContractForQuotation in the convert step.
        contractId: null,
        actorUserId: actor.userId
      },
      { client }
    )

    await client.query(
      `UPDATE greenhouse_finance.service_entry_sheets
         SET income_id = $1,
             invoiced = TRUE,
             updated_at = NOW()
         WHERE hes_id = $2`,
      [incomeId, hesId]
    )

    await publishQuotationInvoiceEmitted(
      {
        quotationId,
        incomeId,
        sourceHesId: hesId,
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
          sourceHesId: hesId,
          totalAmountClp,
          branch: 'enterprise',
          via: 'closeQuoteToCash'
        }
      },
      client
    )

    return {
      incomeId,
      quotationId,
      sourceHesId: hesId,
      totalAmountClp,
      created: true
    }
  })
}
