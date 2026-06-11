import { afterAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import {
  createKnowledgeDocument,
  getKnowledgeDocumentById,
  listKnowledgeChunksForVersion,
  publishKnowledgeDocumentVersion,
  recordKnowledgeFeedback,
  registerKnowledgeSource,
  transitionKnowledgeDocumentStatus
} from './store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Append-only/forensic design: publication_runs + feedback can't be deleted, and
// runs RESTRICT document deletion. Live data persists by design; we use a unique
// slug per run. This file is skipped in CI (no PG) — local-only smoke.
const SLUG = `knowledge-live-test-${Date.now()}`

describe.skipIf(!hasPgConfig)('knowledge store — live PG (TASK-1081)', () => {
  let documentId: string
  let versionId: string

  afterAll(async () => {
    // Best-effort: drop the chunks + version we can (feedback/run stay, by design).
    if (versionId) {
      await query(
        `DELETE FROM greenhouse_knowledge.knowledge_chunks WHERE document_version_id = $1`,
        [versionId]
      ).catch(() => undefined)
    }
  })

  it('full lifecycle: source -> document -> publish version + chunks', async () => {
    const source = await registerKnowledgeSource({
      sourceSystem: 'notion',
      sourceKind: 'notion_page_tree',
      name: 'Live test source',
      ownerDomain: 'platform',
      audience: 'internal'
    })

    expect(source.publicId).toMatch(/^EO-KSRC-/)
    expect(source.status).toBe('active')

    const document = await createKnowledgeDocument({
      sourceId: source.sourceId,
      slug: SLUG,
      title: 'Cómo preguntar a Nexa (live test)',
      documentType: 'how_to',
      ownerDomain: 'platform',
      audience: 'internal',
      sensitivity: 'internal',
      agenticPolicy: 'agent_allowed'
    })

    documentId = document.documentId
    expect(document.publicId).toMatch(/^EO-KDOC-/)
    expect(document.publicationStatus).toBe('draft')
    expect(document.currentVersionId).toBeNull()

    const version = await publishKnowledgeDocumentVersion({
      documentId: document.documentId,
      checksum: 'sha256:deadbeef',
      normalizedMarkdown: '# Cómo preguntar a Nexa\n\nEscribe tu pregunta en el chat.',
      chunks: [
        { headingPath: ['Cómo preguntar a Nexa'], bodyText: 'Escribe tu pregunta.', citationAnchor: 'como-preguntar' },
        { headingPath: ['Límites'], bodyText: 'Nexa cita sus fuentes.', citationAnchor: 'limites' }
      ]
    })

    versionId = version.versionId
    expect(version.versionNumber).toBe(1)
    expect(version.versionStatus).toBe('published')

    const reloaded = await getKnowledgeDocumentById(document.documentId)

    expect(reloaded?.publicationStatus).toBe('published')
    expect(reloaded?.currentVersionId).toBe(version.versionId)

    const chunks = await listKnowledgeChunksForVersion(version.versionId)

    expect(chunks).toHaveLength(2)
    expect(chunks[0].chunkIndex).toBe(0)
    // Denormalized from the document + derived freshness.
    expect(chunks[0].audience).toBe('internal')
    expect(chunks[0].agenticPolicy).toBe('agent_allowed')
    expect(chunks[0].freshness).toBe('current')
  })

  it('lifecycle transition published -> stale is allowed and audited', async () => {
    const updated = await transitionKnowledgeDocumentStatus(documentId, 'stale', {
      actor: 'live-test',
      reason: 'fuente Notion editada'
    })

    expect(updated.publicationStatus).toBe('stale')

    const runs = await query<{ run_kind: string; status: string }>(
      `SELECT run_kind, status FROM greenhouse_knowledge.knowledge_publication_runs
       WHERE document_id = $1 AND run_kind = 'stale_mark'`,
      [documentId]
    )

    expect(runs.length).toBeGreaterThanOrEqual(1)
  })

  it('illegal transition is rejected (stale -> draft)', async () => {
    await expect(transitionKnowledgeDocumentStatus(documentId, 'draft')).rejects.toThrow()
  })

  it('feedback is append-only (DELETE rejected by trigger)', async () => {
    const feedback = await recordKnowledgeFeedback({
      documentId,
      feedbackKind: 'useful',
      submittedByUserId: 'live-test',
      comment: 'clara'
    })

    expect(feedback.feedbackId).toMatch(/^kfb-/)

    await expect(
      query(`DELETE FROM greenhouse_knowledge.knowledge_feedback WHERE feedback_id = $1`, [
        feedback.feedbackId
      ])
    ).rejects.toThrow()
  })
})
