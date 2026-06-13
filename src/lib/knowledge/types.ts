/**
 * TASK-1081 — Knowledge Platform domain types (pure, client + server safe).
 */

import type {
  KNOWLEDGE_AGENTIC_POLICIES,
  KNOWLEDGE_AUDIENCES,
  KNOWLEDGE_DOC_LAYERS,
  KNOWLEDGE_DOCUMENT_TYPES,
  KNOWLEDGE_FEEDBACK_KINDS,
  KNOWLEDGE_FRESHNESS,
  KNOWLEDGE_PUBLICATION_POLICIES,
  KNOWLEDGE_PUBLICATION_STATUSES,
  KNOWLEDGE_RUN_KINDS,
  KNOWLEDGE_RUN_STATUSES,
  KNOWLEDGE_SENSITIVITIES,
  KNOWLEDGE_SOURCE_KINDS,
  KNOWLEDGE_SOURCE_STATUSES,
  KNOWLEDGE_SOURCE_SYSTEMS,
  KNOWLEDGE_TENANT_SCOPE_TYPES,
  KNOWLEDGE_VERSION_STATUSES
} from './constants'

export type KnowledgeSourceSystem = (typeof KNOWLEDGE_SOURCE_SYSTEMS)[number]
export type KnowledgeSourceKind = (typeof KNOWLEDGE_SOURCE_KINDS)[number]
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number]
export type KnowledgePublicationPolicy = (typeof KNOWLEDGE_PUBLICATION_POLICIES)[number]
export type KnowledgeTenantScopeType = (typeof KNOWLEDGE_TENANT_SCOPE_TYPES)[number]
export type KnowledgeAudience = (typeof KNOWLEDGE_AUDIENCES)[number]
export type KnowledgeSensitivity = (typeof KNOWLEDGE_SENSITIVITIES)[number]
export type KnowledgeDocumentType = (typeof KNOWLEDGE_DOCUMENT_TYPES)[number]
export type KnowledgePublicationStatus = (typeof KNOWLEDGE_PUBLICATION_STATUSES)[number]
export type KnowledgeAgenticPolicy = (typeof KNOWLEDGE_AGENTIC_POLICIES)[number]
export type KnowledgeDocLayer = (typeof KNOWLEDGE_DOC_LAYERS)[number]
export type KnowledgeVersionStatus = (typeof KNOWLEDGE_VERSION_STATUSES)[number]
export type KnowledgeFreshness = (typeof KNOWLEDGE_FRESHNESS)[number]
export type KnowledgeRunKind = (typeof KNOWLEDGE_RUN_KINDS)[number]
export type KnowledgeRunStatus = (typeof KNOWLEDGE_RUN_STATUSES)[number]
export type KnowledgeFeedbackKind = (typeof KNOWLEDGE_FEEDBACK_KINDS)[number]

// ---------------------------------------------------------------------------
// Row shapes (domain camelCase)
// ---------------------------------------------------------------------------

export interface KnowledgeSource {
  sourceId: string
  publicId: string
  sourceSystem: KnowledgeSourceSystem
  sourceKind: KnowledgeSourceKind
  name: string
  tenantScopeType: KnowledgeTenantScopeType
  tenantScopeId: string | null
  audience: KnowledgeAudience
  ownerDomain: string
  secretRef: string | null
  syncEnabled: boolean
  publicationPolicy: KnowledgePublicationPolicy
  lastSyncedAt: string | null
  status: KnowledgeSourceStatus
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocument {
  documentId: string
  publicId: string
  sourceId: string
  slug: string
  title: string
  documentType: KnowledgeDocumentType
  ownerDomain: string
  approverRole: string | null
  audience: KnowledgeAudience
  sensitivity: KnowledgeSensitivity
  /** Lifecycle editorial — ortogonal a `agenticPolicy`. */
  publicationStatus: KnowledgePublicationStatus
  /** Compuerta de retrieval agéntica — ortogonal a `publicationStatus`. */
  agenticPolicy: KnowledgeAgenticPolicy
  currentVersionId: string | null
  humanUrl: string | null
  reviewCadenceDays: number | null
  lastReviewedAt: string | null
  docLayer: KnowledgeDocLayer | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocumentVersion {
  versionId: string
  documentId: string
  versionNumber: number
  sourceUrl: string | null
  sourcePageId: string | null
  checksum: string
  normalizedMarkdown: string
  sensitivity: KnowledgeSensitivity
  versionStatus: KnowledgeVersionStatus
  publishedByUserId: string | null
  publishedAt: string | null
  sourceCreatedAt: string | null
  sourceEditedAt: string | null
  createdAt: string
}

export interface KnowledgeChunk {
  chunkId: string
  documentVersionId: string
  documentId: string
  chunkIndex: number
  headingPath: string[]
  bodyText: string
  citationAnchor: string
  tokenEstimate: number
  allowedScopes: string[]
  audience: KnowledgeAudience
  sensitivity: KnowledgeSensitivity
  freshness: KnowledgeFreshness
  agenticPolicy: KnowledgeAgenticPolicy
  sourcePosition: number | null
  createdAt: string
}

export interface KnowledgePublicationRun {
  runId: string
  sourceId: string | null
  documentId: string | null
  runKind: KnowledgeRunKind
  status: KnowledgeRunStatus
  actor: string | null
  startedAt: string
  finishedAt: string | null
  detailsJson: Record<string, unknown>
  errorSummary: string | null
  createdAt: string
}

export interface KnowledgeFeedback {
  feedbackId: string
  documentId: string | null
  chunkId: string | null
  feedbackKind: KnowledgeFeedbackKind
  submittedByUserId: string | null
  submittedAt: string
  contextJson: Record<string, unknown>
  comment: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Command inputs
// ---------------------------------------------------------------------------

export interface RegisterKnowledgeSourceInput {
  sourceSystem: KnowledgeSourceSystem
  sourceKind: KnowledgeSourceKind
  name: string
  ownerDomain: string
  audience?: KnowledgeAudience
  tenantScopeType?: KnowledgeTenantScopeType
  tenantScopeId?: string | null
  secretRef?: string | null
  publicationPolicy?: KnowledgePublicationPolicy
  syncEnabled?: boolean
  actorUserId?: string | null
}

export interface CreateKnowledgeDocumentInput {
  sourceId: string
  slug: string
  title: string
  documentType: KnowledgeDocumentType
  ownerDomain: string
  approverRole?: string | null
  audience?: KnowledgeAudience
  sensitivity?: KnowledgeSensitivity
  agenticPolicy?: KnowledgeAgenticPolicy
  humanUrl?: string | null
  reviewCadenceDays?: number | null
  docLayer?: KnowledgeDocLayer | null
  actorUserId?: string | null
}

export interface PublishKnowledgeChunkInput {
  headingPath?: string[]
  bodyText: string
  citationAnchor: string
  tokenEstimate?: number
  allowedScopes?: string[]
  sourcePosition?: number | null
}

export interface PublishKnowledgeDocumentVersionInput {
  documentId: string
  checksum: string
  normalizedMarkdown: string
  sourceUrl?: string | null
  sourcePageId?: string | null
  sourceCreatedAt?: string | null
  sourceEditedAt?: string | null
  publishedByUserId?: string | null
  chunks?: PublishKnowledgeChunkInput[]
  actorUserId?: string | null
}

export interface RecordKnowledgeFeedbackInput {
  documentId?: string | null
  chunkId?: string | null
  feedbackKind: KnowledgeFeedbackKind
  submittedByUserId?: string | null
  context?: Record<string, unknown>
  comment?: string | null
}

export interface ListKnowledgeDocumentsFilter {
  sourceId?: string
  documentType?: KnowledgeDocumentType
  audience?: KnowledgeAudience
  sensitivity?: KnowledgeSensitivity
  publicationStatus?: KnowledgePublicationStatus
  agenticPolicy?: KnowledgeAgenticPolicy
  limit?: number
}
