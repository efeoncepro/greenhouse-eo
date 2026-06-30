import { beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-1201 — run-truth: 0 señales que enriquecer NO es un run `succeeded`.
// El worker corta como noop (run=null) sin tocar el LLM ni persistir un run.

const mockQuery = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockGenerate = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('./llm-provider', () => ({
  generateFinanceSignalEnrichment: (...args: unknown[]) => mockGenerate(...args)
}))

vi.mock('./resolve-finance-signal-context', () => ({
  resolveFinanceSignalContext: vi.fn().mockResolvedValue({})
}))

import { materializeFinanceAiLlmEnrichments } from './llm-enrichment-worker'

describe('materializeFinanceAiLlmEnrichments — run-truth (TASK-1201)', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockPublishOutboxEvent.mockReset()
    mockGenerate.mockReset()
  })

  it('0 señales → noop, run=null, sin LLM, sin persistir run engañoso', async () => {
    // loadSignals → []
    mockQuery.mockResolvedValueOnce([])

    const result = await materializeFinanceAiLlmEnrichments({
      periodYear: 2026,
      periodMonth: 6,
      triggerType: 'test'
    })

    expect(result.noop).toBe(true)
    expect(result.run).toBeNull()
    expect(result.recordsWritten).toBe(0)
    expect(result.succeeded).toBe(0)

    // NO llamó al LLM.
    expect(mockGenerate).not.toHaveBeenCalled()

    // Solo se ejecutó el SELECT de loadSignals; ningún INSERT de run engañoso.
    expect(mockQuery).toHaveBeenCalledTimes(1)

    // No publica el outbox event de enrichment (no hubo enrichment).
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })
})
