import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import type { EntitlementAction, EntitlementCapabilityKey, EntitlementScope } from '@/config/entitlements-catalog'
import { can } from '@/lib/entitlements/runtime'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { KNOWLEDGE_FEEDBACK_KINDS } from '@/lib/knowledge/constants'
import {
  getKnowledgeDocumentById,
  getKnowledgeDocumentVersion,
  listKnowledgeChunksForVersion,
  listKnowledgeDocumentsByMetadata,
  recordKnowledgeFeedback
} from '@/lib/knowledge/store'
import { searchKnowledge } from '@/lib/knowledge/search/search-knowledge'
import {
  requiredCapabilityForKnowledgeSearchMode,
  resolveKnowledgeSearchMode
} from '@/lib/knowledge/search/mode'
import type { KnowledgeRetrievalPacket, KnowledgeSearchSubject } from '@/lib/knowledge/search'
import type {
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeFeedbackKind,
  KnowledgePublicationStatus
} from '@/lib/knowledge/types'

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

// publication_status visible para humanos. draft/review/quarantined NUNCA salen
// (anti-oracle: un doc no visible responde 404, no 403).
const HUMAN_VISIBLE_STATUSES: KnowledgePublicationStatus[] = ['published', 'stale', 'deprecated']

const KNOWLEDGE_READ_CAPABILITIES: EntitlementCapabilityKey[] = [
  'knowledge.document.read',
  'knowledge.agentic.retrieve',
  'knowledge.feedback.submit'
]

const audienceEnvelope = (tenant: TenantContext): string[] =>
  tenant.tenantType === 'client' ? ['client', 'mixed'] : ['internal', 'mixed']

const assertCapability = (
  tenant: TenantContext,
  capability: EntitlementCapabilityKey,
  action: EntitlementAction,
  scope: EntitlementScope
): void => {
  if (!can(tenant, capability, action, scope)) {
    throw new ApiPlatformError('You do not have access to the knowledge corpus.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }
}

const buildKnowledgeSearchSubject = (tenant: TenantContext): KnowledgeSearchSubject => ({
  userId: tenant.userId,
  tenantType: tenant.tenantType,
  tenantId: tenant.clientId ?? null,
  roleCodes: tenant.roleCodes,
  routeGroups: tenant.routeGroups,
  capabilities: KNOWLEDGE_READ_CAPABILITIES.filter(capability => {
    if (capability === 'knowledge.agentic.retrieve') {
      return can(tenant, capability, 'read', 'all')
    }

    if (capability === 'knowledge.feedback.submit') {
      return can(tenant, capability, 'create', 'tenant')
    }

    return can(tenant, capability, 'read', 'tenant')
  })
})

const isDocumentVisibleToTenant = (document: KnowledgeDocument, tenant: TenantContext): boolean =>
  HUMAN_VISIBLE_STATUSES.includes(document.publicationStatus) &&
  audienceEnvelope(tenant).includes(document.audience)

// ---------------------------------------------------------------------------
// Document DTO (browse + detail share the safe shape — no raw rows to the client)
// ---------------------------------------------------------------------------

interface KnowledgeDocumentSummary {
  documentId: string
  publicId: string
  slug: string
  title: string
  documentType: KnowledgeDocumentType
  ownerDomain: string
  audience: string
  sensitivity: string
  publicationStatus: KnowledgePublicationStatus
  agenticPolicy: string
  humanUrl: string | null
  lastReviewedAt: string | null
  docLayer: string | null
}

const toDocumentSummary = (document: KnowledgeDocument): KnowledgeDocumentSummary => ({
  documentId: document.documentId,
  publicId: document.publicId,
  slug: document.slug,
  title: document.title,
  documentType: document.documentType,
  ownerDomain: document.ownerDomain,
  audience: document.audience,
  sensitivity: document.sensitivity,
  publicationStatus: document.publicationStatus,
  agenticPolicy: document.agenticPolicy,
  humanUrl: document.humanUrl,
  lastReviewedAt: document.lastReviewedAt,
  docLayer: document.docLayer
})

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/** GET /api/platform/app/knowledge/search — packet versionado knowledge-search.v1. */
export const getAppKnowledgeSearchPayload = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}): Promise<KnowledgeRetrievalPacket> => {
  const url = new URL(request.url)
  const queryText = url.searchParams.get('q') ?? url.searchParams.get('query') ?? ''
  const mode = resolveKnowledgeSearchMode(url.searchParams.get('mode'))

  // Capability por modo (Delta B): human=document.read, agentic=agentic.retrieve.
  const capability = requiredCapabilityForKnowledgeSearchMode(mode)

  assertCapability(
    context.tenant,
    capability,
    'read',
    mode === 'agentic' ? 'all' : 'tenant'
  )

  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined

  return searchKnowledge({
    query: queryText,
    subject: buildKnowledgeSearchSubject(context.tenant),
    mode,
    limit
  })
}

/** GET /api/platform/app/knowledge/documents — browse/list por metadata (Full API Parity #1). */
export const getAppKnowledgeDocumentsPayload = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}): Promise<{ items: KnowledgeDocumentSummary[]; total: number }> => {
  assertCapability(context.tenant, 'knowledge.document.read', 'read', 'tenant')

  const url = new URL(request.url)
  const documentType = url.searchParams.get('documentType') ?? undefined
  const publicationStatus = url.searchParams.get('publicationStatus') ?? undefined
  const agenticPolicy = url.searchParams.get('agenticPolicy') ?? undefined
  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined

  const documents = await listKnowledgeDocumentsByMetadata({
    documentType: documentType as KnowledgeDocumentType | undefined,
    publicationStatus: publicationStatus as KnowledgePublicationStatus | undefined,
    agenticPolicy: agenticPolicy as KnowledgeDocument['agenticPolicy'] | undefined,
    limit
  })

  // Access guard: solo lo visible al tenant (audience + lifecycle). Nunca draft/quarantined.
  const visible = documents.filter(document => isDocumentVisibleToTenant(document, context.tenant))

  return {
    items: visible.map(toDocumentSummary),
    total: visible.length
  }
}

export interface KnowledgeDocumentSection {
  chunkId: string
  chunkIndex: number
  headingPath: string[]
  citationAnchor: string
  bodyText: string
}

/** GET /api/platform/app/knowledge/documents/:id — read-detail (versión vigente + secciones). */
export const getAppKnowledgeDocumentDetailPayload = async ({
  context,
  documentId
}: {
  context: AppPlatformRequestContext
  documentId: string
}): Promise<{ document: KnowledgeDocumentSummary; sections: KnowledgeDocumentSection[] }> => {
  assertCapability(context.tenant, 'knowledge.document.read', 'read', 'tenant')

  const document = await getKnowledgeDocumentById(documentId)

  // Anti-oracle: no visible (inexistente, draft/quarantined, o audience ajena) => 404.
  if (!document || !isDocumentVisibleToTenant(document, context.tenant)) {
    throw new ApiPlatformError('Knowledge document not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const sections: KnowledgeDocumentSection[] = []

  if (document.currentVersionId) {
    const version = await getKnowledgeDocumentVersion(document.currentVersionId)

    if (version) {
      const chunks = await listKnowledgeChunksForVersion(version.versionId)

      for (const chunk of chunks) {
        sections.push({
          chunkId: chunk.chunkId,
          chunkIndex: chunk.chunkIndex,
          headingPath: chunk.headingPath,
          citationAnchor: chunk.citationAnchor,
          bodyText: chunk.bodyText
        })
      }
    }
  }

  return { document: toDocumentSummary(document), sections }
}

const isFeedbackKind = (value: unknown): value is KnowledgeFeedbackKind =>
  typeof value === 'string' && (KNOWLEDGE_FEEDBACK_KINDS as readonly string[]).includes(value)

/** POST /api/platform/app/knowledge/feedback — contrato compartido humano+Nexa (Full API Parity #5). */
export const submitAppKnowledgeFeedbackPayload = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}): Promise<{ feedbackId: string }> => {
  assertCapability(context.tenant, 'knowledge.feedback.submit', 'create', 'tenant')

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    throw new ApiPlatformError('Invalid JSON body.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  if (!isFeedbackKind(body.feedbackKind)) {
    throw new ApiPlatformError('Unknown feedback kind.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const documentId = typeof body.documentId === 'string' ? body.documentId : null
  const chunkId = typeof body.chunkId === 'string' ? body.chunkId : null

  if (!documentId && !chunkId) {
    throw new ApiPlatformError('Feedback must target a document or a chunk.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const comment = typeof body.comment === 'string' ? body.comment : null

  const feedback = await recordKnowledgeFeedback({
    documentId,
    chunkId,
    feedbackKind: body.feedbackKind,
    submittedByUserId: context.tenant.userId,
    comment,
    context: { lane: 'app', routeKey: context.routeKey }
  })

  return { feedbackId: feedback.feedbackId }
}
