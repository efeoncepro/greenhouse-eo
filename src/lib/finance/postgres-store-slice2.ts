import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  FinanceValidationError,
  normalizeString,
  normalizeBoolean,
  roundCurrency,
  toDateString,
  toNumber,
  toNullableNumber,
  toTimestampString
} from '@/lib/finance/shared'
import { resolveAutoAllocation, type AutoAllocationInput } from '@/lib/finance/auto-allocation-rules'
import { ensureOrganizationForClient } from '@/lib/account-360/organization-identity'

type QueryableClient = Pick<PoolClient, 'query'>

// ─── Auto-allocation helper (fire-and-forget after expense creation) ──────

const tryAutoAllocateExpense = async (input: AutoAllocationInput) => {
  const result = await resolveAutoAllocation(input)

  if (!result || result.allocations.length === 0) return

  for (const allocation of result.allocations) {
    const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_finance.cost_allocations
         (allocation_id, expense_id, client_id, allocation_percent, allocated_amount_clp, allocation_method, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT DO NOTHING`,
      [allocationId, input.expenseId, allocation.clientId, allocation.allocationPercent, allocation.allocatedAmountClp, allocation.method]
    )
  }

  console.log(`[auto-allocation] ${result.ruleApplied}: ${result.allocations.length} allocations for expense ${input.expenseId}`)
}

// ─── Row types ──────────────────────────────────────────────────────

type PostgresIncomeRow = {
  income_id: string
  client_id: string | null
  organization_id: string | null
  client_profile_id: string | null
  hubspot_company_id: string | null
  hubspot_deal_id: string | null
  client_name: string
  invoice_number: string | null
  invoice_date: string | Date
  due_date: string | Date | null
  description: string | null
  currency: string
  subtotal: unknown
  tax_rate: unknown
  tax_amount: unknown
  total_amount: unknown
  exchange_rate_to_clp: unknown
  total_amount_clp: unknown
  payment_status: string
  amount_paid: unknown
  collection_method: string | null
  po_number: string | null
  hes_number: string | null
  service_line: string | null
  income_type: string | null
  is_reconciled: boolean
  reconciliation_id: string | null
  partner_id: string | null
  partner_name: string | null
  partner_share_percent: unknown
  partner_share_amount: unknown
  net_after_partner: unknown
  notes: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null

  // Nubox DTE fields
  nubox_document_id: string | number | null
  nubox_sii_track_id: string | number | null
  nubox_emission_status: string | null
  dte_type_code: string | null
  dte_folio: string | null
  nubox_emitted_at: string | Date | null
  nubox_last_synced_at: string | Date | null

  // Enrichment fields (TASK-165)
  is_annulled: boolean
  nubox_pdf_url: string | null
  nubox_xml_url: string | null
  referenced_income_id: string | null
  payment_form: string | null
  balance_nubox: unknown
}

type PostgresExpenseRow = {
  expense_id: string
  client_id: string | null
  space_id: string | null
  expense_type: string
  source_type: string | null
  description: string
  currency: string
  subtotal: unknown
  tax_rate: unknown
  tax_amount: unknown
  total_amount: unknown
  exchange_rate_to_clp: unknown
  total_amount_clp: unknown
  payment_date: string | Date | null
  payment_status: string
  payment_method: string | null
  payment_provider: string | null
  payment_rail: string | null
  payment_account_id: string | null
  payment_reference: string | null
  document_number: string | null
  document_date: string | Date | null
  due_date: string | Date | null
  supplier_id: string | null
  supplier_name: string | null
  supplier_invoice_number: string | null
  payroll_period_id: string | null
  payroll_entry_id: string | null
  member_id: string | null
  member_name: string | null
  social_security_type: string | null
  social_security_institution: string | null
  social_security_period: string | null
  tax_type: string | null
  tax_period: string | null
  tax_form_number: string | null
  miscellaneous_category: string | null
  service_line: string | null
  is_recurring: boolean
  recurrence_frequency: string | null
  is_reconciled: boolean
  reconciliation_id: string | null
  linked_income_id: string | null
  cost_category: string | null
  cost_is_direct: boolean | null
  allocated_client_id: string | null
  direct_overhead_scope: string | null
  direct_overhead_kind: string | null
  direct_overhead_member_id: string | null
  notes: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null

  // Nubox purchase fields
  nubox_purchase_id: string | number | null
  nubox_document_status: string | null
  nubox_supplier_rut: string | null
  nubox_supplier_name: string | null
  nubox_origin: string | null
  nubox_last_synced_at: string | Date | null

  // Enrichment fields (TASK-165)
  is_annulled: boolean
  sii_document_status: string | null
  nubox_pdf_url: string | null
  balance_nubox: unknown
}

type PostgresIncomePaymentRow = {
  payment_id: string
  income_id: string
  payment_date: string | Date | null
  amount: unknown
  currency: string | null
  reference: string | null
  payment_method: string | null
  payment_account_id: string | null
  payment_source: string
  notes: string | null
  recorded_at: string | Date | null
  is_reconciled: boolean
  reconciliation_row_id: string | null
  reconciled_at: string | Date | null
  created_at: string | Date | null
}

type PostgresClientProfileRow = {
  client_profile_id: string
  client_id: string | null
  organization_id: string | null
  hubspot_company_id: string | null
  tax_id: string | null
  tax_id_type: string | null
  legal_name: string | null
  billing_address: string | null
  billing_country: string | null
  payment_terms_days: unknown
  payment_currency: string | null
  requires_po: boolean
  requires_hes: boolean
  current_po_number: string | null
  current_hes_number: string | null
  finance_contacts: unknown
  special_conditions: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

// ─── Record types ───────────────────────────────────────────────────

export type FinanceIncomeRecord = {
  incomeId: string
  clientId: string | null
  organizationId: string | null
  clientProfileId: string | null
  hubspotCompanyId: string | null
  hubspotDealId: string | null
  clientName: string
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  description: string | null
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  exchangeRateToClp: number
  totalAmountClp: number
  paymentStatus: string
  amountPaid: number
  amountPending: number
  collectionMethod: string | null
  poNumber: string | null
  hesNumber: string | null
  serviceLine: string | null
  incomeType: string | null
  isReconciled: boolean
  reconciliationId: string | null
  partnerId: string | null
  partnerName: string | null
  partnerSharePercent: number | null
  partnerShareAmount: number | null
  netAfterPartner: number | null
  notes: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null

  // Nubox DTE fields
  nuboxDocumentId: string | null
  nuboxSiiTrackId: string | null
  nuboxEmissionStatus: string | null
  dteTypeCode: string | null
  dteFolio: string | null
  nuboxEmittedAt: string | null
  nuboxLastSyncedAt: string | null

  // Enrichment fields (TASK-165)
  isAnnulled: boolean
  nuboxPdfUrl: string | null
  nuboxXmlUrl: string | null
  referencedIncomeId: string | null
  paymentForm: string | null
  balanceNubox: number | null
}

export type CostCategory = 'direct_labor' | 'indirect_labor' | 'operational' | 'infrastructure' | 'tax_social'

export type AllocationMethod = 'manual' | 'fte_weighted' | 'revenue_weighted' | 'headcount'

export type FinanceExpenseRecord = {
  expenseId: string
  clientId: string | null
  spaceId: string | null
  expenseType: string
  sourceType: string | null
  description: string
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  exchangeRateToClp: number
  totalAmountClp: number
  paymentDate: string | null
  paymentStatus: string
  paymentMethod: string | null
  paymentProvider: string | null
  paymentRail: string | null
  paymentAccountId: string | null
  paymentReference: string | null
  documentNumber: string | null
  documentDate: string | null
  dueDate: string | null
  supplierId: string | null
  supplierName: string | null
  supplierInvoiceNumber: string | null
  payrollPeriodId: string | null
  payrollEntryId: string | null
  memberId: string | null
  memberName: string | null
  socialSecurityType: string | null
  socialSecurityInstitution: string | null
  socialSecurityPeriod: string | null
  taxType: string | null
  taxPeriod: string | null
  taxFormNumber: string | null
  miscellaneousCategory: string | null
  serviceLine: string | null
  isRecurring: boolean
  recurrenceFrequency: string | null
  isReconciled: boolean
  reconciliationId: string | null
  linkedIncomeId: string | null
  costCategory: CostCategory | null
  costIsDirect: boolean
  allocatedClientId: string | null
  directOverheadScope: string | null
  directOverheadKind: string | null
  directOverheadMemberId: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null

  // Nubox purchase fields
  nuboxPurchaseId: string | null
  nuboxDocumentStatus: string | null
  nuboxSupplierRut: string | null
  nuboxSupplierName: string | null
  nuboxOrigin: string | null
  nuboxLastSyncedAt: string | null

  // Enrichment fields (TASK-165)
  isAnnulled: boolean
  siiDocumentStatus: string | null
  nuboxPdfUrl: string | null
  balanceNubox: number | null
}

export type CostAllocationRecord = {
  allocationId: string
  expenseId: string
  clientId: string
  organizationId: string | null
  spaceId: string | null
  clientName: string
  allocationPercent: number
  allocatedAmountClp: number
  periodYear: number
  periodMonth: number
  allocationMethod: AllocationMethod
  notes: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type ClientEconomicsRecord = {
  snapshotId: string
  clientId: string
  organizationId: string | null
  clientName: string
  periodYear: number
  periodMonth: number
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginClp: number
  grossMarginPercent: number | null
  netMarginClp: number
  netMarginPercent: number | null
  headcountFte: number | null
  revenuePerFte: number | null
  costPerFte: number | null
  acquisitionCostClp: number | null
  ltvToCacRatio: number | null
  notes: string | null
  computedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type FinanceIncomePaymentRecord = {
  paymentId: string
  incomeId: string
  paymentDate: string | null
  amount: number
  currency: string | null
  reference: string | null
  paymentMethod: string | null
  paymentAccountId: string | null
  paymentSource: string
  notes: string | null
  recordedAt: string | null
  isReconciled: boolean
  reconciliationRowId: string | null
  reconciledAt: string | null
  createdAt: string | null
}

export type FinanceClientProfileRecord = {
  clientProfileId: string
  clientId: string | null
  organizationId: string | null
  hubspotCompanyId: string | null
  taxId: string | null
  taxIdType: string | null
  legalName: string | null
  billingAddress: string | null
  billingCountry: string | null
  paymentTermsDays: number
  paymentCurrency: string | null
  requiresPo: boolean
  requiresHes: boolean
  currentPoNumber: string | null
  currentHesNumber: string | null
  financeContacts: unknown[]
  specialConditions: string | null
  createdByUserId: string | null
  createdAt: string | null
  updatedAt: string | null
}

// ─── Mappers ────────────────────────────────────────────────────────

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = normalizeString(v)

  return s || null
}

const mapIncome = (row: PostgresIncomeRow): FinanceIncomeRecord => {
  const totalAmount = toNumber(row.total_amount)
  const amountPaid = toNumber(row.amount_paid)

  return {
    incomeId: normalizeString(row.income_id),
    clientId: str(row.client_id),
    organizationId: str(row.organization_id),
    clientProfileId: str(row.client_profile_id),
    hubspotCompanyId: str(row.hubspot_company_id),
    hubspotDealId: str(row.hubspot_deal_id),
    clientName: normalizeString(row.client_name),
    invoiceNumber: str(row.invoice_number),
    invoiceDate: toDateString(row.invoice_date as string | { value?: string } | null),
    dueDate: toDateString(row.due_date as string | { value?: string } | null),
    description: str(row.description),
    currency: normalizeString(row.currency),
    subtotal: toNumber(row.subtotal),
    taxRate: toNumber(row.tax_rate),
    taxAmount: toNumber(row.tax_amount),
    totalAmount,
    exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
    totalAmountClp: toNumber(row.total_amount_clp),
    paymentStatus: normalizeString(row.payment_status),
    amountPaid,
    amountPending: roundCurrency(totalAmount - amountPaid),
    collectionMethod: str(row.collection_method),
    poNumber: str(row.po_number),
    hesNumber: str(row.hes_number),
    serviceLine: str(row.service_line),
    incomeType: str(row.income_type) || 'service_fee',
    isReconciled: normalizeBoolean(row.is_reconciled),
    reconciliationId: str(row.reconciliation_id),
    partnerId: str(row.partner_id),
    partnerName: str(row.partner_name),
    partnerSharePercent: toNullableNumber(row.partner_share_percent),
    partnerShareAmount: toNullableNumber(row.partner_share_amount),
    netAfterPartner: toNullableNumber(row.net_after_partner),
    notes: str(row.notes),
    createdBy: str(row.created_by_user_id),
    createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
    updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null),
    nuboxDocumentId: str(row.nubox_document_id != null ? String(row.nubox_document_id) : null),
    nuboxSiiTrackId: str(row.nubox_sii_track_id != null ? String(row.nubox_sii_track_id) : null),
    nuboxEmissionStatus: str(row.nubox_emission_status),
    dteTypeCode: str(row.dte_type_code),
    dteFolio: str(row.dte_folio),
    nuboxEmittedAt: toTimestampString(row.nubox_emitted_at as string | { value?: string } | null),
    nuboxLastSyncedAt: toTimestampString(row.nubox_last_synced_at as string | { value?: string } | null),
    isAnnulled: normalizeBoolean(row.is_annulled),
    nuboxPdfUrl: str(row.nubox_pdf_url),
    nuboxXmlUrl: str(row.nubox_xml_url),
    referencedIncomeId: str(row.referenced_income_id),
    paymentForm: str(row.payment_form),
    balanceNubox: toNullableNumber(row.balance_nubox)
  }
}

const mapExpense =(row: PostgresExpenseRow): FinanceExpenseRecord => ({
  expenseId: normalizeString(row.expense_id),
  clientId: str(row.client_id),
  spaceId: str(row.space_id),
  expenseType: normalizeString(row.expense_type),
  sourceType: str(row.source_type),
  description: normalizeString(row.description),
  currency: normalizeString(row.currency),
  subtotal: toNumber(row.subtotal),
  taxRate: toNumber(row.tax_rate),
  taxAmount: toNumber(row.tax_amount),
  totalAmount: toNumber(row.total_amount),
  exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
  totalAmountClp: toNumber(row.total_amount_clp),
  paymentDate: toDateString(row.payment_date as string | { value?: string } | null),
  paymentStatus: normalizeString(row.payment_status),
  paymentMethod: str(row.payment_method),
  paymentProvider: str(row.payment_provider),
  paymentRail: str(row.payment_rail),
  paymentAccountId: str(row.payment_account_id),
  paymentReference: str(row.payment_reference),
  documentNumber: str(row.document_number),
  documentDate: toDateString(row.document_date as string | { value?: string } | null),
  dueDate: toDateString(row.due_date as string | { value?: string } | null),
  supplierId: str(row.supplier_id),
  supplierName: str(row.supplier_name),
  supplierInvoiceNumber: str(row.supplier_invoice_number),
  payrollPeriodId: str(row.payroll_period_id),
  payrollEntryId: str(row.payroll_entry_id),
  memberId: str(row.member_id),
  memberName: str(row.member_name),
  socialSecurityType: str(row.social_security_type),
  socialSecurityInstitution: str(row.social_security_institution),
  socialSecurityPeriod: str(row.social_security_period),
  taxType: str(row.tax_type),
  taxPeriod: str(row.tax_period),
  taxFormNumber: str(row.tax_form_number),
  miscellaneousCategory: str(row.miscellaneous_category),
  serviceLine: str(row.service_line),
  isRecurring: normalizeBoolean(row.is_recurring),
  recurrenceFrequency: str(row.recurrence_frequency),
  isReconciled: normalizeBoolean(row.is_reconciled),
  reconciliationId: str(row.reconciliation_id),
  linkedIncomeId: str(row.linked_income_id),
  costCategory: str(row.cost_category) as CostCategory | null,
  costIsDirect: normalizeBoolean(row.cost_is_direct),
  allocatedClientId: str(row.allocated_client_id),
  directOverheadScope: str(row.direct_overhead_scope),
  directOverheadKind: str(row.direct_overhead_kind),
  directOverheadMemberId: str(row.direct_overhead_member_id),
  notes: str(row.notes),
  createdBy: str(row.created_by_user_id),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null),
  nuboxPurchaseId: str(row.nubox_purchase_id != null ? String(row.nubox_purchase_id) : null),
  nuboxDocumentStatus: str(row.nubox_document_status),
  nuboxSupplierRut: str(row.nubox_supplier_rut),
  nuboxSupplierName: str(row.nubox_supplier_name),
  nuboxOrigin: str(row.nubox_origin),
  nuboxLastSyncedAt: toTimestampString(row.nubox_last_synced_at as string | { value?: string } | null),
  isAnnulled: normalizeBoolean(row.is_annulled),
  siiDocumentStatus: str(row.sii_document_status),
  nuboxPdfUrl: str(row.nubox_pdf_url),
  balanceNubox: toNullableNumber(row.balance_nubox)
})

const mapIncomePayment =(row: PostgresIncomePaymentRow): FinanceIncomePaymentRecord => ({
  paymentId: normalizeString(row.payment_id),
  incomeId: normalizeString(row.income_id),
  paymentDate: toDateString(row.payment_date as string | { value?: string } | null),
  amount: toNumber(row.amount),
  currency: str(row.currency),
  reference: str(row.reference),
  paymentMethod: str(row.payment_method),
  paymentAccountId: str(row.payment_account_id),
  paymentSource: normalizeString(row.payment_source) || 'client_direct',
  notes: str(row.notes),
  recordedAt: toTimestampString(row.recorded_at as string | { value?: string } | null),
  isReconciled: normalizeBoolean(row.is_reconciled),
  reconciliationRowId: str(row.reconciliation_row_id),
  reconciledAt: toTimestampString(row.reconciled_at as string | { value?: string } | null),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null)
})

const mapClientProfile = (row: PostgresClientProfileRow): FinanceClientProfileRecord => {
  let financeContacts: unknown[] = []

  try {
    const parsed = typeof row.finance_contacts === 'string'
      ? JSON.parse(row.finance_contacts)
      : row.finance_contacts

    financeContacts = Array.isArray(parsed) ? parsed : []
  } catch {
    financeContacts = []
  }

  return {
    clientProfileId: normalizeString(row.client_profile_id),
    clientId: str(row.client_id),
    organizationId: str(row.organization_id),
    hubspotCompanyId: str(row.hubspot_company_id),
    taxId: str(row.tax_id),
    taxIdType: str(row.tax_id_type),
    legalName: str(row.legal_name),
    billingAddress: str(row.billing_address),
    billingCountry: str(row.billing_country),
    paymentTermsDays: toNumber(row.payment_terms_days) || 30,
    paymentCurrency: str(row.payment_currency),
    requiresPo: normalizeBoolean(row.requires_po),
    requiresHes: normalizeBoolean(row.requires_hes),
    currentPoNumber: str(row.current_po_number),
    currentHesNumber: str(row.current_hes_number),
    financeContacts,
    specialConditions: str(row.special_conditions),
    createdByUserId: str(row.created_by_user_id),
    createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
    updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: QueryableClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const publishFinanceOutboxEvent = async ({
  client,
  aggregateType,
  aggregateId,
  eventType,
  payload
}: {
  client: QueryableClient
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
}) => {
  await queryRows(
    `
      INSERT INTO greenhouse_sync.outbox_events (
        event_id, aggregate_type, aggregate_id, event_type,
        payload_json, status, occurred_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', CURRENT_TIMESTAMP)
    `,
    [randomUUID(), aggregateType, aggregateId, eventType, JSON.stringify(payload)],
    client
  )
}

// ─── Slice 2 readiness ──────────────────────────────────────────────

const SLICE2_REQUIRED_TABLES = [
  'greenhouse_finance.income',
  'greenhouse_finance.income_payments',
  'greenhouse_finance.expenses',
  'greenhouse_finance.client_profiles',
  'greenhouse_finance.reconciliation_periods',
  'greenhouse_finance.bank_statement_rows'
] as const

let slice2ReadyPromise: Promise<void> | null = null
let slice2ReadyAt = 0
const SLICE2_READY_TTL_MS = 60_000

export const isFinanceSlice2PostgresEnabled = () => isGreenhousePostgresConfigured()

export const assertFinanceSlice2PostgresReady = async () => {
  if (!isFinanceSlice2PostgresEnabled()) {
    throw new FinanceValidationError(
      'Finance Postgres store is not configured in this environment.',
      503,
      { missingConfig: true },
      'FINANCE_POSTGRES_NOT_CONFIGURED'
    )
  }

  if (Date.now() - slice2ReadyAt < SLICE2_READY_TTL_MS) {
    return
  }

  if (slice2ReadyPromise) {
    return slice2ReadyPromise
  }

  slice2ReadyPromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
      `
        SELECT schemaname || '.' || tablename AS qualified_name
        FROM pg_tables
        WHERE schemaname = 'greenhouse_finance'
      `,
      []
    )

    const existing = new Set(rows.map(r => r.qualified_name))
    const missing = SLICE2_REQUIRED_TABLES.filter(t => !existing.has(t))

    if (missing.length > 0) {
      throw new FinanceValidationError(
        'Finance Slice 2 Postgres schema is not ready. Run setup-postgres-finance-slice2 first.',
        503,
        { missingTables: missing },
        'FINANCE_POSTGRES_SCHEMA_NOT_READY'
      )
    }

    slice2ReadyAt = Date.now()
  })().catch(error => {
    slice2ReadyPromise = null
    throw error
  })

  return slice2ReadyPromise.finally(() => {
    slice2ReadyPromise = null
  })
}

// ─── Income: list ───────────────────────────────────────────────────

export const listFinanceIncomeFromPostgres = async ({
  status,
  clientId,
  clientProfileId,
  hubspotCompanyId,
  organizationId,
  serviceLine,
  fromDate,
  toDate,
  incomeType,
  page = 1,
  pageSize = 50
}: {
  status?: string | null
  clientId?: string | null
  clientProfileId?: string | null
  hubspotCompanyId?: string | null
  organizationId?: string | null
  serviceLine?: string | null
  fromDate?: string | null
  toDate?: string | null
  incomeType?: string | null
  page?: number
  pageSize?: number
} = {}) => {
  await assertFinanceSlice2PostgresReady()

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx++
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (status) push('payment_status = $?', status)

  if (clientId || clientProfileId || hubspotCompanyId) {
    const clientConditions: string[] = []

    if (clientId) {
      idx++
      clientConditions.push(`client_id = $${idx}`)
      values.push(clientId)
    }

    if (clientProfileId) {
      idx++
      clientConditions.push(`client_profile_id = $${idx}`)
      values.push(clientProfileId)
    }

    if (hubspotCompanyId) {
      idx++
      clientConditions.push(`hubspot_company_id = $${idx}`)
      values.push(hubspotCompanyId)
    }

    conditions.push(`(${clientConditions.join(' OR ')})`)
  }

  if (organizationId) push('organization_id = $?', organizationId)
  if (serviceLine) push('service_line = $?', serviceLine)
  if (fromDate) push('invoice_date >= $?::date', fromDate)
  if (toDate) push('invoice_date <= $?::date', toDate)
  if (incomeType) push('income_type = $?', incomeType)

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Count
  const countRows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COUNT(*) AS total FROM greenhouse_finance.income ${whereClause}`,
    values
  )

  const total = toNumber(countRows[0]?.total)

  // Page
  idx++
  const limitIdx = idx

  idx++
  const offsetIdx = idx

  values.push(pageSize, (page - 1) * pageSize)

  const rows = await runGreenhousePostgresQuery<PostgresIncomeRow>(
    `
      SELECT
        income_id, client_id, organization_id, client_profile_id, hubspot_company_id, hubspot_deal_id,
        client_name, invoice_number, invoice_date, due_date, description,
        currency, subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp, payment_status, amount_paid,
        collection_method, po_number, hes_number, service_line, income_type,
        is_reconciled, reconciliation_id,
        partner_id, partner_name, partner_share_percent, partner_share_amount, net_after_partner,
        notes, created_by_user_id,
        created_at, updated_at,
        nubox_document_id, nubox_sii_track_id, nubox_emission_status,
        dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
        is_annulled, income_type, nubox_pdf_url, nubox_xml_url, referenced_income_id,
        payment_form, balance_nubox
      FROM greenhouse_finance.income
      ${whereClause}
      ORDER BY invoice_date DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    values
  )

  return { items: rows.map(mapIncome), total, page, pageSize }
}

// ─── Client profiles ────────────────────────────────────────────────

export const getFinanceClientProfileFromPostgres = async (clientProfileId: string) => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresClientProfileRow>(
    `
      SELECT
        client_profile_id,
        client_id,
        organization_id,
        hubspot_company_id,
        tax_id,
        tax_id_type,
        legal_name,
        billing_address,
        billing_country,
        payment_terms_days,
        payment_currency,
        requires_po,
        requires_hes,
        current_po_number,
        current_hes_number,
        finance_contacts,
        special_conditions,
        created_by_user_id,
        created_at,
        updated_at
      FROM greenhouse_finance.client_profiles
      WHERE client_profile_id = $1
      LIMIT 1
    `,
    [clientProfileId]
  )

  return rows[0] ? mapClientProfile(rows[0]) : null
}

export const upsertFinanceClientProfileInPostgres = async ({
  clientProfileId,
  clientId,
  organizationId,
  hubspotCompanyId,
  taxId,
  taxIdType,
  legalName,
  billingAddress,
  billingCountry,
  paymentTermsDays,
  paymentCurrency,
  requiresPo,
  requiresHes,
  currentPoNumber,
  currentHesNumber,
  financeContacts,
  specialConditions,
  createdByUserId,
  client
}: {
  clientProfileId: string
  clientId?: string | null
  organizationId?: string | null
  hubspotCompanyId?: string | null
  taxId?: string | null
  taxIdType?: string | null
  legalName?: string | null
  billingAddress?: string | null
  billingCountry?: string | null
  paymentTermsDays?: number
  paymentCurrency?: string | null
  requiresPo?: boolean
  requiresHes?: boolean
  currentPoNumber?: string | null
  currentHesNumber?: string | null
  financeContacts?: unknown[]
  specialConditions?: string | null
  createdByUserId?: string | null
  client?: QueryableClient
}) => {
  await assertFinanceSlice2PostgresReady()

  const runUpsert = async (txClient: QueryableClient) => {
    let resolvedOrganizationId = organizationId ?? null
    let resolvedClientId = clientId ?? null

    if (!resolvedOrganizationId && resolvedClientId) {
      const organizationRows = await queryRows<{ organization_id: string }>(
        `
          SELECT organization_id
          FROM greenhouse_core.spaces
          WHERE client_id = $1
            AND organization_id IS NOT NULL
            AND active = TRUE
          LIMIT 1
        `,
        [resolvedClientId],
        txClient
      )

      resolvedOrganizationId = organizationRows[0]?.organization_id ?? null
    }

    if (!resolvedOrganizationId && legalName) {
      resolvedOrganizationId = await ensureOrganizationForClient(
        {
          clientId: clientId ?? null,
          hubspotCompanyId: hubspotCompanyId ?? null,
          taxId: taxId ?? null,
          taxIdType: taxIdType ?? null,
          legalName,
          organizationName: legalName,
          country: billingCountry ?? 'CL'
        },
        txClient
      )
    }

    if (resolvedOrganizationId && !resolvedClientId) {
      const clientRows = await queryRows<{ client_id: string | null }>(
        `
          SELECT client_id
          FROM greenhouse_core.spaces
          WHERE organization_id = $1
            AND client_id IS NOT NULL
            AND active = TRUE
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, space_id ASC
          LIMIT 1
        `,
        [resolvedOrganizationId],
        txClient
      )

      resolvedClientId = clientRows[0]?.client_id ?? null
    }

    const rows = await queryRows<PostgresClientProfileRow>(
      `
        INSERT INTO greenhouse_finance.client_profiles (
          client_profile_id,
          client_id,
          organization_id,
          hubspot_company_id,
          tax_id,
          tax_id_type,
          legal_name,
          billing_address,
          billing_country,
          payment_terms_days,
          payment_currency,
          requires_po,
          requires_hes,
          current_po_number,
          current_hes_number,
          finance_contacts,
          special_conditions,
          created_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (client_profile_id) DO UPDATE
        SET
          client_id = COALESCE(EXCLUDED.client_id, greenhouse_finance.client_profiles.client_id),
          organization_id = COALESCE(EXCLUDED.organization_id, greenhouse_finance.client_profiles.organization_id),
          hubspot_company_id = COALESCE(EXCLUDED.hubspot_company_id, greenhouse_finance.client_profiles.hubspot_company_id),
          tax_id = EXCLUDED.tax_id,
          tax_id_type = EXCLUDED.tax_id_type,
          legal_name = EXCLUDED.legal_name,
          billing_address = EXCLUDED.billing_address,
          billing_country = EXCLUDED.billing_country,
          payment_terms_days = EXCLUDED.payment_terms_days,
          payment_currency = EXCLUDED.payment_currency,
          requires_po = EXCLUDED.requires_po,
          requires_hes = EXCLUDED.requires_hes,
          current_po_number = EXCLUDED.current_po_number,
          current_hes_number = EXCLUDED.current_hes_number,
          finance_contacts = EXCLUDED.finance_contacts,
          special_conditions = EXCLUDED.special_conditions,
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          client_profile_id,
          client_id,
          organization_id,
          hubspot_company_id,
          tax_id,
          tax_id_type,
          legal_name,
          billing_address,
          billing_country,
          payment_terms_days,
          payment_currency,
          requires_po,
          requires_hes,
          current_po_number,
          current_hes_number,
          finance_contacts,
          special_conditions,
          created_by_user_id,
          created_at,
          updated_at
      `,
      [
        clientProfileId,
        resolvedClientId,
        resolvedOrganizationId,
        hubspotCompanyId ?? null,
        taxId ?? null,
        taxIdType ?? null,
        legalName ?? null,
        billingAddress ?? null,
        billingCountry ?? 'CL',
        paymentTermsDays ?? 30,
        paymentCurrency ?? 'CLP',
        requiresPo ?? false,
        requiresHes ?? false,
        currentPoNumber ?? null,
        currentHesNumber ?? null,
        JSON.stringify(Array.isArray(financeContacts) ? financeContacts : []),
        specialConditions ?? null,
        createdByUserId ?? null
      ],
      txClient
    )

    return mapClientProfile(rows[0])
  }

  if (client) {
    return runUpsert(client)
  }

  return withGreenhousePostgresTransaction(runUpsert)
}

export const syncFinanceClientProfilesFromPostgres = async ({
  createdByUserId
}: {
  createdByUserId?: string | null
} = {}) => {
  await assertFinanceSlice2PostgresReady()

  await runGreenhousePostgresQuery(
    `
      WITH latest_profiles AS (
        SELECT DISTINCT ON (COALESCE(cp.organization_id, cp.client_profile_id))
          cp.client_profile_id,
          cp.client_id,
          cp.organization_id,
          cp.hubspot_company_id,
          cp.legal_name,
          cp.created_at,
          cp.updated_at
        FROM greenhouse_finance.client_profiles cp
        WHERE cp.organization_id IS NOT NULL
        ORDER BY COALESCE(cp.organization_id, cp.client_profile_id), cp.updated_at DESC, cp.created_at DESC, cp.client_profile_id
      ),
      space_bridge AS (
        SELECT DISTINCT ON (organization_id)
          organization_id,
          client_id
        FROM greenhouse_core.spaces
        WHERE organization_id IS NOT NULL
          AND client_id IS NOT NULL
          AND active = TRUE
        ORDER BY organization_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, space_id ASC
      )
      INSERT INTO greenhouse_finance.client_profiles (
        client_profile_id,
        client_id,
        organization_id,
        hubspot_company_id,
        legal_name,
        billing_country,
        payment_terms_days,
        payment_currency,
        requires_po,
        requires_hes,
        created_by_user_id,
        created_at,
        updated_at
      )
      SELECT
        COALESCE(lp.client_profile_id, sb.client_id, o.hubspot_company_id, o.organization_id),
        COALESCE(lp.client_id, sb.client_id),
        o.organization_id,
        COALESCE(lp.hubspot_company_id, o.hubspot_company_id, sb.client_id, o.organization_id),
        COALESCE(lp.legal_name, o.legal_name, o.organization_name),
        COALESCE(o.country, 'CL'),
        30,
        'CLP',
        FALSE,
        FALSE,
        $1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM greenhouse_core.organizations o
      LEFT JOIN latest_profiles lp ON lp.organization_id = o.organization_id
      LEFT JOIN space_bridge sb ON sb.organization_id = o.organization_id
      WHERE o.active = TRUE
        AND COALESCE(o.organization_type, 'other') IN ('client', 'both')
      ON CONFLICT (client_profile_id) DO UPDATE
      SET
        client_id = COALESCE(greenhouse_finance.client_profiles.client_id, EXCLUDED.client_id),
        organization_id = COALESCE(greenhouse_finance.client_profiles.organization_id, EXCLUDED.organization_id),
        hubspot_company_id = COALESCE(greenhouse_finance.client_profiles.hubspot_company_id, EXCLUDED.hubspot_company_id),
        legal_name = COALESCE(greenhouse_finance.client_profiles.legal_name, EXCLUDED.legal_name),
        billing_country = COALESCE(greenhouse_finance.client_profiles.billing_country, EXCLUDED.billing_country),
        updated_at = CURRENT_TIMESTAMP
    `,
    [createdByUserId ?? 'sync']
  )

  const rows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COUNT(*) AS total FROM greenhouse_finance.client_profiles`,
    []
  )

  return {
    total: toNumber(rows[0]?.total)
  }
}

// ─── Income: get by ID ──────────────────────────────────────────────

export const getFinanceIncomeFromPostgres = async (incomeId: string) => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresIncomeRow>(
    `
      SELECT
        income_id, client_id, organization_id, client_profile_id, hubspot_company_id, hubspot_deal_id,
        client_name, invoice_number, invoice_date, due_date, description,
        currency, subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp, payment_status, amount_paid,
        collection_method, po_number, hes_number, service_line, income_type,
        is_reconciled, reconciliation_id,
        partner_id, partner_name, partner_share_percent, partner_share_amount, net_after_partner,
        notes, created_by_user_id,
        created_at, updated_at,
        nubox_document_id, nubox_sii_track_id, nubox_emission_status,
        dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
        is_annulled, income_type, nubox_pdf_url, nubox_xml_url, referenced_income_id,
        payment_form, balance_nubox
      FROM greenhouse_finance.income
      WHERE income_id = $1
      LIMIT 1
    `,
    [incomeId]
  )

  if (rows.length === 0) return null

  const income = mapIncome(rows[0])

  // Fetch payments from the proper income_payments table
  const paymentRows = await runGreenhousePostgresQuery<PostgresIncomePaymentRow>(
    `
      SELECT
        payment_id, income_id, payment_date, amount, currency, reference,
        payment_method, payment_account_id, payment_source, notes,
        recorded_at, is_reconciled, reconciliation_row_id, reconciled_at,
        created_at
      FROM greenhouse_finance.income_payments
      WHERE income_id = $1
      ORDER BY payment_date DESC, created_at DESC
    `,
    [incomeId]
  )

  return {
    ...income,
    paymentsReceived: paymentRows.map(mapIncomePayment)
  }
}

// ─── Income: create ─────────────────────────────────────────────────

export const createFinanceIncomeInPostgres = async ({
  incomeId,
  clientId,
  organizationId,
  clientProfileId,
  hubspotCompanyId,
  hubspotDealId,
  clientName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  description,
  currency,
  subtotal,
  taxRate,
  taxAmount,
  totalAmount,
  exchangeRateToClp,
  totalAmountClp,
  paymentStatus,
  poNumber,
  hesNumber,
  serviceLine,
  incomeType,
  partnerId,
  partnerName,
  partnerSharePercent,
  partnerShareAmount,
  netAfterPartner,
  notes,
  actorUserId
}: {
  incomeId: string
  clientId: string | null
  organizationId: string | null
  clientProfileId: string | null
  hubspotCompanyId: string | null
  hubspotDealId: string | null
  clientName: string
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  description: string | null
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  exchangeRateToClp: number
  totalAmountClp: number
  paymentStatus: string
  poNumber: string | null
  hesNumber: string | null
  serviceLine: string | null
  incomeType: string
  partnerId: string | null
  partnerName: string | null
  partnerSharePercent: number | null
  partnerShareAmount: number | null
  netAfterPartner: number | null
  notes: string | null
  actorUserId: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const rows = await queryRows<PostgresIncomeRow>(
      `
        INSERT INTO greenhouse_finance.income (
          income_id, client_id, organization_id, client_profile_id, hubspot_company_id, hubspot_deal_id,
          client_name, invoice_number, invoice_date, due_date, description,
          currency, subtotal, tax_rate, tax_amount, total_amount,
          exchange_rate_to_clp, total_amount_clp,
          payment_status, amount_paid,
          po_number, hes_number, service_line, income_type,
          is_reconciled,
          partner_id, partner_name, partner_share_percent, partner_share_amount, net_after_partner,
          notes, created_by_user_id,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9::date, $10::date, $11,
          $12, $13, $14, $15, $16,
          $17, $18,
          $19, 0,
          $20, $21, $22, $23,
          FALSE,
          $24, $25, $26, $27, $28,
          $29, $30,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
      `,
      [
        incomeId, clientId, organizationId, clientProfileId, hubspotCompanyId, hubspotDealId,
        clientName, invoiceNumber, invoiceDate, dueDate, description,
        currency, subtotal, taxRate, taxAmount, totalAmount,
        exchangeRateToClp, totalAmountClp,
        paymentStatus,
        poNumber, hesNumber, serviceLine, incomeType,
        partnerId, partnerName, partnerSharePercent, partnerShareAmount, netAfterPartner,
        notes, actorUserId
      ],
      client
    )

    const created = mapIncome(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_income',
      aggregateId: incomeId,
      eventType: 'finance.income.created',
      payload: created
    })

    return created
  })
}

// ─── Income: update ─────────────────────────────────────────────────

export const updateFinanceIncomeInPostgres = async (
  incomeId: string,
  updates: Record<string, unknown>
) => {
  await assertFinanceSlice2PostgresReady()

  // Map camelCase body keys → snake_case column names
  const fieldMap: Record<string, string> = {
    clientId: 'client_id',
    organizationId: 'organization_id',
    clientProfileId: 'client_profile_id',
    hubspotCompanyId: 'hubspot_company_id',
    hubspotDealId: 'hubspot_deal_id',
    clientName: 'client_name',
    invoiceNumber: 'invoice_number',
    invoiceDate: 'invoice_date',
    dueDate: 'due_date',
    description: 'description',
    currency: 'currency',
    subtotal: 'subtotal',
    taxRate: 'tax_rate',
    taxAmount: 'tax_amount',
    totalAmount: 'total_amount',
    exchangeRateToClp: 'exchange_rate_to_clp',
    totalAmountClp: 'total_amount_clp',
    paymentStatus: 'payment_status',
    amountPaid: 'amount_paid',
    poNumber: 'po_number',
    hesNumber: 'hes_number',
    serviceLine: 'service_line',
    incomeType: 'income_type',
    notes: 'notes'
  }

  const dateColumns = new Set(['invoice_date', 'due_date'])
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  for (const [bodyKey, value] of Object.entries(updates)) {
    const col = fieldMap[bodyKey]

    if (!col) continue

    if (dateColumns.has(col)) {
      setClauses.push(`${col} = $${paramIdx}::date`)
    } else {
      setClauses.push(`${col} = $${paramIdx}`)
    }

    values.push(value)
    paramIdx++
  }

  if (setClauses.length === 0) return null

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(incomeId)

  return withGreenhousePostgresTransaction(async client => {
    const rows = await queryRows<PostgresIncomeRow>(
      `
        UPDATE greenhouse_finance.income
        SET ${setClauses.join(', ')}
        WHERE income_id = $${paramIdx}
        RETURNING *
      `,
      values,
      client
    )

    if (rows.length === 0) return null

    const updated = mapIncome(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_income',
      aggregateId: incomeId,
      eventType: 'finance.income.updated',
      payload: updated
    })

    return updated
  })
}

// ─── Expenses: update ───────────────────────────────────────────────

export const updateFinanceExpenseInPostgres = async (
  expenseId: string,
  updates: Record<string, unknown>
) => {
  await assertFinanceSlice2PostgresReady()

  const fieldMap: Record<string, string> = {
    clientId: 'client_id',
    spaceId: 'space_id',
    expenseType: 'expense_type',
    sourceType: 'source_type',
    description: 'description',
    currency: 'currency',
    subtotal: 'subtotal',
    taxRate: 'tax_rate',
    taxAmount: 'tax_amount',
    totalAmount: 'total_amount',
    exchangeRateToClp: 'exchange_rate_to_clp',
    totalAmountClp: 'total_amount_clp',
    paymentDate: 'payment_date',
    paymentStatus: 'payment_status',
    paymentMethod: 'payment_method',
    paymentProvider: 'payment_provider',
    paymentRail: 'payment_rail',
    paymentAccountId: 'payment_account_id',
    paymentReference: 'payment_reference',
    documentNumber: 'document_number',
    documentDate: 'document_date',
    dueDate: 'due_date',
    supplierId: 'supplier_id',
    supplierName: 'supplier_name',
    supplierInvoiceNumber: 'supplier_invoice_number',
    payrollPeriodId: 'payroll_period_id',
    payrollEntryId: 'payroll_entry_id',
    memberId: 'member_id',
    memberName: 'member_name',
    socialSecurityType: 'social_security_type',
    socialSecurityInstitution: 'social_security_institution',
    socialSecurityPeriod: 'social_security_period',
    taxType: 'tax_type',
    taxPeriod: 'tax_period',
    taxFormNumber: 'tax_form_number',
    miscellaneousCategory: 'miscellaneous_category',
    serviceLine: 'service_line',
    isRecurring: 'is_recurring',
    recurrenceFrequency: 'recurrence_frequency',
    costCategory: 'cost_category',
    costIsDirect: 'cost_is_direct',
    allocatedClientId: 'allocated_client_id',
    directOverheadScope: 'direct_overhead_scope',
    directOverheadKind: 'direct_overhead_kind',
    directOverheadMemberId: 'direct_overhead_member_id',
    notes: 'notes'
  }

  const dateColumns = new Set(['payment_date', 'document_date', 'due_date'])
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  for (const [bodyKey, value] of Object.entries(updates)) {
    const col = fieldMap[bodyKey]

    if (!col) continue

    if (dateColumns.has(col)) {
      setClauses.push(`${col} = $${paramIdx}::date`)
    } else {
      setClauses.push(`${col} = $${paramIdx}`)
    }

    values.push(value)
    paramIdx++
  }

  if (setClauses.length === 0) return null

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(expenseId)

  return withGreenhousePostgresTransaction(async client => {
    const rows = await queryRows<PostgresExpenseRow>(
      `
        UPDATE greenhouse_finance.expenses
        SET ${setClauses.join(', ')}
        WHERE expense_id = $${paramIdx}
        RETURNING *
      `,
      values,
      client
    )

    if (rows.length === 0) return null

    const updated = mapExpense(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_expense',
      aggregateId: expenseId,
      eventType: 'finance.expense.updated',
      payload: updated
    })

    return updated
  })
}

// ─── Income payments: create ────────────────────────────────────────

export const createFinanceIncomePaymentInPostgres = async ({
  incomeId,
  paymentId,
  paymentDate,
  amount,
  reference,
  paymentMethod,
  paymentAccountId,
  paymentSource,
  notes,
  actorUserId
}: {
  incomeId: string
  paymentId: string
  paymentDate: string
  amount: number
  reference: string | null
  paymentMethod: string | null
  paymentAccountId: string | null
  paymentSource?: string
  notes: string | null
  actorUserId: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    // Fetch current income state
    const incomeRows = await queryRows<{
      income_id: string
      currency: string
      total_amount: unknown
      amount_paid: unknown
      payment_status: string
    }>(
      `SELECT income_id, currency, total_amount, amount_paid, payment_status
       FROM greenhouse_finance.income WHERE income_id = $1 FOR UPDATE`,
      [incomeId],
      client
    )

    if (incomeRows.length === 0) {
      throw new FinanceValidationError('Income record not found', 404)
    }

    const income = incomeRows[0]
    const totalAmount = toNumber(income.total_amount)
    const currentAmountPaid = toNumber(income.amount_paid)
    const nextAmountPaid = roundCurrency(currentAmountPaid + amount)

    if (nextAmountPaid - totalAmount > 0.01) {
      throw new FinanceValidationError('Payment amount exceeds pending balance.', 409)
    }

    // Insert into income_payments table
    const paymentRows = await queryRows<PostgresIncomePaymentRow>(
      `
        INSERT INTO greenhouse_finance.income_payments (
          payment_id, income_id, payment_date, amount, currency, reference,
          payment_method, payment_account_id, payment_source, notes,
          recorded_by_user_id, recorded_at,
          is_reconciled, created_at
        )
        VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP)
        RETURNING *
      `,
      [
        paymentId, incomeId, paymentDate, amount,
        normalizeString(income.currency), reference,
        paymentMethod, paymentAccountId,
        paymentSource || 'client_direct', notes,
        actorUserId
      ],
      client
    )

    // Update income totals and status
    const nextPaymentStatus = nextAmountPaid >= totalAmount - 0.01
      ? 'paid'
      : nextAmountPaid > 0
        ? 'partial'
        : normalizeString(income.payment_status) || 'pending'

    await queryRows(
      `
        UPDATE greenhouse_finance.income
        SET amount_paid = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE income_id = $1
      `,
      [incomeId, nextAmountPaid, nextPaymentStatus],
      client
    )

    const payment = mapIncomePayment(paymentRows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_income_payment',
      aggregateId: paymentId,
      eventType: 'finance.income_payment.created',
      payload: { ...payment, nextPaymentStatus, nextAmountPaid }
    })

    return {
      incomeId,
      paymentId: payment.paymentId,
      paymentStatus: nextPaymentStatus,
      amountPaid: nextAmountPaid,
      amountPending: roundCurrency(totalAmount - nextAmountPaid),
      recorded: true
    }
  })
}

// ─── Expenses: list ─────────────────────────────────────────────────

export const listFinanceExpensesFromPostgres = async ({
  expenseType,
  status,
  clientId,
  spaceId,
  memberId,
  supplierId,
  serviceLine,
  fromDate,
  toDate,
  page = 1,
  pageSize = 50
}: {
  expenseType?: string | null
  status?: string | null
  clientId?: string | null
  spaceId?: string | null
  memberId?: string | null
  supplierId?: string | null
  serviceLine?: string | null
  fromDate?: string | null
  toDate?: string | null
  page?: number
  pageSize?: number
} = {}) => {
  await assertFinanceSlice2PostgresReady()

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx++
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (expenseType) push('expense_type = $?', expenseType)
  if (status) push('payment_status = $?', status)
  if (clientId) push('client_id = $?', clientId)
  if (spaceId) push('space_id = $?', spaceId)
  if (memberId) push('member_id = $?', memberId)
  if (supplierId) push('supplier_id = $?', supplierId)
  if (serviceLine) push('service_line = $?', serviceLine)
  if (fromDate) push('COALESCE(document_date, payment_date) >= $?::date', fromDate)
  if (toDate) push('COALESCE(document_date, payment_date) <= $?::date', toDate)

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COUNT(*) AS total FROM greenhouse_finance.expenses ${whereClause}`,
    values
  )

  const total = toNumber(countRows[0]?.total)

  idx++
  const limitIdx = idx

  idx++
  const offsetIdx = idx

  values.push(pageSize, (page - 1) * pageSize)

  const rows = await runGreenhousePostgresQuery<PostgresExpenseRow>(
    `
      SELECT
        expense_id, client_id, space_id, expense_type, source_type, description, currency,
        subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_date, payment_status, payment_method, payment_provider, payment_rail, payment_account_id, payment_reference,
        document_number, document_date, due_date,
        supplier_id, supplier_name, supplier_invoice_number,
        payroll_period_id, payroll_entry_id, member_id, member_name,
        social_security_type, social_security_institution, social_security_period,
        tax_type, tax_period, tax_form_number,
        miscellaneous_category, service_line, is_recurring, recurrence_frequency,
        is_reconciled, reconciliation_id, linked_income_id,
        cost_category, cost_is_direct, allocated_client_id,
        direct_overhead_scope, direct_overhead_kind, direct_overhead_member_id,
        notes, created_by_user_id,
        created_at, updated_at,
        nubox_purchase_id, nubox_document_status, nubox_supplier_rut,
        nubox_supplier_name, nubox_origin, nubox_last_synced_at,
        is_annulled, sii_document_status, nubox_pdf_url, balance_nubox
      FROM greenhouse_finance.expenses
      ${whereClause}
      ORDER BY COALESCE(document_date, payment_date, created_at::date) DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    values
  )

  return { items: rows.map(mapExpense), total, page, pageSize }
}

// ─── Expenses: get by ID ────────────────────────────────────────────

export const getFinanceExpenseFromPostgres = async (expenseId: string) => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresExpenseRow>(
    `
      SELECT
        expense_id, client_id, space_id, expense_type, source_type, description, currency,
        subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_date, payment_status, payment_method, payment_provider, payment_rail, payment_account_id, payment_reference,
        document_number, document_date, due_date,
        supplier_id, supplier_name, supplier_invoice_number,
        payroll_period_id, payroll_entry_id, member_id, member_name,
        social_security_type, social_security_institution, social_security_period,
        tax_type, tax_period, tax_form_number,
        miscellaneous_category, service_line, is_recurring, recurrence_frequency,
        is_reconciled, reconciliation_id, linked_income_id,
        cost_category, cost_is_direct, allocated_client_id,
        direct_overhead_scope, direct_overhead_kind, direct_overhead_member_id,
        notes, created_by_user_id,
        created_at, updated_at,
        nubox_purchase_id, nubox_document_status, nubox_supplier_rut,
        nubox_supplier_name, nubox_origin, nubox_last_synced_at,
        is_annulled, sii_document_status, nubox_pdf_url, balance_nubox
      FROM greenhouse_finance.expenses
      WHERE expense_id = $1
      LIMIT 1
    `,
    [expenseId]
  )

  return rows[0] ? mapExpense(rows[0]) : null
}

// ─── Expenses: create ───────────────────────────────────────────────

export const createFinanceExpenseInPostgres = async ({
  expenseId,
  clientId,
  spaceId,
  expenseType,
  sourceType,
  description,
  currency,
  subtotal,
  taxRate,
  taxAmount,
  totalAmount,
  exchangeRateToClp,
  totalAmountClp,
  paymentDate,
  paymentStatus,
  paymentMethod,
  paymentProvider,
  paymentRail,
  paymentAccountId,
  paymentReference,
  documentNumber,
  documentDate,
  dueDate,
  supplierId,
  supplierName,
  supplierInvoiceNumber,
  payrollPeriodId,
  payrollEntryId,
  memberId,
  memberName,
  socialSecurityType,
  socialSecurityInstitution,
  socialSecurityPeriod,
  taxType,
  taxPeriod,
  taxFormNumber,
  miscellaneousCategory,
  serviceLine,
  isRecurring,
  recurrenceFrequency,
  costCategory,
  costIsDirect,
  allocatedClientId,
  directOverheadScope,
  directOverheadKind,
  directOverheadMemberId,
  notes,
  actorUserId
}: {
  expenseId: string
  clientId: string | null
  spaceId: string | null
  expenseType: string
  sourceType: string | null
  description: string
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  exchangeRateToClp: number
  totalAmountClp: number
  paymentDate: string | null
  paymentStatus: string
  paymentMethod: string | null
  paymentProvider: string | null
  paymentRail: string | null
  paymentAccountId: string | null
  paymentReference: string | null
  documentNumber: string | null
  documentDate: string | null
  dueDate: string | null
  supplierId: string | null
  supplierName: string | null
  supplierInvoiceNumber: string | null
  payrollPeriodId: string | null
  payrollEntryId: string | null
  memberId: string | null
  memberName: string | null
  socialSecurityType: string | null
  socialSecurityInstitution: string | null
  socialSecurityPeriod: string | null
  taxType: string | null
  taxPeriod: string | null
  taxFormNumber: string | null
  miscellaneousCategory: string | null
  serviceLine: string | null
  isRecurring: boolean
  recurrenceFrequency: string | null
  costCategory: string | null
  costIsDirect: boolean
  allocatedClientId: string | null
  directOverheadScope: string | null
  directOverheadKind: string | null
  directOverheadMemberId: string | null
  notes: string | null
  actorUserId: string | null
}) => {
  await assertFinanceSlice2PostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const rows = await queryRows<PostgresExpenseRow>(
      `
        INSERT INTO greenhouse_finance.expenses (
          expense_id, client_id, space_id, expense_type, source_type, description, currency,
          subtotal, tax_rate, tax_amount, total_amount,
          exchange_rate_to_clp, total_amount_clp,
          payment_date, payment_status, payment_method, payment_provider, payment_rail, payment_account_id, payment_reference,
          document_number, document_date, due_date,
          supplier_id, supplier_name, supplier_invoice_number,
          payroll_period_id, payroll_entry_id, member_id, member_name,
          social_security_type, social_security_institution, social_security_period,
          tax_type, tax_period, tax_form_number,
          miscellaneous_category, service_line, is_recurring, recurrence_frequency,
          is_reconciled,
          cost_category, cost_is_direct, allocated_client_id,
          direct_overhead_scope, direct_overhead_kind, direct_overhead_member_id,
          notes, created_by_user_id,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13,
          $14::date, $15, $16, $17, $18, $19, $20,
          $21, $22::date, $23::date,
          $24, $25, $26,
          $27, $28, $29, $30,
          $31, $32, $33,
          $34, $35, $36, $37, $38, $39, $40,
          FALSE,
          $41, $42, $43,
          $44, $45, $46,
          $47, $48,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
      `,
      [
        expenseId, clientId, spaceId, expenseType, sourceType, description, currency,
        subtotal, taxRate, taxAmount, totalAmount,
        exchangeRateToClp, totalAmountClp,
        paymentDate, paymentStatus, paymentMethod, paymentProvider, paymentRail, paymentAccountId, paymentReference,
        documentNumber, documentDate, dueDate,
        supplierId, supplierName, supplierInvoiceNumber,
        payrollPeriodId, payrollEntryId, memberId, memberName,
        socialSecurityType, socialSecurityInstitution, socialSecurityPeriod,
        taxType, taxPeriod, taxFormNumber,
        miscellaneousCategory, serviceLine, isRecurring, recurrenceFrequency,
        costCategory, costIsDirect, allocatedClientId,
        directOverheadScope, directOverheadKind, directOverheadMemberId,
        notes, actorUserId
      ],
      client
    )

    const created = mapExpense(rows[0])

    await publishFinanceOutboxEvent({
      client,
      aggregateType: 'finance_expense',
      aggregateId: expenseId,
      eventType: 'finance.expense.created',
      payload: created
    })

    // Fire-and-forget auto-allocation for payroll/infrastructure expenses
    tryAutoAllocateExpense({
      expenseId,
      expenseType,
      memberId: memberId ?? null,
      clientId: clientId ?? null,
      costCategory: costCategory ?? null,
      totalAmountClp
    }).catch(err => console.error('[auto-allocation] Failed:', err))

    return created
  })
}

// ─── Income payments: list by income ────────────────────────────────

export const listFinanceIncomePaymentsFromPostgres = async (incomeId: string) => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresIncomePaymentRow>(
    `
      SELECT
        payment_id, income_id, payment_date, amount, currency, reference,
        payment_method, payment_account_id, payment_source, notes,
        recorded_at, is_reconciled, reconciliation_row_id, reconciled_at,
        created_at
      FROM greenhouse_finance.income_payments
      WHERE income_id = $1
      ORDER BY payment_date DESC, created_at DESC
    `,
    [incomeId]
  )

  return rows.map(mapIncomePayment)
}

// ─── Sequence ID generation (Postgres variant) ──────────────────────

export const buildMonthlySequenceIdFromPostgres = async ({
  tableName,
  idColumn,
  prefix,
  period
}: {
  tableName: string
  idColumn: string
  prefix: string
  period: string
}) => {
  await assertFinanceSlice2PostgresReady()

  const pattern = `^${prefix}-${period}-(\\d{3})$`

  const rows = await runGreenhousePostgresQuery<{ next_seq: string }>(
    `
      SELECT COALESCE(
        MAX(
          (regexp_match(${idColumn}, $1))[1]::integer
        ),
        0
      ) + 1 AS next_seq
      FROM greenhouse_finance.${tableName}
      WHERE ${idColumn} ~ $1
    `,
    [pattern]
  )

  const nextSeq = Math.max(1, Math.trunc(toNumber(rows[0]?.next_seq)))

  return `${prefix}-${period}-${String(nextSeq).padStart(3, '0')}`
}
