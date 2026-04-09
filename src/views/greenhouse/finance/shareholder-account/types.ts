export type ShareholderAccountStatus = 'active' | 'frozen' | 'closed' | string

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
  recordedAt: string | null
}

export type ShareholderAccountBalance = {
  balanceClp: number
  currency: string
  status: ShareholderAccountStatus | null
  lastMovementAt: string | null
  movementCount: number
}

