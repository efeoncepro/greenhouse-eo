import 'server-only'

export type OperationalPlScopeType = 'client' | 'space' | 'organization'

export interface OperationalPlSnapshot {
  snapshotId: string
  scopeType: OperationalPlScopeType
  scopeId: string
  scopeName: string
  periodYear: number
  periodMonth: number
  periodClosed: boolean
  snapshotRevision: number
  currency: 'CLP'
  revenueClp: number
  laborCostClp: number
  directExpenseClp: number
  overheadClp: number
  totalCostClp: number
  grossMarginClp: number
  grossMarginPct: number | null
  headcountFte: number | null
  revenuePerFteClp: number | null
  costPerFteClp: number | null
  computationReason: string | null
  materializedAt: string | null
}

export interface PlComputationResult {
  snapshots: OperationalPlSnapshot[]
  periodClosed: boolean
  snapshotRevision: number
}

export interface OperationalPlFilters {
  year?: number
  month?: number
  scopeType?: OperationalPlScopeType
  scopeId?: string
  periodClosed?: boolean
  limit?: number
}
