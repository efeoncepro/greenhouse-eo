import { describe, expect, it } from 'vitest'

import { rerankKnowledgeChunks } from './rerank-knowledge-chunks'
import type { KnowledgeRetrievalChunk } from './types'

const chunk = (overrides: Partial<KnowledgeRetrievalChunk>): KnowledgeRetrievalChunk =>
  ({
    chunkId: overrides.chunkId ?? 'c',
    documentId: overrides.documentId ?? 'doc',
    documentVersionId: 'v1',
    title: overrides.title ?? 'Documento',
    headingPath: overrides.headingPath ?? [],
    text: overrides.text ?? 'cuerpo',
    sourceUrl: null,
    humanUrl: '/knowledge/doc#a',
    citationLabel: overrides.citationLabel ?? 'Documento',
    score: overrides.score ?? 0.3,
    updatedAt: null,
    freshness: overrides.freshness ?? 'current',
    sensitivity: 'internal'
  }) as KnowledgeRetrievalChunk

describe('rerankKnowledgeChunks (TASK-1124)', () => {
  it('no toca un set de 0/1 chunk', () => {
    expect(rerankKnowledgeChunks([], 'OTD')).toEqual([])
    const single = [chunk({ chunkId: 'solo' })]

    expect(rerankKnowledgeChunks(single, 'OTD')).toBe(single)
  })

  it('anti wrong-source: con igual rank FTS, el heading que matchea la pregunta gana', () => {
    const generic = chunk({ chunkId: 'generic', headingPath: ['Introducción'], score: 0.3 })
    const onTopic = chunk({ chunkId: 'on-topic', headingPath: ['Métricas', 'Cumplimiento de fechas OTD'], score: 0.3 })

    const result = rerankKnowledgeChunks([generic, onTopic], 'qué es el OTD cumplimiento')

    expect(result[0]?.chunkId).toBe('on-topic')
    expect(result[1]?.chunkId).toBe('generic')
  })

  it('NO sobrepasa un rank FTS muy superior por un match de heading marginal', () => {
    const strongFts = chunk({ chunkId: 'strong', headingPath: ['Resumen'], score: 0.9 })
    const headingMatch = chunk({ chunkId: 'heading', headingPath: ['OTD'], score: 0.2 })

    const result = rerankKnowledgeChunks([strongFts, headingMatch], 'OTD')

    // FTS sigue siendo la señal dominante (0.9 vs 0.2*1.5=0.3).
    expect(result[0]?.chunkId).toBe('strong')
  })

  it('diversidad: el chunk de otro documento sube sobre el 3er chunk del documento dominante', () => {
    const a1 = chunk({ chunkId: 'a1', documentId: 'A', score: 0.5 })
    const a2 = chunk({ chunkId: 'a2', documentId: 'A', score: 0.45 })
    const a3 = chunk({ chunkId: 'a3', documentId: 'A', score: 0.4 })
    const b1 = chunk({ chunkId: 'b1', documentId: 'B', score: 0.38 })

    const result = rerankKnowledgeChunks([a1, a2, a3, b1], 'consulta sin heading match')
    const order = result.map(entry => entry.chunkId)

    // b1 (0.38) supera a a3 (0.4 * 0.85^2 ≈ 0.289) por el decay de diversidad.
    expect(order.indexOf('b1')).toBeLessThan(order.indexOf('a3'))
    // a1 (sin decay) sigue primero.
    expect(order[0]).toBe('a1')
  })

  it('penaliza freshness deprecated frente a current con igual rank y sin heading match', () => {
    const fresh = chunk({ chunkId: 'fresh', score: 0.3, freshness: 'current' })
    const old = chunk({ chunkId: 'old', score: 0.3, freshness: 'deprecated' })

    const result = rerankKnowledgeChunks([old, fresh], 'consulta neutra')

    expect(result[0]?.chunkId).toBe('fresh')
  })

  it('es determinista (input fijo → output fijo) y preserva el set completo', () => {
    const input = [
      chunk({ chunkId: 'x', documentId: 'A', score: 0.4, headingPath: ['OTD'] }),
      chunk({ chunkId: 'y', documentId: 'B', score: 0.42 }),
      chunk({ chunkId: 'z', documentId: 'A', score: 0.41 })
    ]

    const first = rerankKnowledgeChunks(input, 'OTD').map(c => c.chunkId)
    const second = rerankKnowledgeChunks(input, 'OTD').map(c => c.chunkId)

    expect(first).toEqual(second)
    expect([...first].sort()).toEqual(['x', 'y', 'z'])
  })

  it('no muta el score (sigue siendo el ts_rank que la UI muestra)', () => {
    const input = [chunk({ chunkId: 'a', score: 0.7, headingPath: ['OTD'] }), chunk({ chunkId: 'b', score: 0.2 })]
    const result = rerankKnowledgeChunks(input, 'OTD')

    expect(result.find(c => c.chunkId === 'a')?.score).toBe(0.7)
    expect(result.find(c => c.chunkId === 'b')?.score).toBe(0.2)
  })
})
