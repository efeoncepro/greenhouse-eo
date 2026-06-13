import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { searchKnowledge } from '@/lib/knowledge/search/search-knowledge'
import type { KnowledgeRetrievalPacket, KnowledgeSearchSubject } from '@/lib/knowledge/search'
import {
  getKnowledgeDocumentById,
  getKnowledgeDocumentVersion,
  listKnowledgeChunksForVersion
} from '@/lib/knowledge/store'
import type { KnowledgeDocument, KnowledgePublicationStatus } from '@/lib/knowledge/types'

/**
 * TASK-1086 — Lane ecosystem de Knowledge (downstream de API Platform, consumido por el
 * Greenhouse MCP server).
 *
 * Full API Parity: NO hay lógica de dominio nueva. Reusa el SSOT `searchKnowledge`
 * (modo `agentic`, ya filtra `agent_allowed`/`internal` y excluye `agent_excluded`/
 * `restricted`/`quarantined`) + los readers del store. La única diferencia con el lane
 * `app` (TASK-1083) es la **derivación del subject**: el ecosystem no tiene sesión/roleCodes,
 * tiene un binding sister-platform.
 *
 * NUNCA SQL directo ni Notion directo (lint `greenhouse/no-direct-knowledge-chunk-query`).
 */

const KNOWLEDGE_SEARCH_LIMIT_CAP = 20

// Mirror del filtro agéntico del `WHERE` de `searchKnowledge` (statuses agénticos +
// agent_allowed + sensitivity internal + audience envelope interno), aplicado a una sola
// fila para el read-detail por id (la búsqueda filtra en SQL; el lookup por id no). Mismo
// patrón que `HUMAN_VISIBLE_STATUSES` local del lane app. El test lo bloquea contra drift.
const AGENTIC_VISIBLE_STATUSES: KnowledgePublicationStatus[] = ['published', 'stale']
const INTERNAL_AUDIENCE_ENVELOPE = ['internal', 'mixed']

/**
 * ¿Este documento lo puede ver un agente (read-detail por id)? Un doc `draft`/`deprecated`/
 * `agent_excluded`/`restricted`/`quarantined` o de audience no-interna NUNCA es visible.
 */
export const isDocumentAgenticallyVisible = (document: KnowledgeDocument): boolean =>
  AGENTIC_VISIBLE_STATUSES.includes(document.publicationStatus) &&
  document.agenticPolicy === 'agent_allowed' &&
  document.sensitivity === 'internal' &&
  INTERNAL_AUDIENCE_ENVELOPE.includes(document.audience)

/**
 * Governance gate: el corpus es interno-only (MVP). Solo bindings de scope `internal`
 * pueden recuperar conocimiento agéntico. Un binding tenant-scoped (organization/client/
 * space) NUNCA ve el corpus interno → 403. Default-DENY: exponer conocimiento interno a una
 * plataforma externa es un grant explícito, no implícito. Es un gate de LANE (no per-doc):
 * el anti-oracle 404 per-documento aplica una vez pasado este gate.
 */
const assertInternalKnowledgeScope = (context: ApiPlatformRequestContext): void => {
  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Knowledge retrieval is restricted to internal-scope bindings.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }
}

/**
 * Deriva el `KnowledgeSearchSubject` desde el binding ecosystem. Interno + capability
 * agéntica. El grant es la primera capa de defensa; el filtro del reader (agent_allowed +
 * internal) es la segunda — un binding autorizado NUNCA ve docs sensibles/excluidos.
 */
const buildEcosystemKnowledgeSubject = (context: ApiPlatformRequestContext): KnowledgeSearchSubject => {
  assertInternalKnowledgeScope(context)

  return {
    userId: `sister-platform:${context.consumer.sisterPlatformKey ?? context.consumer.consumerId}`,
    tenantType: 'efeonce_internal',
    tenantId: null,
    roleCodes: [],
    routeGroups: [],
    capabilities: ['knowledge.agentic.retrieve']
  }
}

const resolveLimit = (raw: string | null): number | undefined => {
  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }

  return Math.min(Math.floor(parsed), KNOWLEDGE_SEARCH_LIMIT_CAP)
}

/** GET /api/platform/ecosystem/knowledge/search — retrieval agéntico (packet `knowledge-search.v1`). */
export const getEcosystemKnowledgeSearchPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<KnowledgeRetrievalPacket>> => {
  const subject = buildEcosystemKnowledgeSubject(context)

  const url = new URL(request.url)
  const queryText = (url.searchParams.get('query') ?? '').trim()

  if (!queryText) {
    throw new ApiPlatformError('A non-empty "query" parameter is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const packet = await searchKnowledge({
    query: queryText,
    subject,
    mode: 'agentic',
    limit: resolveLimit(url.searchParams.get('limit'))
  })

  return {
    data: packet,
    meta: { mode: 'agentic', confidence: packet.confidence, freshness: packet.freshness }
  }
}

export interface EcosystemKnowledgeDocumentSection {
  chunkId: string
  chunkIndex: number
  headingPath: string[]
  citationAnchor: string
  bodyText: string
}

export interface EcosystemKnowledgeDocumentSummary {
  documentId: string
  publicId: string
  slug: string
  title: string
  documentType: string
  ownerDomain: string
  audience: string
  sensitivity: string
  publicationStatus: string
  agenticPolicy: string
  humanUrl: string | null
  lastReviewedAt: string | null
}

// DTO seguro: nunca se devuelve la fila cruda. Sin secret_ref ni internals de ingesta.
const toEcosystemDocumentSummary = (document: KnowledgeDocument): EcosystemKnowledgeDocumentSummary => ({
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
  lastReviewedAt: document.lastReviewedAt
})

/** GET /api/platform/ecosystem/knowledge/documents/:id — read-detail agéntico (doc + secciones). */
export const getEcosystemKnowledgeDocumentPayload = async ({
  context,
  documentId
}: {
  context: ApiPlatformRequestContext
  documentId: string
}): Promise<
  ApiPlatformSuccessResult<{
    document: EcosystemKnowledgeDocumentSummary
    sections: EcosystemKnowledgeDocumentSection[]
  }>
> => {
  assertInternalKnowledgeScope(context)

  const document = await getKnowledgeDocumentById(documentId)

  // Anti-oracle: inexistente / no agénticamente visible (draft, deprecated, agent_excluded,
  // restricted, quarantined, audience no-interna) => 404. NUNCA 403 (no filtra existencia).
  if (!document || !isDocumentAgenticallyVisible(document)) {
    throw new ApiPlatformError('Knowledge document not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const sections: EcosystemKnowledgeDocumentSection[] = []

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

  return { data: { document: toEcosystemDocumentSummary(document), sections } }
}
