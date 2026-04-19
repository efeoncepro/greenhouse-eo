import 'server-only'

/**
 * TASK-351 — Commercial Intelligence contracts.
 *
 * Shared types for the pipeline + profitability + renewal projections.
 */

export type PipelineStage =
  | 'draft'
  | 'in_review'
  | 'sent'
  | 'approved'
  | 'converted'
  | 'rejected'
  | 'expired'

export interface PipelineSnapshotRow {
  quotationId: string
  clientId: string | null
  organizationId: string | null
  spaceId: string | null

  status: string
  pipelineStage: PipelineStage
  probabilityPct: number

  totalAmountClp: number | null
  quotedMarginPct: number | null
  businessLineCode: string | null
  pricingModel: string | null
  commercialModel: string | null
  staffingModel: string | null
  currency: string | null

  quoteDate: string | null
  sentAt: string | null
  approvedAt: string | null
  expiryDate: string | null
  convertedAt: string | null
  rejectedAt: string | null
  expiredAt: string | null

  daysInStage: number | null
  daysUntilExpiry: number | null
  isRenewalDue: boolean
  isExpired: boolean

  authorizedAmountClp: number | null
  invoicedAmountClp: number | null

  snapshotSourceEvent: string | null
  materializedAt: string
}

export interface DealPipelineSnapshotRow {
  dealId: string
  hubspotDealId: string
  clientId: string | null
  organizationId: string | null
  spaceId: string | null

  dealName: string
  dealstage: string
  dealstageLabel: string | null
  pipelineName: string | null
  dealType: string | null

  amount: number | null
  amountClp: number | null
  currency: string | null
  probabilityPct: number | null
  closeDate: string | null
  daysUntilClose: number | null
  isOpen: boolean
  isWon: boolean

  dealOwnerEmail: string | null

  latestQuoteId: string | null
  latestQuoteStatus: string | null
  latestQuotePricingModel: string | null
  latestQuoteCommercialModel: string | null
  latestQuoteStaffingModel: string | null
  quoteCount: number
  approvedQuoteCount: number
  totalQuotesAmountClp: number | null

  snapshotSourceEvent: string | null
  materializedAt: string
}

export type DriftSeverity = 'aligned' | 'warning' | 'critical'

export interface DriftDrivers {
  authorizedVsQuotedPct?: number | null
  invoicedVsQuotedPct?: number | null
  costVsQuotedPct?: number | null
  realizedVsQuotedPct?: number | null
}

export interface ProfitabilitySnapshotRow {
  quotationId: string
  periodYear: number
  periodMonth: number

  clientId: string | null
  organizationId: string | null
  spaceId: string | null

  quotedTotalClp: number | null
  quotedMarginPct: number | null
  pricingModel: string | null
  commercialModel: string | null
  staffingModel: string | null

  authorizedTotalClp: number | null
  invoicedTotalClp: number | null
  realizedRevenueClp: number | null
  attributedCostClp: number | null

  effectiveMarginPct: number | null
  marginDriftPct: number | null
  driftSeverity: DriftSeverity
  driftDrivers: DriftDrivers

  materializedAt: string
}

export interface RenewalReminderRow {
  quotationId: string
  lastReminderAt: string | null
  reminderCount: number
  nextCheckAt: string | null
  lastEventType: string | null
}

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'terminated'
  | 'completed'
  | 'renewed'

export type ContractQuoteRelationshipType =
  | 'originator'
  | 'renewal'
  | 'modification'
  | 'cancellation'

export interface ContractListRow {
  contractId: string
  contractNumber: string
  clientId: string | null
  clientName: string | null
  organizationId: string | null
  spaceId: string | null
  status: ContractStatus
  commercialModel: string | null
  staffingModel: string | null
  startDate: string
  endDate: string | null
  autoRenewal: boolean
  renewalFrequencyMonths: number | null
  mrrClp: number | null
  arrClp: number | null
  tcvClp: number | null
  acvClp: number | null
  currency: string | null
  originatorQuoteId: string | null
  originatorQuoteNumber: string | null
  quotesCount: number
  linkedDocumentCount: number
  updatedAt: string
}

export interface ContractQuoteRow {
  contractId: string
  quotationId: string
  quotationNumber: string | null
  quoteStatus: string | null
  relationshipType: ContractQuoteRelationshipType
  effectiveFrom: string | null
  effectiveTo: string | null
  quoteDate: string | null
  totalAmountClp: number | null
  pricingModel: string | null
  commercialModel: string | null
  staffingModel: string | null
}

export interface ContractDetailRow extends ContractListRow {
  signedAt: string | null
  terminatedAt: string | null
  terminatedReason: string | null
  renewedAt: string | null
  exchangeRateToClp: number | null
  quotes: ContractQuoteRow[]
  reminder: ContractRenewalReminderRow | null
}

export interface ContractProfitabilitySnapshotRow {
  contractId: string
  periodYear: number
  periodMonth: number
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
  quotedTotalClp: number | null
  quotedMarginPct: number | null
  pricingModel: string | null
  commercialModel: string | null
  staffingModel: string | null
  authorizedTotalClp: number | null
  invoicedTotalClp: number | null
  realizedRevenueClp: number | null
  attributedCostClp: number | null
  effectiveMarginPct: number | null
  marginDriftPct: number | null
  driftSeverity: DriftSeverity
  driftDrivers: DriftDrivers
  materializedAt: string
}

export interface ContractRenewalReminderRow {
  contractId: string
  lastReminderAt: string | null
  reminderCount: number
  nextCheckAt: string | null
  lastEventType: string | null
}

/**
 * TASK-462 — MRR / ARR contractual projection contracts.
 *
 * Shared types for the per-period MRR/ARR snapshot, derived totals,
 * timeline series, and NRR/GRR computation.
 */

export type MrrArrMovementType =
  | 'new'
  | 'expansion'
  | 'contraction'
  | 'churn'
  | 'reactivation'
  | 'unchanged'

export const MRR_ARR_MOVEMENT_TYPES: MrrArrMovementType[] = [
  'new',
  'expansion',
  'contraction',
  'churn',
  'reactivation',
  'unchanged'
]

export interface ContractMrrArrSnapshotRow {
  periodYear: number
  periodMonth: number
  contractId: string
  contractNumber: string | null
  clientId: string | null
  clientName: string | null
  organizationId: string | null
  spaceId: string | null
  businessLineCode: string | null
  commercialModel: string
  staffingModel: string
  mrrClp: number
  arrClp: number
  previousMrrClp: number | null
  mrrDeltaClp: number
  movementType: MrrArrMovementType
  materializedAt: string
}

export interface MrrArrModelAggregate {
  mrrClp: number
  count: number
}

export interface MrrArrMovementAggregate {
  mrrClp: number
  count: number
}

export interface MrrArrPeriodTotals {
  periodYear: number
  periodMonth: number
  mrrClp: number
  arrClp: number
  contractsCount: number
  mrrDeltaFromPrevClp: number
  mrrDeltaPctFromPrev: number | null
  byCommercialModel: Record<string, MrrArrModelAggregate>
  byStaffingModel: Record<string, MrrArrModelAggregate>
  byBusinessLine: Record<string, MrrArrModelAggregate>
  byMovement: Record<MrrArrMovementType, MrrArrMovementAggregate>
}

export interface MrrArrSeriesPoint {
  periodYear: number
  periodMonth: number
  mrrClp: number
  arrClp: number
  contractsCount: number
  movements: Record<MrrArrMovementType, MrrArrMovementAggregate>
}

export interface MrrArrNrrComputation {
  startingMrrClp: number
  endingMrrClp: number
  expansionClp: number
  reactivationClp: number
  contractionClp: number
  churnClp: number
  nrrPct: number | null
  grrPct: number | null
}

export interface MrrArrMovementEntry {
  contractId: string
  contractNumber: string | null
  clientId: string | null
  clientName: string | null
  businessLineCode: string | null
  commercialModel: string
  staffingModel: string
  mrrClp: number
  previousMrrClp: number | null
  mrrDeltaClp: number
  movementType: MrrArrMovementType
}

export const PIPELINE_STAGE_PROBABILITY: Record<PipelineStage, number> = {
  draft: 10,
  in_review: 25,
  sent: 40,
  approved: 75,
  converted: 100,
  rejected: 0,
  expired: 0
}

export const RENEWAL_LOOKAHEAD_DAYS = 60
export const RENEWAL_CADENCE_DAYS = 14
export const DRIFT_WARNING_THRESHOLD_PCT = 5
export const DRIFT_CRITICAL_THRESHOLD_PCT = 15
