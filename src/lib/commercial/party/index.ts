import 'server-only'

// TASK-535: single public entrypoint for the Commercial Party Lifecycle
// foundation. Downstream modules (TASK-536 sync, TASK-537 endpoints,
// TASK-538 selector, TASK-541 quote-to-cash) should import from here
// instead of reaching into individual files.

export {
  createPartyFromHubSpotCompany,
  HUBSPOT_STAGE_MAP,
  mapHubSpotStage
} from './commands/create-party-from-hubspot-company'
export type { CreatePartyFromHubSpotCompanyInput } from './commands/create-party-from-hubspot-company'

export {
  DEFAULT_HUBSPOT_STAGE_MAP,
  getEffectiveHubSpotStageMap,
  isKnownHubSpotStage,
  normalizeHubSpotStage,
  resolveHubSpotStage
} from './hubspot-lifecycle-mapping'
export type { ResolveHubSpotStageOptions } from './hubspot-lifecycle-mapping'

export { instantiateClientForParty } from './commands/instantiate-client-for-party'
export type { InstantiateClientForPartyInput } from './commands/instantiate-client-for-party'

export { promoteParty } from './commands/promote-party'
export type { PromotePartyInput } from './commands/promote-party'

export { convertQuoteToCash } from './commands/convert-quote-to-cash'
export {
  CONVERT_QUOTE_TO_CASH_TRIGGERS,
  COMMERCIAL_OPERATION_STATUSES,
  QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP,
  QuoteToCashApprovalRequiredError,
  QuoteToCashError,
  QuoteToCashMissingAnchorsError,
  QuotationNotConvertibleError,
  QuotationNotFoundError
} from './commands/convert-quote-to-cash-types'
export type {
  CommercialOperationStatus,
  ConversionTriggeredBy,
  ConvertQuoteToCashActor,
  ConvertQuoteToCashInput,
  ConvertQuoteToCashResult
} from './commands/convert-quote-to-cash-types'

export { createDealFromQuoteContext } from './commands/create-deal-from-quote-context'
export {
  DEAL_CREATE_APPROVAL_THRESHOLD_CLP,
  DEAL_CREATE_ATTEMPT_STATUSES,
  DealCreateContextEmptyError,
  DealCreateError,
  DealCreateGovernanceIncompleteError,
  DealCreateInsufficientPermissionsError,
  DealCreateMappingMissingError,
  DealCreateRateLimitError,
  DealCreateSelectionInvalidError,
  DealCreateValidationError,
  OrganizationHasNoCompanyError
} from './commands/create-deal-types'
export type {
  CreateDealFromQuoteContextInput,
  CreateDealFromQuoteContextResult,
  DealActor,
  DealCreateAttemptStatus
} from './commands/create-deal-types'

export {
  ALLOWED_TRANSITIONS,
  getAllowedNextStages,
  isTerminalStage,
  isTransitionAllowed,
  parseLifecycleStage
} from './lifecycle-state-machine'

export {
  publishClientInstantiated,
  publishPartyCreated,
  publishPartyDemoted,
  publishPartyPromoted
} from './party-events'
export type {
  ClientInstantiatedPayload,
  PartyCreatedPayload,
  PartyDemotedPayload,
  PartyPromotedPayload
} from './party-events'

export {
  findOrganizationByHubSpotCompany,
  organizationHasClient,
  selectOrganizationForLifecycleUpdate
} from './party-store'
export type { OrganizationLifecycleRow } from './party-store'

export { buildTenantEntitlementSubject } from './route-entitlement-subject'

export { searchParties, mergePartySearchItems } from './party-search-reader'
export type {
  PartySearchFilters,
  PartySearchItem,
  PartySearchResult
} from './party-search-reader'

export {
  getPartyLifecycleDetail,
  getPartyLifecycleFunnelMetrics,
  listPartyLifecycleSnapshots,
  materializeAllPartyLifecycleSnapshots,
  materializePartyLifecycleSnapshot,
  materializePartyLifecycleSnapshots,
  resolvePartyLifecycleOrganizationId
} from './party-lifecycle-snapshot-store'
export type {
  ListPartyLifecycleSnapshotsOptions,
  PartyLifecycleConflictEntry,
  PartyLifecycleContractSummary,
  PartyLifecycleDealSummary,
  PartyLifecycleDetail,
  PartyLifecycleFunnelMetrics,
  PartyLifecycleHistoryEntry,
  PartyLifecycleListItem,
  PartyLifecycleQuotationSummary,
  PartyLifecycleSnapshotRecord
} from './party-lifecycle-snapshot-store'

export {
  listPartyLifecycleSweepCandidates,
  runPartyLifecycleInactivitySweep
} from './party-lifecycle-sweep'
export type {
  PartyLifecycleSweepCandidate,
  RunPartyLifecycleSweepOptions,
  RunPartyLifecycleSweepResult
} from './party-lifecycle-sweep'

export { overridePartyLifecycle } from './commands/override-party-lifecycle'
export type { OverridePartyLifecycleInput } from './commands/override-party-lifecycle'

export { resolvePartySyncConflict } from './commands/resolve-party-sync-conflict'
export type {
  ResolvePartySyncConflictAction,
  ResolvePartySyncConflictInput,
  ResolvePartySyncConflictResult
} from './commands/resolve-party-sync-conflict'

export {
  getPartySyncConflictById,
  listPartySyncConflicts,
  updatePartySyncConflictResolution
} from './sync-conflicts-store'
export type {
  ListPartySyncConflictsOptions,
  PartySyncConflictListItem,
  PartySyncConflictResolution,
  PartySyncConflictRow,
  PartySyncConflictType
} from './sync-conflicts-store'

export {
  InsufficientPermissionsError,
  InvalidTransitionError,
  LIFECYCLE_STAGES,
  LIFECYCLE_TRANSITION_SOURCES,
  OrganizationAlreadyHasClientError,
  OrganizationNotFoundError,
  PartyLifecycleError
} from './types'
export type {
  ClientInstantiationResult,
  LifecycleStage,
  LifecycleTransitionSource,
  LifecycleTriggerEntity,
  LifecycleTriggerEntityType,
  PartyActor,
  PartyCreationResult,
  PartyPromotionResult,
  PromoteDirection
} from './types'
