// TASK-990: MXN promoted from pricing-only to finance_core (ADR
// GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1, accepted 2026-06-02). The prior
// `CLP | USD` narrow type was a pre-ADR guard; the ADR's whole purpose is to
// promote MXN. Write paths stay gated by FINANCE_CORE_MXN_ENABLED (default off)
// until schema + readers classify MXN safely (expand-and-contract).
export type FinanceCurrency = 'CLP' | 'USD' | 'MXN'

export const VALID_CURRENCIES: FinanceCurrency[] = ['CLP', 'USD', 'MXN']

// ── TASK-995: indexed unit vs cash currency split ───────────────────────────
// ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1 (accepted 2026-06-20). CLF/UF is a
// reajustable UNIT OF ACCOUNT, never cash: it can denominate a contractual fact
// (the `native` plane) but a UF fact always settles in CLP cash. These aliases
// give callers a semantic, compiler-checkable boundary so CLF can never leak
// into accounts, payment orders or settlement legs. The cash aliases are
// intentionally identical to `FinanceCurrency`; the value is the named intent
// plus the `assertCashCurrency`/`toFinanceNativeUnit` guards in currency-domain.

/** A reajustable unit of account (UF). Denominates facts; never holds cash. */
export type IndexedUnit = 'CLF'
export const INDEXED_UNITS: IndexedUnit[] = ['CLF']

/** Cash currency that actually moves in treasury. CLF is excluded by design. */
export type SettlementCurrency = FinanceCurrency

/** Currency a cash account can be denominated in. CLF excluded by design. */
export type AccountCurrency = FinanceCurrency

/** Currency a payment order header/line can carry. CLF excluded by design. */
export type PaymentOrderCurrency = FinanceCurrency

/** Management reporting plane. Derived from functional CLP (IAS 21). */
export type ReportingCurrency = 'CLP' | 'USD'

/** The `native` plane of a finance fact: a cash currency OR an indexed unit. */
export type FinanceNativeUnit = FinanceCurrency | IndexedUnit

export const FINANCE_NATIVE_UNITS: FinanceNativeUnit[] = [...VALID_CURRENCIES, ...INDEXED_UNITS]

export const QUOTATION_SOURCE_SYSTEMS = ['manual', 'hubspot', 'nubox'] as const
export type QuotationSourceSystem = (typeof QUOTATION_SOURCE_SYSTEMS)[number]

export const QUOTATION_LEGACY_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] as const
export type QuotationLegacyStatus = (typeof QUOTATION_LEGACY_STATUSES)[number]

export const QUOTATION_CANONICAL_STATUSES = [
  'draft',
  'pending_approval',
  'approval_rejected',
  'issued',
  'expired',
  'converted'
] as const
export type QuotationCanonicalStatus = (typeof QUOTATION_CANONICAL_STATUSES)[number]

export const ACCOUNT_TYPES = ['checking', 'savings', 'paypal', 'wise', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const PAYMENT_METHODS = ['transfer', 'credit_card', 'paypal', 'wise', 'check', 'cash', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const EXPENSE_TYPES = [
  'supplier',
  'payroll',
  'social_security',
  'tax',
  'miscellaneous',
  'bank_fee',
  'gateway_fee',
  'financial_cost',
  'factoring_fee',      // Interés variable de cesión de facturas (TASK-391)
  'factoring_advisory'  // Asesoría fija por operación de factoring (TASK-391)
] as const
export type ExpenseType = (typeof EXPENSE_TYPES)[number]

export const SOCIAL_SECURITY_TYPES = ['afp', 'health', 'unemployment', 'mutual', 'caja_compensacion'] as const
export type SocialSecurityType = (typeof SOCIAL_SECURITY_TYPES)[number]

export const TAX_TYPES = [
  'iva_mensual',
  'ppm',
  'renta_anual',
  'patente',
  'contribuciones',
  'retencion_honorarios',
  'other'
] as const
export type TaxType = (typeof TAX_TYPES)[number]

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'written_off'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const EXPENSE_PAYMENT_STATUSES = ['pending', 'scheduled', 'paid', 'overdue', 'cancelled'] as const
export type ExpensePaymentStatus = (typeof EXPENSE_PAYMENT_STATUSES)[number]

export const SERVICE_LINES = ['globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'] as const
export type ServiceLine = (typeof SERVICE_LINES)[number]

export const COST_CATEGORIES = ['direct_labor', 'indirect_labor', 'operational', 'infrastructure', 'tax_social'] as const
export type CostCategoryValue = (typeof COST_CATEGORIES)[number]

export const ALLOCATION_METHODS = ['manual', 'fte_weighted', 'revenue_weighted', 'headcount'] as const
export type AllocationMethodValue = (typeof ALLOCATION_METHODS)[number]

export const SUPPLIER_CATEGORIES = [
  'software', 'infrastructure', 'professional_services', 'media',
  'creative', 'hr_services', 'office', 'legal_accounting', 'other'
] as const
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number]

export const DIRECT_OVERHEAD_SCOPES = ['none', 'member_direct', 'shared'] as const
export type DirectOverheadScope = (typeof DIRECT_OVERHEAD_SCOPES)[number]

export const DIRECT_OVERHEAD_KINDS = [
  'tool_license',
  'tool_usage',
  'equipment',
  'reimbursement',
  'other'
] as const
export type DirectOverheadKind = (typeof DIRECT_OVERHEAD_KINDS)[number]

export const TAX_ID_TYPES = ['RUT', 'NIT', 'RFC', 'RUC', 'EIN', 'OTHER'] as const
export type TaxIdType = (typeof TAX_ID_TYPES)[number]

export const CONTACT_ROLES = ['procurement', 'accounts_payable', 'finance_director', 'controller', 'other'] as const
export type ContactRole = (typeof CONTACT_ROLES)[number]
