/**
 * TASK-771 Slice 4 — tests for the provider_bq_sync dead-letter reliability
 * signal reader.
 *
 * 4 paths covered:
 *   1. count = 0 → severity 'ok'
 *   2. count > 0 → severity 'error'
 *   3. query throws → severity 'unknown' (degraded honestly, never propagates)
 *   4. handler param canónico se pasa correctamente al SQL
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
  getProviderBqSyncDeadLetterSignal,
  PROVIDER_BQ_SYNC_DEAD_LETTER_SIGNAL_ID
} from './provider-bq-sync-dead-letter'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getProviderBqSyncDeadLetterSignal', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getProviderBqSyncDeadLetterSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('dead_letter')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe(PROVIDER_BQ_SYNC_DEAD_LETTER_SIGNAL_ID)
    expect(signal.summary).toContain('Sin dead-letters')
  })

  it('returns error severity when count > 0 (drift PG↔BQ activo)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getProviderBqSyncDeadLetterSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('3 entries')
    expect(signal.summary).toContain('Drift PG↔BQ activo')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('3')
  })

  it('passes the canonical handler key as parameter', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getProviderBqSyncDeadLetterSignal()

    expect(queryMock).toHaveBeenCalledTimes(1)
    const handler = queryMock.mock.calls[0]?.[1]?.[0]

    expect(handler).toBe('provider_bq_sync:provider.upserted')
  })

  it('returns unknown when the query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getProviderBqSyncDeadLetterSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })
})
