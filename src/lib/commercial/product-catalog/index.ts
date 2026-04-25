import 'server-only'

// TASK-545 Fase A: barrel export for the commercial product catalog sync
// foundation. Downstream modules (TASK-546 handlers, TASK-547 outbound,
// TASK-548 drift) should import from here instead of reaching into files.

export {
  GH_OWNED_FIELDS_CHECKSUM_ORDER,
  computeGhOwnedFieldsChecksum
} from './checksum'

export {
  publishProductCatalogArchived,
  publishProductCatalogCreated,
  publishProductCatalogUnarchived,
  publishProductCatalogUpdated,
  publishProductSyncConflictDetected,
  publishProductSyncConflictResolved
} from './product-catalog-events'

export type {
  ProductCatalogArchivedPayload,
  ProductCatalogCreatedPayload,
  ProductCatalogUnarchivedPayload,
  ProductCatalogUpdatedPayload,
  ProductSyncConflictDetectedPayload,
  ProductSyncConflictResolvedPayload
} from './product-catalog-events'

export {
  countUnresolvedProductSyncConflictsByType,
  insertProductSyncConflict,
  listUnresolvedProductSyncConflicts
} from './product-sync-conflicts-store'

export type {
  InsertConflictInput,
  ListUnresolvedConflictsInput
} from './product-sync-conflicts-store'

export {
  PRODUCT_SOURCE_KINDS,
  PRODUCT_SYNC_CONFLICT_RESOLUTIONS,
  PRODUCT_SYNC_CONFLICT_TYPES,
  ProductAlreadyArchivedError,
  ProductCatalogError,
  ProductNotArchivedError,
  ProductSourceKindMismatchError
} from './types'

export type {
  GhOwnedFieldsSnapshot,
  ProductSourceKind,
  ProductSyncConflictResolution,
  ProductSyncConflictRow,
  ProductSyncConflictType
} from './types'
