export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject

export interface JsonObject {
  [key: string]: JsonValue
}

export type StructuredContextKind =
  | 'integration.raw_payload'
  | 'integration.normalized_payload'
  | 'event.replay_context'
  | 'agent.audit_report'
  | 'agent.execution_plan'
  | 'agent.assumption_set'
  | 'agent.result_summary'

export type StructuredContextActorType = 'system' | 'agent' | 'user' | 'integration' | 'worker' | 'migration'

export type StructuredContextDataClassification = 'public' | 'internal' | 'confidential' | 'restricted'

export type StructuredContextAccessScope = 'internal' | 'restricted_ops' | 'restricted_finance' | 'client_safe'

export type StructuredContextRedactionStatus = 'not_needed' | 'redacted' | 'restricted'

export interface StructuredContextScope {
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
}

export interface StructuredContextActorRef {
  type?: StructuredContextActorType | null
  id?: string | null
}

export interface StructuredContextKindPolicy {
  contextKind: StructuredContextKind
  defaultDataClassification: StructuredContextDataClassification
  defaultAccessScope: StructuredContextAccessScope
  defaultRetentionPolicyCode: string
  maxDocumentBytes: number
}

export interface StructuredContextRecord<TDocument extends JsonObject = JsonObject> {
  contextId: string
  publicId: string
  ownerAggregateType: string
  ownerAggregateId: string
  contextKind: StructuredContextKind
  schemaVersion: string
  sourceSystem: string
  producerType: StructuredContextActorType
  producerId: string | null
  scope: StructuredContextScope
  dataClassification: StructuredContextDataClassification
  accessScope: StructuredContextAccessScope
  retentionPolicyCode: string
  redactionStatus: StructuredContextRedactionStatus
  containsPii: boolean
  containsFinancialContext: boolean
  contentHash: string
  idempotencyKey: string | null
  currentVersionNumber: number
  documentBytes: number
  expiresAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  document: TDocument
}

export interface CreateStructuredContextInput<TDocument extends JsonObject = JsonObject> {
  ownerAggregateType: string
  ownerAggregateId: string
  contextKind: StructuredContextKind
  schemaVersion?: string
  sourceSystem: string
  producerType: StructuredContextActorType
  producerId?: string | null
  scope?: StructuredContextScope
  document: TDocument
  dataClassification?: StructuredContextDataClassification
  accessScope?: StructuredContextAccessScope
  retentionPolicyCode?: string
  redactionStatus?: StructuredContextRedactionStatus
  containsPii?: boolean
  containsFinancialContext?: boolean
  containsSecrets?: boolean
  idempotencyKey?: string | null
  expiresAt?: string | null
  createdBy?: StructuredContextActorRef
  updatedBy?: StructuredContextActorRef
}

export interface StructuredContextLookup {
  ownerAggregateType: string
  ownerAggregateId: string
  contextKind?: StructuredContextKind
  includeArchived?: boolean
  limit?: number
}

export interface StructuredContextValidationResult<TDocument extends JsonObject = JsonObject> {
  ok: boolean
  errors: string[]
  normalizedDocument?: TDocument
  contentHash?: string
  documentBytes?: number
}

export interface StructuredContextQuarantineInput {
  ownerAggregateType?: string | null
  ownerAggregateId?: string | null
  contextKind?: StructuredContextKind | null
  sourceSystem?: string | null
  producerType?: StructuredContextActorType | null
  producerId?: string | null
  scope?: StructuredContextScope
  rawDocument?: unknown
  errors: string[]
}

export interface ReactiveReplayContextDocument extends JsonObject {
  runId: string
  status: 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled'
  sourceSystem: string
  triggeredBy: string | null
  sourceObjectType: string | null
  eventsProcessed: number | null
  eventsFailed: number | null
  projectionsTriggered: number | null
  durationMs: number | null
  notes: string | null
  errorMessage: string | null
}
