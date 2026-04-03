export type FinanceCurrency = 'CLP' | 'USD'

export const VALID_CURRENCIES: FinanceCurrency[] = ['CLP', 'USD']

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
  'financial_cost'
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
