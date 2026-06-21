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

/**
 * TASK-1206 — resultado del primitive idempotente de income (simple branch). NO marca la
 * cotización `converted` ni crea el contrato; eso lo hace el substrate `convertQuoteToCash`
 * DESPUÉS, vía el orquestador `closeQuoteToCash`. `created=false` en un replay (income ya
 * existía); en ese caso NUNCA se crea un segundo income (anti doble-AR).
 */
export interface EnsureIncomeFromQuotationResult {
  incomeId: string
  quotationId: string
  totalAmountClp: number
  created: boolean
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

interface ExistingIncomeRow extends Record<string, unknown> {
  income_id: string
}

/** Campos de escritura del income, sin `incomeId`/`contractId` (los inyecta cada caller). */
type QuotationIncomeWriteFields = Omit<
  Parameters<typeof createFinanceIncomeInPostgres>[0],
  'incomeId' | 'contractId'
>

const QUOTATION_SELECT_SQL = `
  SELECT q.quotation_id, q.quotation_number, q.client_id, q.organization_id, q.space_id,
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
 * Guard de la rama enterprise: si hay POs o HES aprobadas vinculadas, esta cotización debe
 * cerrarse por la rama HES (chain accounting). Compartido entre el materializer legacy y el
 * primitive idempotente.
 */
const assertNoEnterpriseChain = async (client: PoolClient, quotationId: string): Promise<void> => {
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
}

/**
 * Fuente ÚNICA de la construcción de los campos del income desde una cotización (tax snapshot
 * + rama CLF + nombre de cliente). Usado por el materializer legacy y por el primitive
 * idempotente, para que el `INC-` tenga exactamente la misma forma por ambos caminos.
 *
 * Devuelve los campos SIN `incomeId`/`contractId` (cada caller los inyecta) y el `totalAmountClp`
 * pre-CLF (el que viaja a eventos/audit/resultado; la rama CLF usa `final*` para el row).
 */
const buildQuotationIncomeWriteFields = async (
  client: PoolClient,
  quotation: QuotationRow,
  dueDateParam: string | null | undefined
): Promise<{ writeFields: QuotationIncomeWriteFields; totalAmountClp: number }> => {
  const totalAmountRaw = quotation.total_price ?? quotation.total_amount ?? quotation.total_amount_clp ?? 0
  const totalAmountClpRaw = quotation.total_amount_clp ?? quotation.total_price ?? quotation.total_amount ?? 0
  const subtotal = Number(quotation.subtotal ?? totalAmountRaw)
  const currency = quotation.currency || 'CLP'
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

  // TASK-995 (ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1) — una cotización/OC
  // en CLF (UF) se proyecta a un income con moneda legal CLP + plano native UF.
  // Gated: con el flag OFF o currency≠CLF el camino es bit-for-bit el legacy.
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

    // Fail-closed (ADR §12): sin valor UF para la fecha NO se aplana a CLP.
    if (!projection) {
      throw new FinanceValidationError(
        'No hay valor UF para proyectar la factura CLF a CLP en la fecha de emisión.'
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
    quotation.client_id,
    quotation.client_name_cache
  )

  const writeFields: QuotationIncomeWriteFields = {
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
    actorUserId: null
  }

  return { writeFields, totalAmountClp }
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
 *
 * NOTE (TASK-1206): este materializer legacy mantiene su contrato externo (converted +
 * contrato + income en una tx, 409 si ya convertida) y sigue detrás del flag de cutover
 * de `/api/finance/quotes/[id]/convert-to-invoice`. El camino canónico nuevo es el primitive
 * idempotente `ensureIncomeFromQuotation` orquestado por `closeQuoteToCash`.
 */
export const materializeInvoiceFromApprovedQuotation = async (
  params: MaterializeInvoiceFromQuotationParams
): Promise<MaterializeInvoiceFromQuotationResult> => {
  const { quotationId, actor } = params

  const result = await withTransaction(async client => {
    // TASK-524: resolve HubSpot anchors so the materialized income inherits
    // the commercial thread.
    const quotationResult = (await client.query(QUOTATION_SELECT_SQL, [quotationId])) as { rows: QuotationRow[] }

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

    await assertNoEnterpriseChain(client, quotationId)

    const incomeId = `INC-${randomUUID().slice(0, 8)}`
    const { writeFields, totalAmountClp } = await buildQuotationIncomeWriteFields(client, quotation, params.dueDate)

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

/**
 * TASK-1206 — primitive IDEMPOTENTE de income para el cierre Q2C (simple branch).
 *
 * A diferencia de `materializeInvoiceFromApprovedQuotation`, este primitive:
 *  - NO marca la cotización `converted` ni crea el contrato (eso lo hace `convertQuoteToCash`
 *    DESPUÉS, vía `closeQuoteToCash`, para que el contrato derive status `active`).
 *  - es IDEMPOTENTE por lookup de income existente por `quotation_id` ANTES de insertar: un
 *    replay devuelve el `incomeId` previo y NUNCA crea un segundo income (anti doble-AR).
 *  - crea el income con `contract_id` NULL; `convertQuoteToCash` lo backfillea vía
 *    `syncContractIdOnDocumentChain` al crear el contrato.
 *
 * Corre su propia transacción (el orquestador lo invoca ANTES de la conversión).
 */
export const ensureIncomeFromQuotation = async (
  params: MaterializeInvoiceFromQuotationParams
): Promise<EnsureIncomeFromQuotationResult> => {
  const { quotationId, actor } = params

  return withTransaction(async client => {
    const quotationResult = (await client.query(QUOTATION_SELECT_SQL, [quotationId])) as { rows: QuotationRow[] }

    const quotation = quotationResult.rows[0]

    if (!quotation) {
      throw new Error(`Quotation ${quotationId} not found.`)
    }

    // Idempotencia dura: si ya existe un income enlazado a esta cotización, devolverlo.
    // NUNCA crear un segundo income (anti doble-AR). El lock FOR UPDATE de arriba serializa
    // dos cierres concurrentes: el segundo ve el income del primero.
    const existing = (await client.query(
      `SELECT income_id
         FROM greenhouse_finance.income
         WHERE quotation_id = $1
         ORDER BY created_at ASC
         LIMIT 1`,
      [quotationId]
    )) as { rows: ExistingIncomeRow[] }

    const existingIncome = existing.rows[0]

    if (existingIncome) {
      return {
        incomeId: existingIncome.income_id,
        quotationId,
        totalAmountClp: 0,
        created: false
      }
    }

    const allowedStatuses = new Set(['issued', 'approved', 'sent'])

    if (!allowedStatuses.has(quotation.status)) {
      throw new Error(
        `Quotation ${quotationId} must be in status 'issued' (legacy: 'approved' or 'sent') (current: ${quotation.status}).`
      )
    }

    await assertNoEnterpriseChain(client, quotationId)

    const incomeId = `INC-${randomUUID().slice(0, 8)}`
    const { writeFields, totalAmountClp } = await buildQuotationIncomeWriteFields(client, quotation, params.dueDate)

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
          branch: 'simple',
          via: 'closeQuoteToCash'
        }
      },
      client
    )

    return {
      incomeId,
      quotationId,
      totalAmountClp,
      created: true
    }
  })
}
