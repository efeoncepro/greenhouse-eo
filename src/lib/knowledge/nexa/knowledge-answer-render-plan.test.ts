import { describe, expect, it } from 'vitest'

import { assertNexaAnswersRenderPlanAllowed } from '@/components/greenhouse/primitives'
import type { KnowledgeRetrievalChunk, KnowledgeRetrievalPacket } from '@/lib/knowledge/search/types'

import { buildKnowledgeAnswerRenderPlan, deriveKnowledgeTrustCue } from './knowledge-answer-render-plan'

const chunk = (overrides: Partial<KnowledgeRetrievalChunk> = {}): KnowledgeRetrievalChunk => ({
  chunkId: 'chunk-1',
  documentId: 'doc-1',
  documentVersionId: 'ver-1',
  title: 'Política de feriados',
  headingPath: ['HR', 'Feriado legal'],
  text: 'El feriado legal en Chile es de 15 días hábiles por año trabajado según el Código del Trabajo.',
  sourceUrl: null,
  humanUrl: '/knowledge/doc-1',
  citationLabel: '[1]',
  score: 0.92,
  updatedAt: '2026-06-01T00:00:00.000Z',
  freshness: 'current',
  sensitivity: 'internal',
  ...overrides
})

const packet = (overrides: Partial<KnowledgeRetrievalPacket> = {}): KnowledgeRetrievalPacket => ({
  contractVersion: 'knowledge-search.v1',
  query: '¿Cuántos días de feriado legal hay?',
  generatedAt: '2026-06-13T10:00:00.000Z',
  mode: 'human',
  accessScope: {
    tenantType: 'efeonce_internal',
    tenantId: null,
    userId: 'user-1',
    roleCodes: ['efeonce_admin'],
    routeGroups: ['internal'],
    capabilities: ['knowledge.document.read']
  },
  confidence: 'high',
  freshness: 'current',
  chunks: [chunk()],
  deniedOrFilteredCount: 0,
  notes: [],
  ...overrides
})

describe('buildKnowledgeAnswerRenderPlan — domain adapter packet → renderPlan neutral', () => {
  it('grounded packet → answerBubble con citas inline, trust success y proof con evidence', () => {
    const plan = buildKnowledgeAnswerRenderPlan(
      packet({
        chunks: [chunk(), chunk({ chunkId: 'chunk-2', documentId: 'doc-2', citationLabel: '[2]', score: 0.81, humanUrl: '/knowledge/doc-2' })]
      })
    )

    expect(plan.version).toBe('nexa-answer-render-plan.v1')
    expect(plan.intent).toBe('explain')
    expect(plan.autonomyTier).toBe('observeOnly')
    expect(plan.blocks).toHaveLength(1)

    const block = plan.blocks[0]

    expect(block.renderer).toBe('answerBubble')
    expect(block).toHaveProperty('points')

    if (block.renderer !== 'answerBubble') throw new Error('expected answerBubble')
    expect(block.points).toHaveLength(2)
    expect(block.trustCue?.tone).toBe('success')

    // Cada punto lleva su marcador de cita inline (evidence-peek), con score verbatim + label normalizado.
    const firstBody = block.points[0].body

    if (!Array.isArray(firstBody)) throw new Error('expected segmented body')
    const citation = firstBody.find(segment => segment.type === 'citation')

    expect(citation).toBeDefined()
    if (!citation || citation.type !== 'citation') throw new Error('expected citation segment')
    expect(citation.source.label).toBe('1') // normalizado desde "[1]"
    expect(citation.source.score).toBe(0.92) // verbatim del chunk
    expect(citation.source.href).toBe('/knowledge/doc-1') // humanUrl, no sourceUrl

    expect(plan.proof.evidence).toBeDefined()
    expect(plan.proof.unavailableReason).toBeUndefined()
  })

  it('confidence none / 0 chunks → gap honesto (sin respuesta inventada, sin evidence)', () => {
    const plan = buildKnowledgeAnswerRenderPlan(packet({ confidence: 'none', chunks: [], freshness: 'unknown' }))

    const block = plan.blocks[0]

    if (block.renderer !== 'answerBubble') throw new Error('expected answerBubble')
    expect(block.points).toHaveLength(0)
    expect(block.trustCue?.tone).toBe('warning')

    const title = block.title

    if (!Array.isArray(title)) throw new Error('expected segmented title')
    expect(title[0]).toMatchObject({ text: expect.stringContaining('No encontré') })

    expect(plan.proof.evidence).toBeUndefined()
    expect(plan.proof.unavailableReason).toBeTruthy()
  })

  it('freshness stale → trust warning (vigencia pendiente)', () => {
    const cue = deriveKnowledgeTrustCue(packet({ freshness: 'stale' }))

    expect(cue.tone).toBe('warning')
  })

  it('confidence low con chunks → trust info (respaldo parcial)', () => {
    const cue = deriveKnowledgeTrustCue(packet({ confidence: 'low' }))

    expect(cue.tone).toBe('info')
  })

  it('maxPoints recorta los puntos visibles; el resto vive en el proof', () => {
    const plan = buildKnowledgeAnswerRenderPlan(
      packet({
        chunks: [
          chunk({ chunkId: 'c1', documentId: 'd1' }),
          chunk({ chunkId: 'c2', documentId: 'd2' }),
          chunk({ chunkId: 'c3', documentId: 'd3' })
        ]
      }),
      { maxPoints: 1 }
    )

    const block = plan.blocks[0]

    if (block.renderer !== 'answerBubble') throw new Error('expected answerBubble')
    expect(block.points).toHaveLength(1)
    // El proof conserva las 3 fuentes (evidence completa).
    expect(plan.proof.evidence?.sources).toHaveLength(3)
  })

  it('el plan producido es montable en el canvas (allowlist answerBubble)', () => {
    const plan = buildKnowledgeAnswerRenderPlan(packet())

    expect(() => assertNexaAnswersRenderPlanAllowed({ renderPlan: plan, allowedRenderers: ['answerBubble'] })).not.toThrow()
  })
})
