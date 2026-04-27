import type { FinanceCurrency } from '@/lib/finance/shared'

export type PaymentInstrumentSensitiveField = 'accountNumberFull' | 'providerIdentifier'

export type PaymentInstrumentAccountRow = {
  account_id: string
  space_id: string | null
  account_name: string
  bank_name: string
  account_number: string | null
  account_number_full: string | null
  currency: string
  account_type: string
  country_code: string
  is_active: boolean
  opening_balance: unknown
  opening_balance_date: string | Date | null
  notes: string | null
  instrument_category: string
  provider_slug: string | null
  provider_identifier: string | null
  card_last_four: string | null
  card_network: string | null
  credit_limit: unknown
  responsible_user_id: string | null
  default_for: string[] | null
  display_order: unknown
  metadata_json: unknown
  created_at: string | Date | null
  updated_at: string | Date | null
}

export type PaymentInstrumentRecord = {
  accountId: string
  spaceId: string | null
  accountName: string
  bankName: string
  accountNumber: string | null
  accountNumberFull: string | null
  currency: FinanceCurrency | string
  accountType: string
  country: string
  isActive: boolean
  openingBalance: number
  openingBalanceDate: string | null
  notes: string | null
  instrumentCategory: string
  providerSlug: string | null
  providerIdentifier: string | null
  cardLastFour: string | null
  cardNetwork: string | null
  creditLimit: number | null
  responsibleUserId: string | null
  defaultFor: string[]
  displayOrder: number
  metadataJson: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
}

export type PaymentInstrumentSafeRecord = Omit<
  PaymentInstrumentRecord,
  'accountNumberFull' | 'providerIdentifier'
> & {
  accountNumberFull: null
  providerIdentifier: string | null
  sensitiveFields: Record<PaymentInstrumentSensitiveField, {
    available: boolean
    maskedValue: string | null
  }>
}

export type PaymentInstrumentImpactSection = {
  key:
    | 'incomePayments'
    | 'expensePayments'
    | 'settlements'
    | 'reconciliation'
    | 'balances'
  label: string
  status: 'ready' | 'degraded'
  count: number
  amountClp: number | null
  lastActivityAt: string | null
  error?: string
}

export type PaymentInstrumentImpactSummary = {
  accountId: string
  sections: PaymentInstrumentImpactSection[]
  relatedRecords: number
  degraded: boolean
}

export type PaymentInstrumentAuditAction =
  | 'created'
  | 'updated'
  | 'deactivated'
  | 'reactivated'
  | 'revealed_sensitive'

export type PaymentInstrumentUpdateInput = Partial<{
  accountName: string
  bankName: string
  currency: FinanceCurrency
  accountType: string
  country: string
  isActive: boolean
  openingBalance: number
  openingBalanceDate: string | null
  accountNumber: string | null
  accountNumberFull: string | null
  notes: string | null
  instrumentCategory: string
  providerSlug: string | null
  providerIdentifier: string | null
  cardLastFour: string | null
  cardNetwork: string | null
  creditLimit: number | null
  responsibleUserId: string | null
  defaultFor: string[]
  displayOrder: number
  metadataJson: Record<string, unknown>
}>

export type PaymentInstrumentAdminAccount = {
  accountId: string
  accountName: string
  bankName: string
  instrumentCategory: string
  providerSlug: string | null
  providerName: string | null
  currency: string
  country: string
  isActive: boolean
  openingBalance: number
  openingBalanceDate: string | null
  accountType: string
  accountNumberMasked: string | null
  providerIdentifierMasked: string | null
  cardLastFour: string | null
  cardNetwork: string | null
  creditLimit: number | null
  responsibleUserId: string | null
  defaultFor: string[]
  displayOrder: number
  notes: string | null
  metadataJsonSafe: Record<string, string | number | boolean | null>
  createdAt: string | null
  updatedAt: string | null
}

export type PaymentInstrumentImpact = {
  incomePaymentsCount: number
  expensePaymentsCount: number
  settlementGroupsCount: number
  settlementLegsCount: number
  balancesCount: number
  closedBalancesCount: number
  closedPeriodsCount: number
  latestBalanceDate: string | null
  latestMovementAt: string | null
  highImpactMutationRequired: boolean
}

export type PaymentInstrumentReadinessCheck = {
  key: string
  label: string
  status: 'pass' | 'warning' | 'fail'
  helper: string
}

export type PaymentInstrumentTreasury = {
  currentBalance: {
    amount: number
    currency: string
    asOf: string | null
  } | null
  recentMovements: Array<{
    id: string
    date: string | null
    source: string
    direction: 'in' | 'out'
    amount: number
    currency: string
    description: string
    reconciled: boolean
  }>
  history: Array<{
    period: string
    balance: number
    inflows: number
    outflows: number
  }>
}

export type PaymentInstrumentAuditEntry = {
  auditId: string
  accountId: string
  action: string
  fieldName: string | null
  actorUserId: string | null
  reason: string | null
  diff: Record<string, unknown>
  impact: Record<string, unknown>
  createdAt: string
}

export type PaymentInstrumentAdminDetail = {
  account: PaymentInstrumentAdminAccount
  readiness: {
    status: 'ready' | 'at_risk' | 'needs_configuration' | 'inactive'
    checks: PaymentInstrumentReadinessCheck[]
  }
  impact: PaymentInstrumentImpact
  treasury: PaymentInstrumentTreasury | null
  audit: PaymentInstrumentAuditEntry[]
  capabilities: {
    read: boolean
    update: boolean
    manageDefaults: boolean
    deactivate: boolean
    revealSensitive: boolean
  }
  sections: {
    account: 'ok' | 'partial'
    impact: 'ok' | 'partial'
    treasury: 'ok' | 'partial'
    audit: 'ok' | 'partial'
  }
  sectionErrors: Array<{
    section: keyof PaymentInstrumentAdminDetail['sections']
    message: string
  }>
}
