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

export interface ServiceEnablementReceipt {
  version: 1
  operationId: string
  organizationId: string
  actorUserId: string
  fingerprint: string
  created: Array<{ assignmentId: string; moduleKey: string; revision: string }>
  preserved: string[]
}

export interface ServiceEnablementRollbackRequest {
  organizationId: string
  operationId: string
  idempotencyKey: string
}
