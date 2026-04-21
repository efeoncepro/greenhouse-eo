import 'server-only'

// TASK-524: barrel export for the Income → HubSpot Invoice bridge. Callers
// (reactive projection, admin endpoints, tests) import from here instead of
// reaching into individual files.

export {
  publishIncomeHubSpotArtifactAttached,
  publishIncomeHubSpotSyncFailed,
  publishIncomeHubSpotSynced
} from './income-hubspot-events'

export type {
  IncomeHubSpotArtifactAttachedPayload,
  IncomeHubSpotSyncFailedPayload,
  IncomeHubSpotSyncedPayload
} from './income-hubspot-events'

export {
  getIncomeHubSpotSyncTrace,
  pushIncomeToHubSpot
} from './push-income-to-hubspot'

export type { PushIncomeToHubSpotResult } from './push-income-to-hubspot'

export {
  INCOME_HUBSPOT_SYNC_STATUSES,
  IncomeHubSpotBridgeError,
  IncomeNotFoundError
} from './types'

export type {
  IncomeHubSpotAnchors,
  IncomeHubSpotLineItem,
  IncomeHubSpotMirrorPayload,
  IncomeHubSpotSyncStatus,
  IncomeHubSpotSyncTrace
} from './types'
