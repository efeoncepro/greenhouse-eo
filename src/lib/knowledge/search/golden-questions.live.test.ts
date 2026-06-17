import { describe, expect, it } from 'vitest'

import { searchKnowledge } from './search-knowledge'
import { KNOWLEDGE_CONFIDENCE_RANK, KNOWLEDGE_GOLDEN_QUESTIONS } from './golden-questions'
import type { KnowledgeSearchSubject } from './types'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Eval harness — corre cada golden question contra el corpus piloto real (TASK-1082).
// Es la quality gate de retrieval de esta task (Delta D: el gate es offline, no un
// runtime signal). Skipped en CI (no PG) — local-only.
const subject: KnowledgeSearchSubject = {
  userId: 'user-agent-e2e-001',
  tenantType: 'efeonce_internal',
  tenantId: null,
  roleCodes: ['efeonce_admin', 'collaborator'],
  routeGroups: ['internal'],
  capabilities: ['knowledge.document.read', 'knowledge.agentic.retrieve']
}

const titleIncludes = (titles: string[], needle: string) =>
  titles.some(title => title.toLowerCase().includes(needle.toLowerCase()))

describe.skipIf(!hasPgConfig)('knowledge golden questions — eval harness (TASK-1083)', () => {
  for (const question of KNOWLEDGE_GOLDEN_QUESTIONS) {
    it(`${question.id} — ${question.description}`, async () => {
      const packet = await searchKnowledge({
        query: question.query,
        subject,
        mode: question.mode
      })

      const titles = packet.chunks.map(chunk => chunk.title)

      if (question.expectFirstTitleIncludes) {
        const firstTitle = titles[0] ?? ''

        expect(
          firstTitle.toLowerCase().includes(question.expectFirstTitleIncludes.toLowerCase()),
          `${question.id}: el PRIMER chunk debía contener ~"${question.expectFirstTitleIncludes}", got "${firstTitle}" (orden: [${titles.join(' | ')}])`
        ).toBe(true)
      }

      if (typeof question.expectDistinctDocumentsAtLeast === 'number') {
        const distinctDocs = new Set(packet.chunks.map(chunk => chunk.documentId)).size

        expect(
          distinctDocs,
          `${question.id}: esperaba >= ${question.expectDistinctDocumentsAtLeast} documentos distintos, got ${distinctDocs} (titulos: [${titles.join(' | ')}])`
        ).toBeGreaterThanOrEqual(question.expectDistinctDocumentsAtLeast)
      }

      if (question.expectNoAnswer) {
        expect(packet.confidence, `${question.id}: expected no-answer`).toBe('none')
        expect(packet.chunks).toHaveLength(0)
      }

      if (question.expectAnyTitleIncludes) {
        expect(
          titleIncludes(titles, question.expectAnyTitleIncludes),
          `${question.id}: expected a source titled ~"${question.expectAnyTitleIncludes}", got [${titles.join(' | ')}]`
        ).toBe(true)
      }

      if (question.mustNotReturnTitleIncludes) {
        expect(
          titleIncludes(titles, question.mustNotReturnTitleIncludes),
          `${question.id}: must NOT return "${question.mustNotReturnTitleIncludes}", got [${titles.join(' | ')}]`
        ).toBe(false)
      }

      if (question.expectMinConfidence) {
        expect(
          KNOWLEDGE_CONFIDENCE_RANK[packet.confidence],
          `${question.id}: confidence ${packet.confidence} < ${question.expectMinConfidence}`
        ).toBeGreaterThanOrEqual(KNOWLEDGE_CONFIDENCE_RANK[question.expectMinConfidence])
      }

      if (typeof question.expectDeniedAtLeast === 'number') {
        expect(
          packet.deniedOrFilteredCount,
          `${question.id}: expected >= ${question.expectDeniedAtLeast} denied`
        ).toBeGreaterThanOrEqual(question.expectDeniedAtLeast)
      }

      // Stale-honesty cross-check: si alguna fuente está stale, el packet lo declara.
      if (packet.freshness === 'stale') {
        expect(packet.notes.join(' ')).toMatch(/desactualizad/i)
      }
    })
  }
})
