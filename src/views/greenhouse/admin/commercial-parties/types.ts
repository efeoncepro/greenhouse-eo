export const COMMERCIAL_PARTY_STAGE_ORDER = [
  'prospect',
  'opportunity',
  'active_client',
  'inactive',
  'provider_only',
  'disqualified',
  'churned'
] as const

export type CommercialPartyStage = (typeof COMMERCIAL_PARTY_STAGE_ORDER)[number]

export const COMMERCIAL_PARTY_STAGE_LABELS: Record<CommercialPartyStage, string> = {
  prospect: 'Prospecto',
  opportunity: 'Opportunity',
  active_client: 'Cliente activo',
  inactive: 'Inactivo',
  provider_only: 'Solo proveedor',
  disqualified: 'Descalificado',
  churned: 'Churned'
}

export const COMMERCIAL_PARTY_STAGE_TONES: Record<
  CommercialPartyStage,
  'success' | 'warning' | 'error' | 'secondary' | 'info'
> = {
  prospect: 'warning',
  opportunity: 'info',
  active_client: 'success',
  inactive: 'secondary',
  provider_only: 'secondary',
  disqualified: 'error',
  churned: 'error'
}

export const COMMERCIAL_PARTY_CONFLICT_TYPE_LABELS = {
  field_authority: 'Field authority',
  anti_ping_pong: 'Anti ping-pong',
  operator_override_hold: 'Operator override hold'
} as const

export const COMMERCIAL_PARTY_CONFLICT_RESOLUTION_LABELS = {
  pending: 'Pendiente',
  resolved_greenhouse_wins: 'Greenhouse gana',
  resolved_hubspot_wins: 'HubSpot gana',
  ignored: 'Ignorado'
} as const

export type CommercialPartyConflictType = keyof typeof COMMERCIAL_PARTY_CONFLICT_TYPE_LABELS
export type CommercialPartyConflictResolution = keyof typeof COMMERCIAL_PARTY_CONFLICT_RESOLUTION_LABELS

export interface CommercialPartyListItem {
  organizationId: string
  commercialPartyId: string
  publicId: string | null
  displayName: string
  legalName: string | null
  lifecycleStage: CommercialPartyStage
  lifecycleStageSince: string
  lifecycleStageSource: string | null
  updatedAt: string
  lastActivityAt: string
  hubspotCompanyId: string | null
  hubspotLifecycleStage: string | null
  hubspotLastActivityAt: string | null
  domain: string | null
  industry: string | null
  clientId: string | null
  pendingConflictCount: number
  lastConflictAt: string | null
  activeQuotes: number
  lastQuoteAt: string | null
  activeContracts: number
  lastContractAt: string | null
}

export interface CommercialPartyConflictItem {
  conflictId: string
  organizationId: string | null
  commercialPartyId: string | null
  hubspotCompanyId: string | null
  displayName: string
  lifecycleStage: CommercialPartyStage | null
  conflictType: CommercialPartyConflictType
  detectedAt: string
  resolutionStatus: CommercialPartyConflictResolution
  resolutionAppliedAt: string | null
  resolvedBy: string | null
  conflictingFields: Record<string, unknown> | null
  metadata: Record<string, unknown>
}

export interface CommercialPartyHistoryItem {
  historyId: string
  fromStage: CommercialPartyStage | null
  toStage: CommercialPartyStage
  transitionSource: string
  transitionedAt: string
  transitionedBy: string | null
  triggerEntityType: string | null
  triggerEntityId: string | null
  metadata: Record<string, unknown>
}

export interface CommercialPartyStageTotals {
  prospect: number
  opportunity: number
  active_client: number
  inactive: number
  provider_only: number
  disqualified: number
  churned: number
}

export interface CommercialPartyDashboardData {
  generatedAt: string
  parties: CommercialPartyListItem[]
  recentConflicts: CommercialPartyConflictItem[]
  stageTotals: CommercialPartyStageTotals
  totalPendingConflicts: number
  conflictedPartyCount: number
  linkedClientCount: number
  candidateBacklogTotal: number
  candidateBacklogByStage: CommercialPartyStageTotals
}

export interface CommercialPartyDetailData {
  party: CommercialPartyListItem
  history: CommercialPartyHistoryItem[]
  conflicts: CommercialPartyConflictItem[]
}

export type CommercialPartySyncHealth = 'aligned' | 'attention' | 'unlinked'

export const buildEmptyStageTotals = (): CommercialPartyStageTotals => ({
  prospect: 0,
  opportunity: 0,
  active_client: 0,
  inactive: 0,
  provider_only: 0,
  disqualified: 0,
  churned: 0
})

export const resolveCommercialPartySyncHealth = (
  party: Pick<
    CommercialPartyListItem,
    'hubspotCompanyId' | 'hubspotLifecycleStage' | 'lifecycleStage' | 'pendingConflictCount'
  >
): CommercialPartySyncHealth => {
  if (!party.hubspotCompanyId) {
    return 'unlinked'
  }

  if (party.pendingConflictCount > 0) {
    return 'attention'
  }

  const normalizedHubSpotStage = party.hubspotLifecycleStage?.trim().toLowerCase() ?? ''

  if (!normalizedHubSpotStage) {
    return 'attention'
  }

  if (
    (party.lifecycleStage === 'prospect' && normalizedHubSpotStage === 'lead') ||
    (party.lifecycleStage === 'opportunity' && normalizedHubSpotStage === 'opportunity') ||
    ((party.lifecycleStage === 'active_client' ||
      party.lifecycleStage === 'inactive' ||
      party.lifecycleStage === 'churned') &&
      normalizedHubSpotStage === 'customer')
  ) {
    return 'aligned'
  }

  return 'attention'
}
