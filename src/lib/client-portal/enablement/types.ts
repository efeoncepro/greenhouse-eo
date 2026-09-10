/** Versioned, browser-safe operator contract. Evidence is configuration, never proof of delivery. */
export interface ServiceEnablementRequest {
  organizationId: string
  targets: Array<{ serviceId: string | null; moduleKey: string }>
  personIds: string[]
}

export interface EnablementInventory {
  organization: { id: string; active: boolean }
  observedAt: string
  businessLines: readonly string[]
  services: Array<{ id: string; spaceId: string; active: boolean; status: string; startsAt: string | null; endsAt: string | null }>
  terms: Array<{ id: string; serviceId: string; moduleKeys: string[]; startsAt: string; endsAt: string | null }>
  modules: Array<{ key: string; scope: string; startsAt: string; endsAt: string | null; viewCodes: string[]; dataSources: string[] }>
  assignments: Array<{ id: string; moduleKey: string; status: string; startsAt: string; endsAt: string | null; expiresAt: string | null; revision: string }>
  people: Array<{
    id: string; active: boolean; status: string | null; identityLinked: boolean; lastLoginAt: string | null
    emailDeliverable: boolean; revokedViewCodes: string[]
    preferences: Array<{ category: string; email: boolean; inApp: boolean; mutedUntil: string | null }>
  }>
  sources: Array<{ id: string; kind: 'notion' | 'seo'; active: boolean; reference: string }>
  channels: Array<{ id: string; kind: string; provisioningStatus: string; disabled: boolean }>
}

export interface EnablementIssue {
  code: string
  subject: string
  owner: 'Commercial' | 'Identity' | 'Client Portal' | 'Delivery/Growth' | 'Notifications'
}

export interface ServiceEnablementPreview {
  version: 1
  request: ServiceEnablementRequest
  observedAt: string
  fingerprint: string
  inventory: EnablementInventory
  changes: Array<{ serviceId: string; termsId: string; moduleKey: string; action: 'enable' | 'preserve'; assignmentId: string | null }>
  blockers: EnablementIssue[]
  readiness: EnablementIssue[]
  people: Array<{ id: string; views: Array<{ viewCode: string; before: boolean; after: boolean }> }>
  routes: Array<{ viewCode: string; path: string | null; verification: 'unverified' }>
  canApply: boolean
}

export interface ServiceEnablementApplyRequest {
  proposal: ServiceEnablementRequest
  fingerprint: string
  idempotencyKey: string
}

/**
 * How the attributed human reached the command. `app_session` is a first-party cookie/app token;
 * `delegated_oauth` is a sister-platform bearer minted for that human (RFC 8693 exchange or a human
 * OAuth grant). The actor is always the human; the authority only records the channel and its evidence.
 */
export type ServiceEnablementAuthority =
  | { kind: 'app_session' }
  | { kind: 'delegated_oauth'; clientId: string; accessTokenId: string; correlationId: string }

export interface ServiceEnablementReceipt {
  version: 1
  operationId: string
  organizationId: string
  actorUserId: string
  fingerprint: string
  created: Array<{ assignmentId: string; moduleKey: string; revision: string }>
  preserved: string[]
  /** Added 2026-09-09 (TASK-1852 delegated authority). Receipts stored before then omit it. */
  authority?: ServiceEnablementAuthority
}

export interface ServiceEnablementRollbackRequest {
  organizationId: string
  operationId: string
  idempotencyKey: string
}
