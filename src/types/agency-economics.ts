export interface AgencyEconomicsPeriod {
  year: number
  month: number
  key: string
  label: string
  periodClosed: boolean
}

export interface AgencyEconomicsTotals {
  revenueClp: number
  laborCostClp: number
  directExpenseClp: number
  overheadClp: number
  totalCostClp: number
  grossMarginClp: number
  grossMarginPct: number | null
  payrollRatioPct: number | null
  spaceCount: number
  activeServiceCount: number
}

export interface AgencyEconomicsServiceSummary {
  serviceId: string
  publicId: string | null
  name: string
  pipelineStage: string
  lineaDeServicio: string
  servicioEspecifico: string
  totalCostClp: number | null
  currency: string
  startDate: string | null
  targetEndDate: string | null
}

export interface AgencyEconomicsSpaceRow {
  spaceId: string
  spaceName: string
  organizationId: string | null
  organizationName: string | null
  revenueClp: number
  laborCostClp: number
  directExpenseClp: number
  overheadClp: number
  totalCostClp: number
  grossMarginClp: number
  grossMarginPct: number | null
  payrollRatioPct: number | null
  previousRevenueClp: number
  revenueTrendPct: number | null
  periodClosed: boolean
  snapshotRevision: number
  serviceCount: number
  serviceTotalContractClp: number
  serviceEconomicsStatus: 'pending_task_146'
  services: AgencyEconomicsServiceSummary[]
}

export interface AgencyEconomicsTrendPoint {
  periodYear: number
  periodMonth: number
  label: string
  revenueClp: number
  totalCostClp: number
  grossMarginClp: number
  grossMarginPct: number | null
}

export interface AgencyEconomicsRankingItem {
  spaceId: string
  spaceName: string
  organizationName: string | null
  revenueClp: number
  grossMarginClp: number
  grossMarginPct: number | null
}

export interface AgencyEconomicsPartialState {
  isPartial: boolean
  messages: string[]
}

export interface AgencyEconomicsResponse {
  period: AgencyEconomicsPeriod
  totals: AgencyEconomicsTotals
  bySpace: AgencyEconomicsSpaceRow[]
  trends: AgencyEconomicsTrendPoint[]
  ranking: AgencyEconomicsRankingItem[]
  partialState: AgencyEconomicsPartialState
}
