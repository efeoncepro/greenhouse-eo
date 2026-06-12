import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import {
  createKnowledgeDocument,
  getKnowledgeDocumentBySlug,
  getKnowledgeDocumentVersion,
  publishKnowledgeDocumentVersion,
  registerKnowledgeSource,
  transitionKnowledgeDocumentStatus
} from '../store'
import { sanitizeKnowledgeContent, type SanitizationFinding } from '../sanitization/detect'

import type {
  KnowledgeDocCandidate,
  KnowledgeSourceConnector,
  KnowledgeSourceDescriptor
} from './connector'
import { checksumMarkdown, chunkMarkdown } from './markdown'
import { beginKnowledgeRun, completeKnowledgeRun } from './run-tracking'

export type IngestionDocStatus =
  | 'published'
  | 'quarantined'
  | 'skipped_unchanged'
  | 'skipped_unavailable'
  | 'failed'

export interface IngestionDocReport {
  slug: string
  status: IngestionDocStatus
  versionNumber?: number
  chunkCount: number
  checksum?: string
  reason?: string
  findings?: SanitizationFinding[]
}

export interface IngestionRunCounts {
  candidates: number
  published: number
  quarantined: number
  skippedUnchanged: number
  skippedUnavailable: number
  failed: number
  chunks: number
}

export interface IngestionRunReport {
  mode: 'dry-run' | 'apply'
  sourceId: string | null
  documents: IngestionDocReport[]
  counts: IngestionRunCounts
}

const candidateToCreateInput = (candidate: KnowledgeDocCandidate, sourceId: string) => ({
  sourceId,
  slug: candidate.slug,
  title: candidate.title,
  documentType: candidate.documentType,
  ownerDomain: candidate.ownerDomain,
  approverRole: candidate.approverRole,
  audience: candidate.audience,
  sensitivity: candidate.sensitivity,
  agenticPolicy: candidate.agenticPolicy,
  humanUrl: candidate.humanUrl,
  docLayer: candidate.docLayer
})

const findSourceId = async (descriptor: KnowledgeSourceDescriptor): Promise<string | null> => {
  const rows = await query<{ source_id: string; [column: string]: unknown }>(
    `SELECT source_id FROM greenhouse_knowledge.knowledge_sources
     WHERE source_system = $2 AND name = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [descriptor.name, descriptor.sourceSystem]
  )

  return rows[0]?.source_id ?? null
}

const ingestOne = async (
  connector: KnowledgeSourceConnector,
  candidate: KnowledgeDocCandidate,
  sourceId: string | null,
  apply: boolean,
  actor: string
): Promise<IngestionDocReport> => {
  const loaded = await connector.load(candidate)
  const checksum = checksumMarkdown(loaded.rawMarkdown)
  const mdChunks = chunkMarkdown(loaded.rawMarkdown)
  const sanitization = sanitizeKnowledgeContent(loaded.rawMarkdown)

  const existing = await getKnowledgeDocumentBySlug(candidate.slug)

  // Sanitization gate: flagged docs are quarantined BEFORE chunking (never retrievable).
  if (sanitization.flagged) {
    if (apply && sourceId) {
      const doc =
        existing ?? (await createKnowledgeDocument({ ...candidateToCreateInput(candidate, sourceId), actorUserId: actor }))

      if (doc.publicationStatus !== 'quarantined') {
        await transitionKnowledgeDocumentStatus(doc.documentId, 'quarantined', {
          actor,
          reason: `sanitizer flagged: ${sanitization.findings.map(f => f.code).join(', ')}`
        })
      }
    }

    return {
      slug: candidate.slug,
      status: 'quarantined',
      chunkCount: 0,
      checksum,
      findings: sanitization.findings
    }
  }

  // Idempotency: a published version with the same checksum = no-op.
  if (existing?.currentVersionId && existing.publicationStatus === 'published') {
    const current = await getKnowledgeDocumentVersion(existing.currentVersionId)

    if (current?.checksum === checksum) {
      return {
        slug: candidate.slug,
        status: 'skipped_unchanged',
        versionNumber: current.versionNumber,
        chunkCount: 0,
        checksum
      }
    }
  }

  if (!apply || !sourceId) {
    // dry-run (or no source): report what WOULD be published.
    return { slug: candidate.slug, status: 'published', chunkCount: mdChunks.length, checksum }
  }

  const doc =
    existing ?? (await createKnowledgeDocument({ ...candidateToCreateInput(candidate, sourceId), actorUserId: actor }))

  const version = await publishKnowledgeDocumentVersion({
    documentId: doc.documentId,
    checksum,
    normalizedMarkdown: loaded.rawMarkdown,
    sourceUrl: loaded.provenance.sourceUrl,
    sourcePageId: loaded.provenance.sourcePageId,
    sourceCreatedAt: loaded.provenance.sourceCreatedAt,
    sourceEditedAt: loaded.provenance.sourceEditedAt,
    publishedByUserId: actor,
    chunks: mdChunks.map((chunk, index) => ({
      headingPath: chunk.headingPath,
      bodyText: chunk.bodyText,
      citationAnchor: chunk.citationAnchor,
      tokenEstimate: chunk.tokenEstimate,
      allowedScopes: [],
      sourcePosition: index
    })),
    actorUserId: actor
  })

  return {
    slug: candidate.slug,
    status: 'published',
    versionNumber: version.versionNumber,
    chunkCount: mdChunks.length,
    checksum
  }
}

const tally = (documents: IngestionDocReport[]): IngestionRunCounts => ({
  candidates: documents.length,
  published: documents.filter(d => d.status === 'published').length,
  quarantined: documents.filter(d => d.status === 'quarantined').length,
  skippedUnchanged: documents.filter(d => d.status === 'skipped_unchanged').length,
  skippedUnavailable: documents.filter(d => d.status === 'skipped_unavailable').length,
  failed: documents.filter(d => d.status === 'failed').length,
  chunks: documents.reduce((sum, d) => sum + d.chunkCount, 0)
})

/**
 * Orquesta la ingesta del corpus: list → load → normalize → sanitize →
 * (quarantine | publish + chunks). `apply=false` (dry-run) no escribe a DB pero
 * sí lee para reportar idempotencia honesta. `apply=true` registra/usa el source,
 * abre un sync run y publica versiones idempotentes por checksum.
 */
export const runKnowledgeIngestion = async (options: {
  connector: KnowledgeSourceConnector
  apply: boolean
  actor?: string | null
}): Promise<IngestionRunReport> => {
  const { connector, apply } = options
  const actor = options.actor ?? 'knowledge-ingest-cli'
  const descriptor = connector.sourceDescriptor

  let sourceId = await findSourceId(descriptor)

  if (apply && !sourceId) {
    const source = await registerKnowledgeSource({
      sourceSystem: descriptor.sourceSystem,
      sourceKind: descriptor.sourceKind,
      name: descriptor.name,
      ownerDomain: descriptor.ownerDomain,
      audience: descriptor.audience,
      publicationPolicy: 'manual_review',
      syncEnabled: true,
      actorUserId: actor
    })

    sourceId = source.sourceId
  }

  let runId: string | null = null

  if (apply && sourceId) {
    runId = await beginKnowledgeRun({ sourceId, runKind: 'sync', actor })
  }

  const documents: IngestionDocReport[] = []

  try {
    const items = await connector.list()

    for (const item of items) {
      if (item.kind === 'unavailable') {
        documents.push({
          slug: item.candidate.slug,
          status: 'skipped_unavailable',
          chunkCount: 0,
          reason: item.reason
        })
        continue
      }

      try {
        documents.push(await ingestOne(connector, item.candidate, sourceId, apply, actor))
      } catch (err) {
        captureWithDomain(err, 'knowledge', {
          tags: { source: 'ingestion_pipeline', stage: 'document' },
          extra: { slug: item.candidate.slug }
        })
        documents.push({
          slug: item.candidate.slug,
          status: 'failed',
          chunkCount: 0,
          reason: redactErrorForResponse(err)
        })
      }
    }
  } catch (err) {
    if (runId) {
      await completeKnowledgeRun({ runId, status: 'failed', errorSummary: redactErrorForResponse(err) })
    }

    captureWithDomain(err, 'knowledge', { tags: { source: 'ingestion_pipeline', stage: 'list' } })
    throw err
  }

  const counts = tally(documents)

  if (runId) {
    await completeKnowledgeRun({
      runId,
      status: counts.failed > 0 ? 'failed' : 'succeeded',
      details: { ...counts }
    })
  }

  return { mode: apply ? 'apply' : 'dry-run', sourceId, documents, counts }
}
