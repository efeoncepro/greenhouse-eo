import 'server-only'

import { createHash } from 'node:crypto'

import type {
  NuboxSale,
  NuboxPurchase,
  NuboxExpense,
  NuboxIncome,
  NuboxRawSnapshotRow,
  NuboxConformedSale,
  NuboxConformedPurchase,
  NuboxConformedBankMovement,
  NuboxExportationDetail
} from '@/lib/nubox/types'
import { normalizeTaxId } from '@/lib/finance/multi-currency/tax-identity'

// ─── Helpers ────────────────────────────────────────────────────────────────

export const buildPayloadHash = (payload: unknown): string =>
  createHash('sha256')
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex')

const toDateOnly = (value: string | null | undefined): string | null => {
  if (!value) return null

  // Handle ISO timestamps like "2026-02-02T13:24:52Z" → "2026-02-02"
  return value.slice(0, 10)
}

/** Ensure a date/datetime string is in full ISO timestamp format for BigQuery TIMESTAMP columns */
const toTimestamp = (value: string | null | undefined): string | null => {
  if (!value) return null

  // Already a full ISO timestamp (e.g., "2026-02-02T13:24:52Z")
  if (value.includes('T')) return value

  // Date-only (e.g., "2025-09-01") → append midnight UTC
  return `${value}T00:00:00Z`
}

const nowIso = () => new Date().toISOString()
const todayDate = () => nowIso().slice(0, 10)

/** Extract a link URL from the Nubox links array by rel name */
const getLink = (links: Array<{ rel: string; href: string }> | undefined, rel: string): string | null =>
  links?.find(l => l.rel === rel)?.href || null

// ─── Raw Snapshot Mappers ───────────────────────────────────────────────────

export const mapSaleToRawRow = (sale: NuboxSale, syncRunId: string): NuboxRawSnapshotRow => {
  const payloadJson = JSON.stringify(sale)

  return {
    sync_run_id: syncRunId,
    source_system: 'nubox',
    source_object_type: 'sale',
    source_object_id: String(sale.id),
    source_created_at: sale.emissionDate || null,
    source_updated_at: sale.emissionDate || null,
    is_deleted: false,
    payload_json: payloadJson,
    payload_hash: buildPayloadHash(payloadJson),
    ingested_at: nowIso(),
    ingested_date: todayDate()
  }
}

export const mapPurchaseToRawRow = (purchase: NuboxPurchase, syncRunId: string): NuboxRawSnapshotRow => {
  const payloadJson = JSON.stringify(purchase)

  return {
    sync_run_id: syncRunId,
    source_system: 'nubox',
    source_object_type: 'purchase',
    source_object_id: String(purchase.id),
    source_created_at: purchase.emissionDate || null,
    source_updated_at: purchase.emissionDate || null,
    is_deleted: false,
    payload_json: payloadJson,
    payload_hash: buildPayloadHash(payloadJson),
    ingested_at: nowIso(),
    ingested_date: todayDate()
  }
}

export const mapExpenseToRawRow = (expense: NuboxExpense, syncRunId: string): NuboxRawSnapshotRow => {
  const payloadJson = JSON.stringify(expense)

  return {
    sync_run_id: syncRunId,
    source_system: 'nubox',
    source_object_type: 'expense',
    source_object_id: String(expense.id),
    source_created_at: toTimestamp(expense.paymentDate),
    source_updated_at: toTimestamp(expense.paymentDate),
    is_deleted: false,
    payload_json: payloadJson,
    payload_hash: buildPayloadHash(payloadJson),
    ingested_at: nowIso(),
    ingested_date: todayDate()
  }
}

export const mapIncomeToRawRow = (income: NuboxIncome, syncRunId: string): NuboxRawSnapshotRow => {
  const payloadJson = JSON.stringify(income)

  return {
    sync_run_id: syncRunId,
    source_system: 'nubox',
    source_object_type: 'income',
    source_object_id: String(income.id),
    source_created_at: toTimestamp(income.paymentDate),
    source_updated_at: toTimestamp(income.paymentDate),
    is_deleted: false,
    payload_json: payloadJson,
    payload_hash: buildPayloadHash(payloadJson),
    ingested_at: nowIso(),
    ingested_date: todayDate()
  }
}

// ─── Conformed Mappers ──────────────────────────────────────────────────────

type IdentityMaps = {
  orgByRut: Map<string, { organization_id: string; client_id: string | null }>
  supplierByRut: Map<string, string> // rut → supplier_id
  incomeByNuboxId: Map<string, string> // nubox_document_id → income_id
  expenseByNuboxId: Map<string, string> // nubox_purchase_id → expense_id
}

// TASK-990 — DTE export legal codes (SII): 110 factura exportación, 111 nota
// débito exportación, 112 nota crédito exportación.
const EXPORT_DTE_LEGAL_CODES = new Set(['110', '111', '112'])

export const isNuboxExportInvoice = (sale: NuboxSale): boolean =>
  EXPORT_DTE_LEGAL_CODES.has(sale.type?.legalCode ?? '')

// Candidate keys the raw export node MIGHT use for the foreign amount / currency
// (Nubox's typed shape has none today — extraction is defensive, Open Question
// resolved per-payload in Discovery). Operator-reviewed evidence is merged at
// the disposition step (Slice 4), not here.
const FOREIGN_AMOUNT_KEYS = ['foreignAmount', 'montoExtranjero', 'totalMonedaExtranjera', 'montoMonedaExtranjera', 'totalForeign']
const FOREIGN_CURRENCY_KEYS = ['foreignCurrency', 'foreignCurrencyCode', 'currencyCode', 'codigoMoneda', 'tipoMoneda', 'moneda', 'currency']

const readNumber = (node: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = node[k]
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN

    if (Number.isFinite(n) && n > 0) return n
  }

  return null
}

const readString = (node: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const v = node[k]

    if (typeof v === 'string' && v.trim()) return v.trim().toUpperCase()
  }

  return null
}

/**
 * Extract export foreign-currency detail from a Nubox sale. CLP-only / non-export
 * invoices return `none` evidence with null amounts (no behavior change). The CLP
 * legal value is always `sale.totalAmount` (the functional plane — never
 * recomputed, ADR §8.4). When the raw payload carries a usable foreign amount +
 * currency, evidence is `nubox_payload`; otherwise `none` (needs reviewed
 * disposition, Slice 4).
 */
export const mapNuboxExportationDetail = (sale: NuboxSale): NuboxExportationDetail => {
  const functionalClp = sale.totalAmount ?? null

  if (!isNuboxExportInvoice(sale)) {
    return {
      foreignTotalAmount: null,
      foreignCurrencyCode: null,
      functionalTotalAmountClp: functionalClp,
      evidenceSource: 'none',
      confidence: 'none',
      raw: null
    }
  }

  const raw = sale.exportationDetail ?? null
  const foreignAmount = raw ? readNumber(raw, FOREIGN_AMOUNT_KEYS) : null
  const foreignCurrency = raw ? readString(raw, FOREIGN_CURRENCY_KEYS) : null
  const hasUsable = foreignAmount !== null && foreignCurrency !== null

  return {
    foreignTotalAmount: hasUsable ? foreignAmount : null,
    foreignCurrencyCode: hasUsable ? foreignCurrency : null,
    functionalTotalAmountClp: functionalClp,
    evidenceSource: hasUsable ? 'nubox_payload' : 'none',
    confidence: hasUsable ? 'high' : 'none',
    raw
  }
}

export const mapSaleToConformed = (
  sale: NuboxSale,
  syncRunId: string,
  identityMaps: Pick<IdentityMaps, 'orgByRut' | 'incomeByNuboxId'>
): NuboxConformedSale => {
  const clientRut = sale.client?.identification?.value || null
  // TASK-990 — normalize the tax-id key (RUT or Mexican RFC) on lookup so case /
  // whitespace variance never silently orphans an export sale (overlay arch #1).
  const orgMatch = clientRut ? identityMaps.orgByRut.get(normalizeTaxId(clientRut)) : undefined
  const incomeId = identityMaps.incomeByNuboxId.get(String(sale.id)) || null
  const exportationDetail = mapNuboxExportationDetail(sale)

  return {
    nubox_sale_id: String(sale.id),
    folio: sale.number || null,
    dte_type_code: sale.type?.legalCode || null,
    dte_type_abbreviation: sale.type?.abbreviation || null,
    dte_type_name: sale.type?.name || null,
    net_amount: sale.totalNetAmount ?? null,
    exempt_amount: sale.totalExemptAmount ?? null,
    tax_vat_amount: sale.totalTaxVatAmount ?? null,
    total_amount: sale.totalAmount ?? null,
    other_taxes_amount: sale.totalOtherTaxesAmount ?? null,
    withholding_amount: sale.totalWithholdingAmount ?? null,
    balance: sale.balance ?? null,
    emission_date: toDateOnly(sale.emissionDate),
    due_date: toDateOnly(sale.dueDate) || null,
    period_year: sale.periodYear ?? null,
    period_month: sale.periodMonth ?? null,
    payment_form_code: sale.paymentForm?.legalCode || null,
    payment_form_name: sale.paymentForm?.name || null,
    sii_track_id: sale.dataCl?.trackId ? String(sale.dataCl.trackId) : null,
    is_annulled: sale.dataCl?.annulled ?? false,
    emission_status_id: sale.emissionStatus?.id ?? null,
    emission_status_name: sale.emissionStatus?.name || null,
    origin_name: sale.origin?.name || null,
    client_rut: clientRut,
    client_trade_name: sale.client?.tradeName || null,
    client_main_activity: sale.client?.mainActivity || null,
    foreign_total_amount: exportationDetail.foreignTotalAmount,
    foreign_currency_code: exportationDetail.foreignCurrencyCode,
    functional_total_amount_clp: exportationDetail.functionalTotalAmountClp,
    exportation_detail_json: exportationDetail.raw ? JSON.stringify(exportationDetail.raw) : null,
    foreign_currency_evidence_source: exportationDetail.evidenceSource,
    foreign_currency_confidence: exportationDetail.confidence,
    pdf_url: getLink(sale.links, 'pdf'),
    xml_url: getLink(sale.links, 'xml'),
    details_url: getLink(sale.links, 'details'),
    references_url: getLink(sale.links, 'references'),
    organization_id: orgMatch?.organization_id || null,
    client_id: orgMatch?.client_id || null,
    income_id: incomeId,
    payload_hash: buildPayloadHash(sale),
    sync_run_id: syncRunId,
    synced_at: nowIso()
  }
}

export const mapPurchaseToConformed = (
  purchase: NuboxPurchase,
  syncRunId: string,
  identityMaps: Pick<IdentityMaps, 'orgByRut' | 'supplierByRut' | 'expenseByNuboxId'>
): NuboxConformedPurchase => {
  const supplierRut = purchase.supplier?.identification?.value || null
  const supplierKey = normalizeTaxId(supplierRut)
  const supplierId = supplierKey ? identityMaps.supplierByRut.get(supplierKey) || null : null
  const orgEntry = supplierKey ? identityMaps.orgByRut.get(supplierKey) || null : null
  const expenseId = identityMaps.expenseByNuboxId.get(String(purchase.id)) || null

  return {
    nubox_purchase_id: String(purchase.id),
    folio: purchase.number || null,
    dte_type_code: purchase.type?.legalCode || null,
    dte_type_abbreviation: purchase.type?.abbreviation || null,
    dte_type_name: purchase.type?.name || null,
    net_amount: purchase.totalNetAmount ?? null,
    exempt_amount: purchase.totalExemptAmount ?? null,
    tax_vat_amount: purchase.totalTaxVatAmount ?? null,
    total_amount: purchase.totalAmount ?? null,
    total_other_taxes_amount: purchase.totalOtherTaxesAmount ?? null,
    total_withholding_amount: purchase.totalWithholdingAmount ?? null,
    balance: purchase.balance ?? null,
    emission_date: toDateOnly(purchase.emissionDate),
    due_date: toDateOnly(purchase.dueDate) || null,
    period_year: purchase.periodYear ?? null,
    period_month: purchase.periodMonth ?? null,
    document_status_id: purchase.documentStatus?.id ?? null,
    document_status_name: purchase.documentStatus?.name || null,
    purchase_type_code: purchase.purchaseType?.legalCode || null,
    purchase_type_name: purchase.purchaseType?.name || null,
    is_annulled: purchase.dataCl?.annulled ?? false,
    receipt_date: toDateOnly(purchase.dataCl?.receiptAt) || null,
    vat_unrecoverable_amount: purchase.dataCl?.vatUnrecoverableAmount ?? null,
    vat_fixed_assets_amount: purchase.dataCl?.vatFixedAssetsAmount ?? null,
    vat_common_use_amount: purchase.dataCl?.vatCommonUseAmount ?? null,
    origin_name: purchase.origin?.name || null,
    supplier_rut: supplierRut,
    supplier_trade_name: purchase.supplier?.tradeName || null,
    pdf_url: getLink(purchase.links, 'pdf'),
    supplier_id: supplierId,
    organization_id: orgEntry?.organization_id || null,
    expense_id: expenseId,
    payload_hash: buildPayloadHash(purchase),
    sync_run_id: syncRunId,
    synced_at: nowIso()
  }
}

export const mapExpenseToConformedBankMovement = (
  expense: NuboxExpense,
  syncRunId: string
): NuboxConformedBankMovement => {
  const linkedPurchaseId = expense.links
    ?.find(l => l.rel === 'document')
    ?.href?.match(/purchases\/(\d+)/)?.[1] || null

  return {
    nubox_movement_id: `exp-${expense.id}`,
    movement_direction: 'debit',
    nubox_folio: expense.folio ? String(expense.folio) : null,
    movement_type_id: expense.type?.id ?? null,
    movement_type_description: expense.type?.description || null,
    bank_id: expense.bank?.id ?? null,
    bank_description: expense.bank?.description || null,
    payment_method_id: expense.paymentMethod?.id ?? null,
    payment_method_description: expense.paymentMethod?.description || null,
    counterpart_rut: expense.supplier?.identification?.value || null,
    counterpart_trade_name: expense.supplier?.tradeName || null,
    total_amount: expense.totalAmount ?? null,
    payment_date: toDateOnly(expense.paymentDate),
    period_year: null, // derived from paymentDate if needed
    period_month: null,
    linked_sale_id: null,
    linked_purchase_id: linkedPurchaseId,
    payload_hash: buildPayloadHash(expense),
    sync_run_id: syncRunId,
    synced_at: nowIso()
  }
}

export const mapIncomeToConformedBankMovement = (
  income: NuboxIncome,
  syncRunId: string
): NuboxConformedBankMovement => {
  const linkedSaleId = income.links
    ?.find(l => l.rel === 'document')
    ?.href?.match(/sales\/(\d+)/)?.[1] || null

  return {
    nubox_movement_id: `inc-${income.id}`,
    movement_direction: 'credit',
    nubox_folio: income.folio ? String(income.folio) : null,
    movement_type_id: income.type?.id ?? null,
    movement_type_description: income.type?.description || null,
    bank_id: income.bank?.id ?? null,
    bank_description: income.bank?.description || null,
    payment_method_id: income.paymentMethod?.id ?? null,
    payment_method_description: income.paymentMethod?.description || null,
    counterpart_rut: income.client?.identification?.value || null,
    counterpart_trade_name: income.client?.tradeName || null,
    total_amount: income.totalAmount ?? null,
    payment_date: toDateOnly(income.paymentDate),
    period_year: null,
    period_month: null,
    linked_sale_id: linkedSaleId,
    linked_purchase_id: null,
    payload_hash: buildPayloadHash(income),
    sync_run_id: syncRunId,
    synced_at: nowIso()
  }
}
