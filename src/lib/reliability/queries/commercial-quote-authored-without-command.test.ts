/**
 * TASK-1212 Slice 5 — signal commercial.quote.authored_without_command.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { getCommercialQuoteAuthoredWithoutCommandSignal } from './commercial-quote-authored-without-command'

afterEach(() => vi.clearAllMocks())

describe('getCommercialQuoteAuthoredWithoutCommandSignal', () => {
  it('severity ok cuando count=0 (steady state)', async () => {
    queryMock.mockResolvedValue([{ n: 0 }])

    const sig = await getCommercialQuoteAuthoredWithoutCommandSignal()

    expect(sig.signalId).toBe('commercial.quote.authored_without_command')
    expect(sig.moduleKey).toBe('commercial')
    expect(sig.kind).toBe('data_quality')
    expect(sig.severity).toBe('ok')
  })

  it('severity error cuando hay cotizaciones emitidas sin líneas', async () => {
    queryMock.mockResolvedValue([{ n: 3 }])

    const sig = await getCommercialQuoteAuthoredWithoutCommandSignal()

    expect(sig.severity).toBe('error')
    expect(sig.summary).toContain('3')
    expect(sig.evidence?.find(e => e.label === 'count')?.value).toBe('3')
  })

  it('scopea a source_system=manual (excluye imports nubox/hubspot)', async () => {
    queryMock.mockResolvedValue([{ n: 0 }])

    await getCommercialQuoteAuthoredWithoutCommandSignal()

    expect(queryMock.mock.calls[0][0]).toContain("source_system = 'manual'")
  })

  it('severity unknown si la query falla', async () => {
    queryMock.mockRejectedValue(new Error('db down'))

    const sig = await getCommercialQuoteAuthoredWithoutCommandSignal()

    expect(sig.severity).toBe('unknown')
  })
})
