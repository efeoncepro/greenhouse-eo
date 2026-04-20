import 'server-only'

import { query } from '@/lib/db'

export interface QuotationDocumentChainPurchaseOrder {
  poId: string
  poNumber: string | null
  status: string
  authorizedAmount: number
  authorizedAmountClp: number
  invoicedAmountClp: number
  remainingAmountClp: number
  currency: string
  issueDate: string | null
  expiryDate: string | null
  description: string | null
  createdAt: string | null
}

export interface QuotationDocumentChainServiceEntry {
  hesId: string
  hesNumber: string | null
  purchaseOrderId: string | null
  status: string
  amount: number
  amountClp: number
  amountAuthorizedClp: number | null
  currency: string
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  submittedAt: string | null
  approvedAt: string | null
  incomeId: string | null
  invoiced: boolean
  createdAt: string | null
}

export interface QuotationDocumentChainIncome {
  incomeId: string
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  totalAmount: number
  totalAmountClp: number
  currency: string
  paymentStatus: string
  amountPaid: number
  sourceHesId: string | null
  nuboxDocumentId: string | null
  dteFolio: string | null
  dteTypeCode: string | null
  createdAt: string | null
}

export interface QuotationDocumentChain {
  quotation: {
    id: string
    number: string | null
    status: string
    currency: string
    pricingProvenance: {
      lineCount: number
      replayableLineCount: number
      costBasisKinds: string[]
      confidenceLabels: string[]
    } | null
  } | null
  purchaseOrders: QuotationDocumentChainPurchaseOrder[]
  serviceEntries: QuotationDocumentChainServiceEntry[]
  incomes: QuotationDocumentChainIncome[]
  totals: {
    quoted: number
    authorized: number
    invoiced: number
    authorizedVsQuotedDelta: number
    invoicedVsQuotedDelta: number
  }
}

export interface ContractDocumentChain {
  contract: {
    id: string
    number: string
    status: string
    currency: string
    originatorQuoteId: string | null
  } | null
  quotations: Array<{
    quotationId: string
    quotationNumber: string | null
    status: string | null
    relationshipType: string
  }>
  purchaseOrders: QuotationDocumentChainPurchaseOrder[]
  serviceEntries: QuotationDocumentChainServiceEntry[]
  incomes: QuotationDocumentChainIncome[]
  totals: {
    quoted: number
    authorized: number
    invoiced: number
    authorizedVsQuotedDelta: number
    invoicedVsQuotedDelta: number
  }
}

interface QuotationRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string | null
  status: string
  currency: string | null
  total_price: string | number | null
  total_amount: string | number | null
  total_amount_clp: string | number | null
}

interface PoRow extends Record<string, unknown> {
  po_id: string
  po_number: string | null
  status: string
  authorized_amount: string | number | null
  authorized_amount_clp: string | number | null
  invoiced_amount_clp: string | number | null
  remaining_amount_clp: string | number | null
  currency: string | null
  issue_date: string | Date | null
  expiry_date: string | Date | null
  description: string | null
  created_at: string | Date | null
}

interface HesRow extends Record<string, unknown> {
  hes_id: string
  hes_number: string | null
  purchase_order_id: string | null
  status: string
  amount: string | number | null
  amount_clp: string | number | null
  amount_authorized_clp: string | number | null
  currency: string | null
  service_period_start: string | Date | null
  service_period_end: string | Date | null
  submitted_at: string | Date | null
  approved_at: string | Date | null
  income_id: string | null
  invoiced: boolean | null
  created_at: string | Date | null
}

interface IncomeRow extends Record<string, unknown> {
  income_id: string
  invoice_number: string | null
  invoice_date: string | Date | null
  due_date: string | Date | null
  total_amount: string | number | null
  total_amount_clp: string | number | null
  currency: string | null
  payment_status: string
  amount_paid: string | number | null
  source_hes_id: string | null
  nubox_document_id: string | number | null
  dte_folio: string | null
  dte_type_code: string | null
  created_at: string | Date | null
}

interface PricingProvenanceSummaryRow extends Record<string, unknown> {
  line_count: string | number | null
  replayable_line_count: string | number | null
  cost_basis_kinds: string[] | null
  confidence_labels: string[] | null
}

interface ContractRow extends Record<string, unknown> {
  contract_id: string
  contract_number: string
  status: string
  currency: string | null
  originator_quote_id: string | null
  tcv_clp: string | number | null
}

interface ContractQuoteRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string | null
  status: string | null
  relationship_type: string
  total_amount_clp: string | number | null
  total_price: string | number | null
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null

  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toIsoTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null

  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const num = (value: unknown): number => {
  if (value === null || value === undefined) return 0

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Reads the full document chain anchored on a canonical quotation.
 *
 * Returns the quotation header plus all linked POs, HES entries, incomes,
 * and computed totals (quoted / authorized / invoiced + deltas). This is the
 * read-side of the TASK-350 bridge — drives timeline UIs and audit surfaces.
 */
export const readQuotationDocumentChain = async ({
  quotationId
}: {
  quotationId: string
}): Promise<QuotationDocumentChain> => {
  const quotationRows = await query<QuotationRow>(
    `SELECT quotation_id, quotation_number, status, currency,
            total_price, total_amount, total_amount_clp
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
       LIMIT 1`,
    [quotationId]
  )

  const quotation = quotationRows[0] ?? null

  const pricingProvenanceRows = await query<PricingProvenanceSummaryRow>(
    `SELECT
       COUNT(*) AS line_count,
       COUNT(*) FILTER (WHERE pricing_input IS NOT NULL) AS replayable_line_count,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT cost_breakdown ->> 'pricingV2CostBasisKind'), NULL) AS cost_basis_kinds,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT cost_breakdown ->> 'pricingV2CostBasisConfidenceLabel'), NULL) AS confidence_labels
     FROM greenhouse_commercial.quotation_line_items
     WHERE quotation_id = $1
       AND version_number = (
         SELECT current_version
         FROM greenhouse_commercial.quotations
         WHERE quotation_id = $1
       )`,
    [quotationId]
  )

  const pricingProvenance = pricingProvenanceRows[0]

  const poRows = await query<PoRow>(
    `SELECT po_id, po_number, status,
            authorized_amount, authorized_amount_clp,
            invoiced_amount_clp, remaining_amount_clp,
            currency, issue_date, expiry_date, description, created_at
       FROM greenhouse_finance.purchase_orders
       WHERE quotation_id = $1
       ORDER BY issue_date ASC NULLS LAST, created_at ASC`,
    [quotationId]
  )

  const hesRows = await query<HesRow>(
    `SELECT hes_id, hes_number, purchase_order_id, status,
            amount, amount_clp, amount_authorized_clp,
            currency, service_period_start, service_period_end,
            submitted_at, approved_at, income_id, invoiced, created_at
       FROM greenhouse_finance.service_entry_sheets
       WHERE quotation_id = $1
       ORDER BY service_period_start ASC NULLS LAST, created_at ASC`,
    [quotationId]
  )

  const incomeRows = await query<IncomeRow>(
    `SELECT income_id, invoice_number, invoice_date, due_date,
            total_amount, total_amount_clp, currency,
            payment_status, amount_paid, source_hes_id,
            nubox_document_id, dte_folio, dte_type_code, created_at
       FROM greenhouse_finance.income
       WHERE quotation_id = $1
       ORDER BY invoice_date ASC NULLS LAST, created_at ASC`,
    [quotationId]
  )

  const purchaseOrders: QuotationDocumentChainPurchaseOrder[] = poRows.map(row => ({
    poId: String(row.po_id),
    poNumber: row.po_number ? String(row.po_number) : null,
    status: String(row.status),
    authorizedAmount: num(row.authorized_amount),
    authorizedAmountClp: num(row.authorized_amount_clp),
    invoicedAmountClp: num(row.invoiced_amount_clp),
    remainingAmountClp: num(row.remaining_amount_clp),
    currency: String(row.currency || 'CLP'),
    issueDate: toIsoDate(row.issue_date),
    expiryDate: toIsoDate(row.expiry_date),
    description: row.description ? String(row.description) : null,
    createdAt: toIsoTimestamp(row.created_at)
  }))

  const serviceEntries: QuotationDocumentChainServiceEntry[] = hesRows.map(row => ({
    hesId: String(row.hes_id),
    hesNumber: row.hes_number ? String(row.hes_number) : null,
    purchaseOrderId: row.purchase_order_id ? String(row.purchase_order_id) : null,
    status: String(row.status),
    amount: num(row.amount),
    amountClp: num(row.amount_clp),
    amountAuthorizedClp: row.amount_authorized_clp === null || row.amount_authorized_clp === undefined
      ? null
      : num(row.amount_authorized_clp),
    currency: String(row.currency || 'CLP'),
    servicePeriodStart: toIsoDate(row.service_period_start),
    servicePeriodEnd: toIsoDate(row.service_period_end),
    submittedAt: toIsoTimestamp(row.submitted_at),
    approvedAt: toIsoTimestamp(row.approved_at),
    incomeId: row.income_id ? String(row.income_id) : null,
    invoiced: Boolean(row.invoiced),
    createdAt: toIsoTimestamp(row.created_at)
  }))

  const incomes: QuotationDocumentChainIncome[] = incomeRows.map(row => ({
    incomeId: String(row.income_id),
    invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
    invoiceDate: toIsoDate(row.invoice_date),
    dueDate: toIsoDate(row.due_date),
    totalAmount: num(row.total_amount),
    totalAmountClp: num(row.total_amount_clp),
    currency: String(row.currency || 'CLP'),
    paymentStatus: String(row.payment_status),
    amountPaid: num(row.amount_paid),
    sourceHesId: row.source_hes_id ? String(row.source_hes_id) : null,
    nuboxDocumentId: row.nubox_document_id ? String(row.nubox_document_id) : null,
    dteFolio: row.dte_folio ? String(row.dte_folio) : null,
    dteTypeCode: row.dte_type_code ? String(row.dte_type_code) : null,
    createdAt: toIsoTimestamp(row.created_at)
  }))

  const quoted = round2(
    num(quotation?.total_price ?? quotation?.total_amount ?? quotation?.total_amount_clp)
  )

  const authorized = round2(
    hesRows
      .filter(row => row.status === 'approved')
      .reduce((acc, row) => acc + num(row.amount_authorized_clp ?? row.amount_clp), 0)
  )

  const invoiced = round2(incomes.reduce((acc, row) => acc + row.totalAmountClp, 0))

  return {
    quotation: quotation
      ? {
          id: String(quotation.quotation_id),
          number: quotation.quotation_number ? String(quotation.quotation_number) : null,
          status: String(quotation.status),
          currency: String(quotation.currency || 'CLP'),
          pricingProvenance: {
            lineCount: num(pricingProvenance?.line_count),
            replayableLineCount: num(pricingProvenance?.replayable_line_count),
            costBasisKinds: pricingProvenance?.cost_basis_kinds ?? [],
            confidenceLabels: pricingProvenance?.confidence_labels ?? []
          }
        }
      : null,
    purchaseOrders,
    serviceEntries,
    incomes,
    totals: {
      quoted,
      authorized,
      invoiced,
      authorizedVsQuotedDelta: round2(authorized - quoted),
      invoicedVsQuotedDelta: round2(invoiced - quoted)
    }
  }
}

export const readContractDocumentChain = async ({
  contractId
}: {
  contractId: string
}): Promise<ContractDocumentChain> => {
  const contractRows = await query<ContractRow>(
    `SELECT contract_id, contract_number, status, currency, originator_quote_id, tcv_clp
       FROM greenhouse_commercial.contracts
      WHERE contract_id = $1
      LIMIT 1`,
    [contractId]
  )

  const contract = contractRows[0] ?? null

  const quoteRows = await query<ContractQuoteRow>(
    `SELECT
       q.quotation_id,
       q.quotation_number,
       q.status,
       cq.relationship_type,
       q.total_amount_clp,
       q.total_price
     FROM greenhouse_commercial.contract_quotes cq
     JOIN greenhouse_commercial.quotations q
       ON q.quotation_id = cq.quotation_id
    WHERE cq.contract_id = $1
    ORDER BY
      CASE cq.relationship_type
        WHEN 'originator' THEN 0
        WHEN 'renewal' THEN 1
        WHEN 'modification' THEN 2
        ELSE 3
      END,
      q.quote_date ASC NULLS LAST,
      q.created_at ASC`,
    [contractId]
  )

  const quotationIds = quoteRows.map(row => String(row.quotation_id))
  const quotationIdsParam = quotationIds.length > 0 ? quotationIds : ['__none__']

  const poRows = await query<PoRow>(
    `SELECT po_id, po_number, status,
            authorized_amount, authorized_amount_clp,
            invoiced_amount_clp, remaining_amount_clp,
            currency, issue_date, expiry_date, description, created_at
       FROM greenhouse_finance.purchase_orders
      WHERE contract_id = $1
         OR quotation_id = ANY($2::text[])
      ORDER BY issue_date ASC NULLS LAST, created_at ASC`,
    [contractId, quotationIdsParam]
  )

  const hesRows = await query<HesRow>(
    `SELECT hes_id, hes_number, purchase_order_id, status,
            amount, amount_clp, amount_authorized_clp,
            currency, service_period_start, service_period_end,
            submitted_at, approved_at, income_id, invoiced, created_at
       FROM greenhouse_finance.service_entry_sheets
      WHERE contract_id = $1
         OR quotation_id = ANY($2::text[])
      ORDER BY service_period_start ASC NULLS LAST, created_at ASC`,
    [contractId, quotationIdsParam]
  )

  const incomeRows = await query<IncomeRow>(
    `SELECT income_id, invoice_number, invoice_date, due_date,
            total_amount, total_amount_clp, currency,
            payment_status, amount_paid, source_hes_id,
            nubox_document_id, dte_folio, dte_type_code, created_at
       FROM greenhouse_finance.income
      WHERE contract_id = $1
         OR quotation_id = ANY($2::text[])
      ORDER BY invoice_date ASC NULLS LAST, created_at ASC`,
    [contractId, quotationIdsParam]
  )

  const purchaseOrders: QuotationDocumentChainPurchaseOrder[] = poRows.map(row => ({
    poId: String(row.po_id),
    poNumber: row.po_number ? String(row.po_number) : null,
    status: String(row.status),
    authorizedAmount: num(row.authorized_amount),
    authorizedAmountClp: num(row.authorized_amount_clp),
    invoicedAmountClp: num(row.invoiced_amount_clp),
    remainingAmountClp: num(row.remaining_amount_clp),
    currency: String(row.currency || 'CLP'),
    issueDate: toIsoDate(row.issue_date),
    expiryDate: toIsoDate(row.expiry_date),
    description: row.description ? String(row.description) : null,
    createdAt: toIsoTimestamp(row.created_at)
  }))

  const serviceEntries: QuotationDocumentChainServiceEntry[] = hesRows.map(row => ({
    hesId: String(row.hes_id),
    hesNumber: row.hes_number ? String(row.hes_number) : null,
    purchaseOrderId: row.purchase_order_id ? String(row.purchase_order_id) : null,
    status: String(row.status),
    amount: num(row.amount),
    amountClp: num(row.amount_clp),
    amountAuthorizedClp: row.amount_authorized_clp === null || row.amount_authorized_clp === undefined
      ? null
      : num(row.amount_authorized_clp),
    currency: String(row.currency || 'CLP'),
    servicePeriodStart: toIsoDate(row.service_period_start),
    servicePeriodEnd: toIsoDate(row.service_period_end),
    submittedAt: toIsoTimestamp(row.submitted_at),
    approvedAt: toIsoTimestamp(row.approved_at),
    incomeId: row.income_id ? String(row.income_id) : null,
    invoiced: Boolean(row.invoiced),
    createdAt: toIsoTimestamp(row.created_at)
  }))

  const incomes: QuotationDocumentChainIncome[] = incomeRows.map(row => ({
    incomeId: String(row.income_id),
    invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
    invoiceDate: toIsoDate(row.invoice_date),
    dueDate: toIsoDate(row.due_date),
    totalAmount: num(row.total_amount),
    totalAmountClp: num(row.total_amount_clp),
    currency: String(row.currency || 'CLP'),
    paymentStatus: String(row.payment_status),
    amountPaid: num(row.amount_paid),
    sourceHesId: row.source_hes_id ? String(row.source_hes_id) : null,
    nuboxDocumentId: row.nubox_document_id ? String(row.nubox_document_id) : null,
    dteFolio: row.dte_folio ? String(row.dte_folio) : null,
    dteTypeCode: row.dte_type_code ? String(row.dte_type_code) : null,
    createdAt: toIsoTimestamp(row.created_at)
  }))

  const relatedQuotedTotal = round2(
    quoteRows.reduce(
      (acc, row) => acc + num(row.total_amount_clp ?? row.total_price),
      0
    )
  )

  const quoted = round2(num(contract?.tcv_clp) || relatedQuotedTotal)

  const authorized = round2(
    hesRows
      .filter(row => row.status === 'approved')
      .reduce((acc, row) => acc + num(row.amount_authorized_clp ?? row.amount_clp), 0)
  )

  const invoiced = round2(incomes.reduce((acc, row) => acc + row.totalAmountClp, 0))

  return {
    contract: contract
      ? {
          id: String(contract.contract_id),
          number: String(contract.contract_number),
          status: String(contract.status),
          currency: String(contract.currency || 'CLP'),
          originatorQuoteId: contract.originator_quote_id ? String(contract.originator_quote_id) : null
        }
      : null,
    quotations: quoteRows.map(row => ({
      quotationId: String(row.quotation_id),
      quotationNumber: row.quotation_number ? String(row.quotation_number) : null,
      status: row.status ? String(row.status) : null,
      relationshipType: String(row.relationship_type)
    })),
    purchaseOrders,
    serviceEntries,
    incomes,
    totals: {
      quoted,
      authorized,
      invoiced,
      authorizedVsQuotedDelta: round2(authorized - quoted),
      invoicedVsQuotedDelta: round2(invoiced - quoted)
    }
  }
}
