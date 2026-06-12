import 'server-only'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'

import { KnowledgeNotFoundError } from './errors'
import {
  assertValidKnowledgePublicationTransition,
  deriveKnowledgeChunkFreshness
} from './state-machine'
import {
  assertKnowledgeFeedbackTarget,
  assertKnowledgeSlug,
  assertNonEmptyKnowledgeText
} from './validators'
import type {
  CreateKnowledgeDocumentInput,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  KnowledgeFeedback,
  KnowledgePublicationStatus,
  KnowledgeRunKind,
  KnowledgeSource,
  ListKnowledgeDocumentsFilter,
  PublishKnowledgeDocumentVersionInput,
  RecordKnowledgeFeedbackInput,
  RegisterKnowledgeSourceInput
} from './types'

// ---------------------------------------------------------------------------
// Row shapes + mappers (snake_case DB -> camelCase domain)
// ---------------------------------------------------------------------------

const toIso = (value: Date | string | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : value

interface KnowledgeSourceRow {
  [column: string]: unknown
  source_id: string
  public_id: string
  source_system: string
  source_kind: string
  name: string
  tenant_scope_type: string
  tenant_scope_id: string | null
  audience: string
  owner_domain: string
  secret_ref: string | null
  sync_enabled: boolean
  publication_policy: string
  last_synced_at: Date | string | null
  status: string
  created_by_user_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

const mapSource = (row: KnowledgeSourceRow): KnowledgeSource => ({
  sourceId: row.source_id,
  publicId: row.public_id,
  sourceSystem: row.source_system as KnowledgeSource['sourceSystem'],
  sourceKind: row.source_kind as KnowledgeSource['sourceKind'],
  name: row.name,
  tenantScopeType: row.tenant_scope_type as KnowledgeSource['tenantScopeType'],
  tenantScopeId: row.tenant_scope_id,
  audience: row.audience as KnowledgeSource['audience'],
  ownerDomain: row.owner_domain,
  secretRef: row.secret_ref,
  syncEnabled: row.sync_enabled,
  publicationPolicy: row.publication_policy as KnowledgeSource['publicationPolicy'],
  lastSyncedAt: toIso(row.last_synced_at),
  status: row.status as KnowledgeSource['status'],
  createdByUserId: row.created_by_user_id,
  createdAt: toIso(row.created_at) as string,
  updatedAt: toIso(row.updated_at) as string
})

interface KnowledgeDocumentRow {
  [column: string]: unknown
  document_id: string
  public_id: string
  source_id: string
  slug: string
  title: string
  document_type: string
  owner_domain: string
  approver_role: string | null
  audience: string
  sensitivity: string
  publication_status: string
  agentic_policy: string
  current_version_id: string | null
  human_url: string | null
  review_cadence_days: number | null
  last_reviewed_at: Date | string | null
  doc_layer: string | null
  created_by_user_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

const mapDocument = (row: KnowledgeDocumentRow): KnowledgeDocument => ({
  documentId: row.document_id,
  publicId: row.public_id,
  sourceId: row.source_id,
  slug: row.slug,
  title: row.title,
  documentType: row.document_type as KnowledgeDocument['documentType'],
  ownerDomain: row.owner_domain,
  approverRole: row.approver_role,
  audience: row.audience as KnowledgeDocument['audience'],
  sensitivity: row.sensitivity as KnowledgeDocument['sensitivity'],
  publicationStatus: row.publication_status as KnowledgePublicationStatus,
  agenticPolicy: row.agentic_policy as KnowledgeDocument['agenticPolicy'],
  currentVersionId: row.current_version_id,
  humanUrl: row.human_url,
  reviewCadenceDays: row.review_cadence_days,
  lastReviewedAt: toIso(row.last_reviewed_at),
  docLayer: (row.doc_layer as KnowledgeDocument['docLayer']) ?? null,
  createdByUserId: row.created_by_user_id,
  createdAt: toIso(row.created_at) as string,
  updatedAt: toIso(row.updated_at) as string
})

interface KnowledgeVersionRow {
  [column: string]: unknown
  version_id: string
  document_id: string
  version_number: number
  source_url: string | null
  source_page_id: string | null
  checksum: string
  normalized_markdown: string
  sensitivity: string
  version_status: string
  published_by_user_id: string | null
  published_at: Date | string | null
  source_created_at: Date | string | null
  source_edited_at: Date | string | null
  created_at: Date | string
}

const mapVersion = (row: KnowledgeVersionRow): KnowledgeDocumentVersion => ({
  versionId: row.version_id,
  documentId: row.document_id,
  versionNumber: row.version_number,
  sourceUrl: row.source_url,
  sourcePageId: row.source_page_id,
  checksum: row.checksum,
  normalizedMarkdown: row.normalized_markdown,
  sensitivity: row.sensitivity as KnowledgeDocumentVersion['sensitivity'],
  versionStatus: row.version_status as KnowledgeDocumentVersion['versionStatus'],
  publishedByUserId: row.published_by_user_id,
  publishedAt: toIso(row.published_at),
  sourceCreatedAt: toIso(row.source_created_at),
  sourceEditedAt: toIso(row.source_edited_at),
  createdAt: toIso(row.created_at) as string
})

interface KnowledgeChunkRow {
  [column: string]: unknown
  chunk_id: string
  document_version_id: string
  document_id: string
  chunk_index: number
  heading_path: string[]
  body_text: string
  citation_anchor: string
  token_estimate: number
  allowed_scopes: string[]
  audience: string
  sensitivity: string
  freshness: string
  agentic_policy: string
  source_position: number | null
  created_at: Date | string
}

const mapChunk = (row: KnowledgeChunkRow): KnowledgeChunk => ({
  chunkId: row.chunk_id,
  documentVersionId: row.document_version_id,
  documentId: row.document_id,
  chunkIndex: row.chunk_index,
  headingPath: row.heading_path ?? [],
  bodyText: row.body_text,
  citationAnchor: row.citation_anchor,
  tokenEstimate: row.token_estimate,
  allowedScopes: row.allowed_scopes ?? [],
  audience: row.audience as KnowledgeChunk['audience'],
  sensitivity: row.sensitivity as KnowledgeChunk['sensitivity'],
  freshness: row.freshness as KnowledgeChunk['freshness'],
  agenticPolicy: row.agentic_policy as KnowledgeChunk['agenticPolicy'],
  sourcePosition: row.source_position,
  createdAt: toIso(row.created_at) as string
})

interface KnowledgeFeedbackRow {
  [column: string]: unknown
  feedback_id: string
  document_id: string | null
  chunk_id: string | null
  feedback_kind: string
  submitted_by_user_id: string | null
  submitted_at: Date | string
  context_json: Record<string, unknown>
  comment: string | null
  created_at: Date | string
}

const mapFeedback = (row: KnowledgeFeedbackRow): KnowledgeFeedback => ({
  feedbackId: row.feedback_id,
  documentId: row.document_id,
  chunkId: row.chunk_id,
  feedbackKind: row.feedback_kind as KnowledgeFeedback['feedbackKind'],
  submittedByUserId: row.submitted_by_user_id,
  submittedAt: toIso(row.submitted_at) as string,
  contextJson: row.context_json ?? {},
  comment: row.comment,
  createdAt: toIso(row.created_at) as string
})

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

export const getKnowledgeSourceById = async (sourceId: string): Promise<KnowledgeSource | null> => {
  const rows = await query<KnowledgeSourceRow>(
    `SELECT * FROM greenhouse_knowledge.knowledge_sources WHERE source_id = $1`,
    [sourceId]
  )

  return rows[0] ? mapSource(rows[0]) : null
}

export const getKnowledgeDocumentById = async (
  documentId: string
): Promise<KnowledgeDocument | null> => {
  const rows = await query<KnowledgeDocumentRow>(
    `SELECT * FROM greenhouse_knowledge.knowledge_documents WHERE document_id = $1`,
    [documentId]
  )

  return rows[0] ? mapDocument(rows[0]) : null
}

export const getKnowledgeDocumentBySlug = async (
  slug: string
): Promise<KnowledgeDocument | null> => {
  const rows = await query<KnowledgeDocumentRow>(
    `SELECT * FROM greenhouse_knowledge.knowledge_documents WHERE slug = $1`,
    [slug]
  )

  return rows[0] ? mapDocument(rows[0]) : null
}

/**
 * TASK-1094 — Encuentra el documento cuya VERSIÓN VIGENTE proviene de una página
 * Notion (`source_page_id`). Lo usa el consumer de auto-ingest para deprecar el doc
 * cuando su página se borra en Notion. Null si ninguna versión vigente la referencia.
 */
export const getKnowledgeDocumentBySourcePageId = async (
  sourcePageId: string
): Promise<KnowledgeDocument | null> => {
  const rows = await query<KnowledgeDocumentRow>(
    `SELECT kd.*
     FROM greenhouse_knowledge.knowledge_documents kd
     JOIN greenhouse_knowledge.knowledge_document_versions kdv ON kdv.version_id = kd.current_version_id
     WHERE kdv.source_page_id = $1
     LIMIT 1`,
    [sourcePageId]
  )

  return rows[0] ? mapDocument(rows[0]) : null
}

export const getKnowledgeDocumentVersion = async (
  versionId: string
): Promise<KnowledgeDocumentVersion | null> => {
  const rows = await query<KnowledgeVersionRow>(
    `SELECT * FROM greenhouse_knowledge.knowledge_document_versions WHERE version_id = $1`,
    [versionId]
  )

  return rows[0] ? mapVersion(rows[0]) : null
}

export const listKnowledgeChunksForVersion = async (
  versionId: string
): Promise<KnowledgeChunk[]> => {
  const rows = await query<KnowledgeChunkRow>(
    `SELECT * FROM greenhouse_knowledge.knowledge_chunks
     WHERE document_version_id = $1
     ORDER BY chunk_index ASC`,
    [versionId]
  )

  return rows.map(mapChunk)
}

export const listKnowledgeDocumentsByMetadata = async (
  filter: ListKnowledgeDocumentsFilter = {}
): Promise<KnowledgeDocument[]> => {
  const clauses: string[] = []
  const params: unknown[] = []

  const push = (sql: string, value: unknown) => {
    params.push(value)
    clauses.push(`${sql} $${params.length}`)
  }

  if (filter.sourceId) push('source_id =', filter.sourceId)
  if (filter.documentType) push('document_type =', filter.documentType)
  if (filter.audience) push('audience =', filter.audience)
  if (filter.sensitivity) push('sensitivity =', filter.sensitivity)
  if (filter.publicationStatus) push('publication_status =', filter.publicationStatus)
  if (filter.agenticPolicy) push('agentic_policy =', filter.agenticPolicy)

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500)

  params.push(limit)

  const rows = await query<KnowledgeDocumentRow>(
    `SELECT * FROM greenhouse_knowledge.knowledge_documents
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  )

  return rows.map(mapDocument)
}

// ---------------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------------

const appendPublicationRun = async (
  client: PoolClient,
  input: {
    sourceId?: string | null
    documentId?: string | null
    runKind: KnowledgeRunKind
    status: 'succeeded' | 'failed' | 'skipped'
    actor?: string | null
    details?: Record<string, unknown>
    errorSummary?: string | null
  }
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_knowledge.knowledge_publication_runs
       (source_id, document_id, run_kind, status, actor, finished_at, details_json, error_summary)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6::jsonb, $7)`,
    [
      input.sourceId ?? null,
      input.documentId ?? null,
      input.runKind,
      input.status,
      input.actor ?? null,
      JSON.stringify(input.details ?? {}),
      input.errorSummary ?? null
    ]
  )
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export const registerKnowledgeSource = async (
  input: RegisterKnowledgeSourceInput
): Promise<KnowledgeSource> => {
  const name = assertNonEmptyKnowledgeText(input.name, 'name')
  const ownerDomain = assertNonEmptyKnowledgeText(input.ownerDomain, 'ownerDomain')
  const tenantScopeType = input.tenantScopeType ?? 'global'

  return withGreenhousePostgresTransaction(async (client) => {
    const result = await client.query<KnowledgeSourceRow>(
      `INSERT INTO greenhouse_knowledge.knowledge_sources
         (source_system, source_kind, name, tenant_scope_type, tenant_scope_id, audience,
          owner_domain, secret_ref, sync_enabled, publication_policy, status, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
       RETURNING *`,
      [
        input.sourceSystem,
        input.sourceKind,
        name,
        tenantScopeType,
        tenantScopeType === 'tenant' ? (input.tenantScopeId ?? null) : null,
        input.audience ?? 'internal',
        ownerDomain,
        input.secretRef ?? null,
        input.syncEnabled ?? false,
        input.publicationPolicy ?? 'manual_review',
        input.actorUserId ?? null
      ]
    )

    return mapSource(result.rows[0])
  })
}

export const createKnowledgeDocument = async (
  input: CreateKnowledgeDocumentInput
): Promise<KnowledgeDocument> => {
  const slug = assertKnowledgeSlug(input.slug)
  const title = assertNonEmptyKnowledgeText(input.title, 'title')
  const ownerDomain = assertNonEmptyKnowledgeText(input.ownerDomain, 'ownerDomain')

  return withGreenhousePostgresTransaction(async (client) => {
    const source = await client.query<{ source_id: string; [column: string]: unknown }>(
      `SELECT source_id FROM greenhouse_knowledge.knowledge_sources WHERE source_id = $1`,
      [input.sourceId]
    )

    if (source.rows.length === 0) {
      throw new KnowledgeNotFoundError('knowledge_source', input.sourceId)
    }

    const result = await client.query<KnowledgeDocumentRow>(
      `INSERT INTO greenhouse_knowledge.knowledge_documents
         (source_id, slug, title, document_type, owner_domain, approver_role, audience,
          sensitivity, publication_status, agentic_policy, human_url, review_cadence_days,
          doc_layer, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.sourceId,
        slug,
        title,
        input.documentType,
        ownerDomain,
        input.approverRole ?? null,
        input.audience ?? 'internal',
        input.sensitivity ?? 'internal',
        input.agenticPolicy ?? 'agent_allowed',
        input.humanUrl ?? null,
        input.reviewCadenceDays ?? null,
        input.docLayer ?? null,
        input.actorUserId ?? null
      ]
    )

    return mapDocument(result.rows[0])
  })
}

export const publishKnowledgeDocumentVersion = async (
  input: PublishKnowledgeDocumentVersionInput
): Promise<KnowledgeDocumentVersion> => {
  const checksum = assertNonEmptyKnowledgeText(input.checksum, 'checksum')

  assertNonEmptyKnowledgeText(input.normalizedMarkdown, 'normalizedMarkdown')

  return withGreenhousePostgresTransaction(async (client) => {
    const docResult = await client.query<KnowledgeDocumentRow>(
      `SELECT * FROM greenhouse_knowledge.knowledge_documents
       WHERE document_id = $1
       FOR UPDATE`,
      [input.documentId]
    )

    if (docResult.rows.length === 0) {
      throw new KnowledgeNotFoundError('knowledge_document', input.documentId)
    }

    const document = mapDocument(docResult.rows[0])

    // Defense in depth: TS asserts the transition the DB trigger also enforces.
    assertValidKnowledgePublicationTransition(document.publicationStatus, 'published')

    const nextNumberRow = await client.query<{ next_number: number; [column: string]: unknown }>(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_number
       FROM greenhouse_knowledge.knowledge_document_versions
       WHERE document_id = $1`,
      [input.documentId]
    )

    const versionNumber = Number(nextNumberRow.rows[0].next_number)

    await client.query(
      `UPDATE greenhouse_knowledge.knowledge_document_versions
       SET version_status = 'superseded'
       WHERE document_id = $1 AND version_status = 'published'`,
      [input.documentId]
    )

    const versionResult = await client.query<KnowledgeVersionRow>(
      `INSERT INTO greenhouse_knowledge.knowledge_document_versions
         (document_id, version_number, source_url, source_page_id, checksum,
          normalized_markdown, sensitivity, version_status, published_by_user_id,
          published_at, source_created_at, source_edited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, NOW(), $9, $10)
       RETURNING *`,
      [
        input.documentId,
        versionNumber,
        input.sourceUrl ?? null,
        input.sourcePageId ?? null,
        checksum,
        input.normalizedMarkdown,
        document.sensitivity,
        input.publishedByUserId ?? null,
        input.sourceCreatedAt ?? null,
        input.sourceEditedAt ?? null
      ]
    )

    const version = mapVersion(versionResult.rows[0])

    const freshness = deriveKnowledgeChunkFreshness('published')
    const chunks = input.chunks ?? []

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]

      await client.query(
        `INSERT INTO greenhouse_knowledge.knowledge_chunks
           (document_version_id, document_id, chunk_index, heading_path, body_text,
            citation_anchor, token_estimate, allowed_scopes, audience, sensitivity,
            freshness, agentic_policy, source_position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          version.versionId,
          input.documentId,
          i,
          chunk.headingPath ?? [],
          assertNonEmptyKnowledgeText(chunk.bodyText, 'chunk.bodyText'),
          assertNonEmptyKnowledgeText(chunk.citationAnchor, 'chunk.citationAnchor'),
          chunk.tokenEstimate ?? 0,
          chunk.allowedScopes ?? [],
          document.audience,
          document.sensitivity,
          freshness,
          document.agenticPolicy,
          chunk.sourcePosition ?? null
        ]
      )
    }

    await client.query(
      `UPDATE greenhouse_knowledge.knowledge_documents
       SET current_version_id = $2,
           publication_status = 'published',
           last_reviewed_at = NOW()
       WHERE document_id = $1`,
      [input.documentId, version.versionId]
    )

    await appendPublicationRun(client, {
      sourceId: document.sourceId,
      documentId: input.documentId,
      runKind: 'publish',
      status: 'succeeded',
      actor: input.actorUserId ?? input.publishedByUserId ?? null,
      details: { versionId: version.versionId, versionNumber, chunkCount: chunks.length }
    })

    return version
  })
}

const RUN_KIND_BY_STATUS: Partial<Record<KnowledgePublicationStatus, KnowledgeRunKind>> = {
  quarantined: 'quarantine',
  stale: 'stale_mark',
  deprecated: 'deprecate'
}

/**
 * Transición canónica del lifecycle editorial (quarantine / stale / deprecate /
 * revival). Valida en TS (defense in depth con el trigger DB) y deja audit row.
 */
export const transitionKnowledgeDocumentStatus = async (
  documentId: string,
  toStatus: KnowledgePublicationStatus,
  options: { actor?: string | null; reason?: string | null } = {}
): Promise<KnowledgeDocument> => {
  return withGreenhousePostgresTransaction(async (client) => {
    const docResult = await client.query<KnowledgeDocumentRow>(
      `SELECT * FROM greenhouse_knowledge.knowledge_documents
       WHERE document_id = $1
       FOR UPDATE`,
      [documentId]
    )

    if (docResult.rows.length === 0) {
      throw new KnowledgeNotFoundError('knowledge_document', documentId)
    }

    const document = mapDocument(docResult.rows[0])

    assertValidKnowledgePublicationTransition(document.publicationStatus, toStatus)

    const updated = await client.query<KnowledgeDocumentRow>(
      `UPDATE greenhouse_knowledge.knowledge_documents
       SET publication_status = $2
       WHERE document_id = $1
       RETURNING *`,
      [documentId, toStatus]
    )

    await appendPublicationRun(client, {
      sourceId: document.sourceId,
      documentId,
      runKind: RUN_KIND_BY_STATUS[toStatus] ?? 'publish',
      status: 'succeeded',
      actor: options.actor ?? null,
      details: { from: document.publicationStatus, to: toStatus, reason: options.reason ?? null }
    })

    return mapDocument(updated.rows[0])
  })
}

export const recordKnowledgeFeedback = async (
  input: RecordKnowledgeFeedbackInput
): Promise<KnowledgeFeedback> => {
  assertKnowledgeFeedbackTarget(input.documentId, input.chunkId)

  return withGreenhousePostgresTransaction(async (client) => {
    const result = await client.query<KnowledgeFeedbackRow>(
      `INSERT INTO greenhouse_knowledge.knowledge_feedback
         (document_id, chunk_id, feedback_kind, submitted_by_user_id, context_json, comment)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING *`,
      [
        input.documentId ?? null,
        input.chunkId ?? null,
        input.feedbackKind,
        input.submittedByUserId ?? null,
        JSON.stringify(input.context ?? {}),
        input.comment ?? null
      ]
    )

    return mapFeedback(result.rows[0])
  })
}
