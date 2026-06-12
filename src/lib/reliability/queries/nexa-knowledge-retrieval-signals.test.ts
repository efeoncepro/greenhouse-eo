/**
 * TASK-1085 — tests del reader de observabilidad del retrieval de Nexa.
 *
 * Un solo scan jsonb produce 3 señales. Casos cubiertos:
 *   1. total = 0 (flag OFF / sin uso) → todas 'ok' (steady)
 *   2. stale_source > 0 → la señal stale pasa a 'warning'
 *   3. no_source con volumen + tasa alta → la señal no-source pasa a 'warning'
 *   4. no_source alto pero volumen bajo → no-source sigue 'ok' (no ruido)
 *   5. low_citation con volumen + tasa alta → warning
 *   6. query throws → todas 'unknown' (degradación honesta, nunca propaga)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getNexaKnowledgeRetrievalSignals,
  NEXA_KNOWLEDGE_LOW_CITATION_RATE_SIGNAL_ID,
  NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID,
  NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID
} from './nexa-knowledge-retrieval-signals'

const findSignal = (signals: Awaited<ReturnType<typeof getNexaKnowledgeRetrievalSignals>>, id: string) => {
  const signal = signals.find(s => s.signalId === id)

  if (!signal) throw new Error(`signal ${id} not found`)

  return signal
}

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getNexaKnowledgeRetrievalSignals', () => {
  it('total = 0 → todas las señales quedan en ok (steady, flag OFF)', async () => {
    queryMock.mockResolvedValueOnce([{ total: 0, no_source: 0, stale_source: 0, citation_eligible: 0, low_citation: 0 }])

    const signals = await getNexaKnowledgeRetrievalSignals()

    expect(signals).toHaveLength(3)
    expect(findSignal(signals, NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID).severity).toBe('ok')
    expect(findSignal(signals, NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID).severity).toBe('ok')
    expect(findSignal(signals, NEXA_KNOWLEDGE_LOW_CITATION_RATE_SIGNAL_ID).severity).toBe('ok')
    expect(findSignal(signals, NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID).moduleKey).toBe('knowledge')
    expect(findSignal(signals, NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID).kind).toBe('drift')
  })

  it('stale_source > 0 → la señal stale pasa a warning', async () => {
    queryMock.mockResolvedValueOnce([{ total: 12, no_source: 0, stale_source: 2, citation_eligible: 12, low_citation: 0 }])

    const signals = await getNexaKnowledgeRetrievalSignals()

    expect(findSignal(signals, NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID).severity).toBe('warning')
  })

  it('no_source: tasa alta con volumen suficiente → warning', async () => {
    // 5/12 = 42% ≥ 30%, total ≥ 10 → warning
    queryMock.mockResolvedValueOnce([{ total: 12, no_source: 5, stale_source: 0, citation_eligible: 7, low_citation: 5 }])

    const signals = await getNexaKnowledgeRetrievalSignals()

    expect(findSignal(signals, NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID).severity).toBe('warning')
  })

  it('no_source: tasa alta pero volumen bajo → ok (no ruido)', async () => {
    // 3/4 = 75% pero total < 10 → ok (muestra insuficiente)
    queryMock.mockResolvedValueOnce([{ total: 4, no_source: 3, stale_source: 0, citation_eligible: 1, low_citation: 3 }])

    const signals = await getNexaKnowledgeRetrievalSignals()

    expect(findSignal(signals, NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID).severity).toBe('ok')
  })

  it('low_citation: tasa alta con volumen suficiente → warning', async () => {
    // 3/12 = 25% ≥ 20%, total ≥ 10 → warning
    queryMock.mockResolvedValueOnce([{ total: 12, no_source: 0, stale_source: 0, citation_eligible: 9, low_citation: 3 }])

    const signals = await getNexaKnowledgeRetrievalSignals()

    expect(findSignal(signals, NEXA_KNOWLEDGE_LOW_CITATION_RATE_SIGNAL_ID).severity).toBe('warning')
    expect(findSignal(signals, NEXA_KNOWLEDGE_LOW_CITATION_RATE_SIGNAL_ID).evidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'low_citation', value: '3' })])
    )
  })

  it('query falla → todas las señales unknown (degradación honesta)', async () => {
    queryMock.mockRejectedValueOnce(new Error('pg down'))

    const signals = await getNexaKnowledgeRetrievalSignals()

    expect(signals).toHaveLength(3)
    expect(findSignal(signals, NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID).severity).toBe('unknown')
    expect(findSignal(signals, NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID).severity).toBe('unknown')
    expect(findSignal(signals, NEXA_KNOWLEDGE_LOW_CITATION_RATE_SIGNAL_ID).severity).toBe('unknown')
  })
})
