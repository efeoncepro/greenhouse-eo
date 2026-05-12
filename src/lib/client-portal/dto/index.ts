// TASK-822 Slice 1 — Client Portal DTO barrel.
// TASK-825 Slice 1 — Add ResolvedClientPortalModule + AssignmentSource.

export type {
  ClientPortalDataSource,
  ClientPortalReaderClassification,
  ClientPortalReaderMeta,
  ClientPortalReaderOwnerDomain,
  ClientPortalRouteGroup
} from './reader-meta'

export { assertReaderMeta } from './reader-meta'

export type {
  AssignmentSource,
  ResolvedAssignmentStatus,
  ResolvedClientPortalModule
} from './module'
