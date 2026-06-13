import type { KnowledgeRetrievalChunk, KnowledgeRetrievalPacket } from '@/lib/knowledge/search'

import type { NexaToolResult } from './nexa-contract'

export type ConversationalEvidenceContractVersion = 'nexa-evidence.v1'
export type ConversationalEvidenceKind = 'knowledge'
export type ConversationalEvidenceConfidence = KnowledgeRetrievalPacket['confidence']
export type ConversationalEvidenceFreshness = KnowledgeRetrievalPacket['freshness']
export type ConversationalEvidenceStepState = 'complete' | 'active' | 'pending'

export interface ConversationalEvidenceTraceStep {
  id: string
  label: string
  description: string
  metadata: string
  state: ConversationalEvidenceStepState
}

export interface ConversationalEvidenceSource {
  id: string
  documentId: string
  documentVersionId?: string
  title: string
  citationLabel: string
  headingPath: string[]
  excerpt: string
  humanUrl?: string
  sourceUrl?: string | null
  score?: number
  freshness: ConversationalEvidenceFreshness
  updatedAt?: string | null
  sensitivity?: string
}

export interface ConversationalEvidenceFeedbackTarget {
  documentId: string
  chunkId: string
}

export interface ConversationalEvidencePacket {
  contractVersion: ConversationalEvidenceContractVersion
  kind: ConversationalEvidenceKind
  sourceContractVersion: string
  query: string
  generatedAt?: string
  confidence: ConversationalEvidenceConfidence
  freshness: ConversationalEvidenceFreshness
  deniedOrFilteredCount: number
  maxScore: number | null
  citedDocumentCount: number
  sources: ConversationalEvidenceSource[]
  traceSteps: ConversationalEvidenceTraceStep[]
  primaryFeedbackTarget: ConversationalEvidenceFeedbackTarget | null
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export const extractKnowledgePacketFromToolResult = (result: NexaToolResult): KnowledgeRetrievalPacket | null => {
  const raw = asRecord(result.raw)
  const packet = asRecord(raw?.packet)

  if (!packet || packet.contractVersion !== 'knowledge-search.v1' || !Array.isArray(packet.chunks)) {
    return null
  }

  return packet as unknown as KnowledgeRetrievalPacket
}

export const evidenceFreshnessLabel = (freshness: ConversationalEvidenceFreshness) => {
  switch (freshness) {
    case 'current':
      return 'Actual'
    case 'stale':
      return 'Revisión pendiente'
    case 'deprecated':
      return 'Deprecada'
    default:
      return 'Sin vigencia'
  }
}

export const evidenceConfidenceLabel = (confidence: ConversationalEvidenceConfidence) => {
  switch (confidence) {
    case 'high':
      return 'Alta'
    case 'medium':
      return 'Media'
    case 'low':
      return 'Baja'
    default:
      return 'Sin fuente'
  }
}

const deriveMaxScore = (chunks: readonly KnowledgeRetrievalChunk[]) => {
  const scores = chunks.map(chunk => chunk.score).filter(score => Number.isFinite(score))

  return scores.length > 0 ? Math.max(...scores) : null
}

export const knowledgePacketToConversationalEvidence = (
  packet: KnowledgeRetrievalPacket
): ConversationalEvidencePacket => {
  const maxScore = deriveMaxScore(packet.chunks)
  const citedDocumentCount = new Set(packet.chunks.map(chunk => chunk.documentId)).size
  const primary = packet.chunks[0]
  const maxScoreText = maxScore == null ? 'sin puntaje' : `puntaje máx. ${maxScore.toFixed(2)}`

  return {
    contractVersion: 'nexa-evidence.v1',
    kind: 'knowledge',
    sourceContractVersion: packet.contractVersion,
    query: packet.query,
    generatedAt: packet.generatedAt,
    confidence: packet.confidence,
    freshness: packet.freshness,
    deniedOrFilteredCount: packet.deniedOrFilteredCount,
    maxScore,
    citedDocumentCount,
    primaryFeedbackTarget: primary ? { chunkId: primary.chunkId, documentId: primary.documentId } : null,
    sources: packet.chunks.map(chunk => ({
      id: chunk.chunkId,
      documentId: chunk.documentId,
      documentVersionId: chunk.documentVersionId,
      title: chunk.title,
      citationLabel: chunk.citationLabel,
      headingPath: chunk.headingPath,
      excerpt: chunk.text,
      humanUrl: chunk.humanUrl,
      sourceUrl: chunk.sourceUrl,
      score: chunk.score,
      freshness: chunk.freshness,
      updatedAt: chunk.updatedAt,
      sensitivity: chunk.sensitivity
    })),
    traceSteps: [
      {
        id: 'intent',
        label: 'Nexa entendió la intención',
        description: 'Consulta de conocimiento',
        metadata: `Pregunta: ${packet.query}`,
        state: 'complete'
      },
      {
        id: 'retrieval',
        label: `Buscó ${packet.chunks.length} fragmento${packet.chunks.length === 1 ? '' : 's'} útil${packet.chunks.length === 1 ? '' : 'es'}`,
        description: `Confianza de búsqueda: ${evidenceConfidenceLabel(packet.confidence)}`,
        metadata: `${maxScoreText} · filtrados por política: ${packet.deniedOrFilteredCount}`,
        state: packet.chunks.length > 0 ? 'complete' : 'active'
      },
      {
        id: 'answer',
        label: 'Preparó respuesta con citas',
        description: `${citedDocumentCount} fuente${citedDocumentCount === 1 ? '' : 's'} citada${citedDocumentCount === 1 ? '' : 's'}`,
        metadata: `Vigencia: ${evidenceFreshnessLabel(packet.freshness)}`,
        state: packet.chunks.length > 0 ? 'active' : 'pending'
      },
      {
        id: 'feedback',
        label: 'Lista para mejorar la memoria',
        description: 'Tu señal mejora Knowledge',
        metadata: primary ? 'Feedback disponible para esta respuesta' : 'Sin fuente objetivo',
        state: 'pending'
      }
    ]
  }
}

export const nexaToolResultToConversationalEvidence = (
  result: NexaToolResult
): ConversationalEvidencePacket | null => {
  const packet = extractKnowledgePacketFromToolResult(result)

  return packet ? knowledgePacketToConversationalEvidence(packet) : null
}
