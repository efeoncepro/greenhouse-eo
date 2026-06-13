import { describe, expect, it } from 'vitest'

import type { KnowledgeRetrievalPacket } from '@/lib/knowledge/search'
import type { NexaToolResult } from '@/lib/nexa/nexa-contract'
import {
  extractKnowledgePacketFromToolResult,
  knowledgePacketToConversationalEvidence
} from '@/lib/nexa/conversational-evidence'

const packet: KnowledgeRetrievalPacket = {
  contractVersion: 'knowledge-search.v1',
  query: '¿Cómo reviso mis métricas ICO?',
  generatedAt: '2026-06-12T10:00:00.000Z',
  mode: 'agentic',
  accessScope: {
    tenantType: 'efeonce_internal',
    tenantId: null,
    userId: 'user-1',
    roleCodes: ['EFEONCE_ADMIN'],
    routeGroups: ['internal'],
    capabilities: ['knowledge.agentic.retrieve']
  },
  confidence: 'high',
  freshness: 'current',
  deniedOrFilteredCount: 1,
  notes: [],
  chunks: [
    {
      chunkId: 'kch-1',
      documentId: 'kdoc-1',
      documentVersionId: 'kdv-1',
      title: 'Manual: Cómo usar Mi Desempeño',
      headingPath: ['Mi Desempeño', 'Propósito'],
      text: 'Mi Desempeño permite revisar objetivos y métricas ICO.',
      sourceUrl: null,
      humanUrl: '/knowledge/documents/kdoc-1',
      citationLabel: 'Manual: Cómo usar Mi Desempeño',
      score: 0.93,
      updatedAt: '2026-05-07T00:00:00.000Z',
      freshness: 'current',
      sensitivity: 'internal'
    },
    {
      chunkId: 'kch-2',
      documentId: 'kdoc-2',
      documentVersionId: 'kdv-2',
      title: 'Glosario: Métricas ICO personales',
      headingPath: ['Impacto'],
      text: 'Impacto mide la contribución al logro de objetivos.',
      sourceUrl: null,
      humanUrl: '/knowledge/documents/kdoc-2',
      citationLabel: 'Glosario: Métricas ICO personales',
      score: 0.87,
      updatedAt: '2026-05-02T00:00:00.000Z',
      freshness: 'current',
      sensitivity: 'internal'
    }
  ]
}

describe('Nexa search_knowledge renderer helpers', () => {
  it('extracts the knowledge packet from the tool raw payload', () => {
    const result: NexaToolResult = {
      available: true,
      summary: 'grounding',
      source: 'postgres',
      scopeLabel: 'Base de conocimientos',
      generatedAt: packet.generatedAt,
      metrics: [],
      raw: { packet }
    }

    expect(extractKnowledgePacketFromToolResult(result)).toBe(packet)
  })

  it('derives evidence numbers only from the packet', () => {
    const evidence = knowledgePacketToConversationalEvidence(packet)

    expect(evidence.contractVersion).toBe('nexa-evidence.v1')
    expect(evidence.maxScore).toBe(0.93)
    expect(evidence.citedDocumentCount).toBe(2)
    expect(evidence.primaryFeedbackTarget).toEqual({ chunkId: 'kch-1', documentId: 'kdoc-1' })
    expect(evidence.traceSteps[1].label).toBe('Buscó 2 fragmentos útiles')
    expect(evidence.traceSteps[1].metadata).toContain('puntaje máx. 0.93')
    expect(evidence.traceSteps[1].metadata).toContain('filtrados por política: 1')
    expect(evidence.traceSteps[2].description).toBe('2 fuentes citadas')
  })
})
