export interface VatMonthlyPosition {
  vatPositionId: string
  periodId: string
  periodYear: number
  periodMonth: number
  spaceId: string
  spaceName: string | null
  debitFiscalAmountClp: number
  creditFiscalAmountClp: number
  nonRecoverableVatAmountClp: number
  netVatPositionClp: number
  debitDocumentCount: number
  creditDocumentCount: number
  nonRecoverableDocumentCount: number
  ledgerEntryCount: number
  materializedAt: string | null
  materializationReason: string | null
}

export interface VatLedgerEntry {
  ledgerEntryId: string
  periodId: string
  periodYear: number
  periodMonth: number
  spaceId: string
  spaceName: string | null
  sourceKind: 'income' | 'expense'
  sourceId: string
  sourcePublicRef: string | null
  sourceDate: string
  currency: string
  taxCode: string
  taxRecoverability: string | null
  vatBucket: 'debit_fiscal' | 'credito_fiscal' | 'iva_no_recuperable'
  taxableAmount: number
  amountDocument: number
  amountClp: number
  spaceResolutionSource: string
}

export interface VatMonthlyPositionPayload {
  position: VatMonthlyPosition
  recentPositions: VatMonthlyPosition[]
  entries: VatLedgerEntry[]
}
