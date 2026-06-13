/**
 * Mapper `knowledge-search.v1` → cita inline (TASK-1101 Slice 1).
 * Lockea la traducción chunk → NexaCitationSource: label normalizado, freshness 1:1, score verbatim,
 * href = humanUrl canónica, excerpt recortado en frontera de palabra. Pura, sin IO.
 */
import { describe, expect, it } from 'vitest'

import type { KnowledgeRetrievalChunk, KnowledgeRetrievalPacket } from '@/lib/knowledge/search/types'

import {
  mapKnowledgeChunkToCitationSource,
  mapKnowledgePacketToCitationSources,
  normalizeCitationLabel,
  truncateCitationExcerpt
} from './nexa-answers-citation-mapper'

const chunk = (overrides: Partial<KnowledgeRetrievalChunk> = {}): KnowledgeRetrievalChunk => ({
  chunkId: 'chunk-impacto-01',
  documentId: 'knowledge-doc-ico-metrics',
  documentVersionId: 'v4',
  title: 'Manual: Métricas ICO',
  headingPath: ['Métricas ICO', 'Impacto'],
  text: 'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo.',
  sourceUrl: 'https://notion.so/abc',
  humanUrl: '/knowledge/documents/knowledge-doc-ico-metrics',
  citationLabel: '[1]',
  score: 0.92,
  updatedAt: '2026-06-10T14:30:00.000Z',
  freshness: 'current',
  sensitivity: 'internal',
  ...overrides
})

describe('normalizeCitationLabel', () => {
  it('despoja corchetes y espacios del label del packet', () => {
    expect(normalizeCitationLabel('[1]')).toBe('1')
    expect(normalizeCitationLabel(' [12] ')).toBe('12')
    expect(normalizeCitationLabel('3')).toBe('3')
  })

  it('cae al label original si tras despojar queda vacío (no inventa)', () => {
    expect(normalizeCitationLabel('A')).toBe('A')
    expect(normalizeCitationLabel('[ ]')).toBe('[ ]')
  })
})

describe('truncateCitationExcerpt', () => {
  it('deja intacto un texto corto (colapsa whitespace)', () => {
    expect(truncateCitationExcerpt('Hola   mundo\n  test')).toBe('Hola mundo test')
  })

  it('recorta en frontera de palabra con elipsis cuando excede el máximo', () => {
    const long = 'palabra '.repeat(60).trim() // ~480 chars
    const out = truncateCitationExcerpt(long, 80)

    expect(out.length).toBeLessThanOrEqual(81)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/) // sin espacio antes de la elipsis
  })
})

describe('mapKnowledgeChunkToCitationSource', () => {
  it('mapea todos los campos del contrato (label, title, headingPath, excerpt, score, freshness, href)', () => {
    expect(mapKnowledgeChunkToCitationSource(chunk())).toEqual({
      id: 'chunk-impacto-01',
      label: '1',
      title: 'Manual: Métricas ICO',
      headingPath: ['Métricas ICO', 'Impacto'],
      excerpt: 'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo.',
      score: 0.92,
      freshness: 'current',
      href: '/knowledge/documents/knowledge-doc-ico-metrics'
    })
  })

  it('score viene verbatim del chunk (SSOT del trace, no se recalcula)', () => {
    expect(mapKnowledgeChunkToCitationSource(chunk({ score: 0.8137 })).score).toBe(0.8137)
  })

  it('href usa humanUrl canónica, NO sourceUrl (Notion externo)', () => {
    const out = mapKnowledgeChunkToCitationSource(chunk({ humanUrl: '/knowledge/documents/x', sourceUrl: 'https://notion.so/y' }))

    expect(out.href).toBe('/knowledge/documents/x')
  })

  it('href undefined cuando humanUrl es vacía (degradación honesta)', () => {
    expect(mapKnowledgeChunkToCitationSource(chunk({ humanUrl: '' })).href).toBeUndefined()
  })

  it('headingPath undefined cuando viene vacío', () => {
    expect(mapKnowledgeChunkToCitationSource(chunk({ headingPath: [] })).headingPath).toBeUndefined()
  })

  it('mapea freshness 1:1 (current/stale), deprecated→stale, unknown→sin chip', () => {
    expect(mapKnowledgeChunkToCitationSource(chunk({ freshness: 'current' })).freshness).toBe('current')
    expect(mapKnowledgeChunkToCitationSource(chunk({ freshness: 'stale' })).freshness).toBe('stale')
    expect(mapKnowledgeChunkToCitationSource(chunk({ freshness: 'deprecated' })).freshness).toBe('stale')
    expect(mapKnowledgeChunkToCitationSource(chunk({ freshness: 'unknown' })).freshness).toBeUndefined()
  })
})

describe('mapKnowledgePacketToCitationSources', () => {
  it('mapea todos los chunks preservando el orden del retrieval', () => {
    const packet = {
      chunks: [chunk({ chunkId: 'a', citationLabel: '[1]' }), chunk({ chunkId: 'b', citationLabel: '[2]' })]
    } as KnowledgeRetrievalPacket

    const sources = mapKnowledgePacketToCitationSources(packet)

    expect(sources.map(s => s.id)).toEqual(['a', 'b'])
    expect(sources.map(s => s.label)).toEqual(['1', '2'])
  })

  it('packet sin chunks → arreglo vacío (no-answer honesto)', () => {
    expect(mapKnowledgePacketToCitationSources({ chunks: [] } as unknown as KnowledgeRetrievalPacket)).toEqual([])
  })
})
