export type ShareholderAccountStatus = 'active' | 'frozen' | 'closed' | string

export type ShareholderMovementSourceType =
  | 'manual'
  | 'expense'
  | 'income'
  | 'expense_payment'
  | 'income_payment'
  | 'settlement_group'
  | string

export type ShareholderMovementSourceSummary = {
  sourceType: ShareholderMovementSourceType
  sourceId: string | null
  label: string
  subtitle: string | null
  status: string | null
  amount: number | null
  currency: string | null
  date: string | null
  href: string | null
  linkedExpenseId: string | null
  linkedIncomeId: string | null
  linkedPaymentType: 'income_payment' | 'expense_payment' | string | null
  linkedPaymentId: string | null
  sourceSettlementGroupId: string | null
}

export type ShareholderAccountSummary = {
  accountId: string
  accountName: string
  shareholderName: string
  profileId: string | null
  memberId: string | null
  ownershipPercentage: number | null
  status: ShareholderAccountStatus
  balanceClp: number
  currency: string
  lastMovementAt: string | null
  movementCount: number
  notes: string | null
}

export type ShareholderAccountMovement = {
  movementId: string
  accountId?: string
  movementType: string
  direction: 'credit' | 'debit' | string
  amount: number
  amountClp: number | null
  currency: string
  movementDate: string | null
  description: string | null
  evidenceUrl: string | null
  linkedExpenseId: string | null
  linkedIncomeId: string | null
  linkedPaymentId: string | null
  settlementGroupId: string | null
  sourceType: ShareholderMovementSourceType | null
  sourceId: string | null
  source: ShareholderMovementSourceSummary | null
  recordedAt: string | null
}

export type ShareholderAccountBalance = {
  balanceClp: number
  currency: string
  status: ShareholderAccountStatus | null
  lastMovementAt: string | null
  movementCount: number
}
